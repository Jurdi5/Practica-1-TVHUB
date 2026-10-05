import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Session } from '../src/models/session.model.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('register creates a USER, stores a hash, and starts a session', async () => {
  const response = await request(app).post('/api/auth/register').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(201);
  expect(response.body.user).toEqual(expect.objectContaining({ email: 'student@example.com', role: 'USER' }));
  expect(response.headers['set-cookie']).toHaveLength(2);
  const user = await User.findOne({ email: 'student@example.com' }).lean();
  expect(user?.passwordHash).not.toBe('StrongPass123!');
  expect(await Session.countDocuments({ userId: user?._id })).toBe(1);
});

test('register rejects a duplicate email', async () => {
  await request(app).post('/api/auth/register').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(201);
  const response = await request(app).post('/api/auth/register').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(409);
  expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
});

test('login validates credentials and protected routes require the access token', async () => {
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'missing@example.com', password: 'StrongPass123!' })
    .expect(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });

  await request(app).get('/api/users/me').expect(401);

  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(201);
  await agent.post('/api/auth/login').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(200);
  const currentUser = await agent.get('/api/users/me').expect(200);
  expect(currentUser.body).toEqual(expect.objectContaining({ email: 'student@example.com', role: 'USER' }));
  await agent.get('/api/admin/demo').expect(403);

  await User.updateOne({ email: 'student@example.com' }, { role: 'ADMIN' });
  await agent.post('/api/auth/login').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(200);
  await agent.get('/api/admin/demo').expect(200, { message: 'Admin access granted' });
});

test('refresh rotates tokens and logout revokes the current session', async () => {
  const agent = request.agent(app);
  const registration = await agent
    .post('/api/auth/register')
    .send({ email: 'student@example.com', password: 'StrongPass123!' })
    .expect(201);
  const originalCookies = registration.headers['set-cookie'];

  const refreshed = await agent.post('/api/auth/refresh').expect(200);
  expect(refreshed.body).toEqual(expect.objectContaining({ user: expect.objectContaining({ email: 'student@example.com' }) }));
  await request(app).post('/api/auth/refresh').set('Cookie', originalCookies).expect(401);

  await agent.post('/api/auth/logout').expect(204);
  await agent.post('/api/auth/refresh').expect(401);
});

test('logout all revokes every active session', async () => {
  const firstAgent = request.agent(app);
  const secondAgent = request.agent(app);
  await firstAgent.post('/api/auth/register').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(201);
  await secondAgent.post('/api/auth/login').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(200);

  await firstAgent.post('/api/auth/logout-all').expect(204);
  await secondAgent.post('/api/auth/refresh').expect(401);
});

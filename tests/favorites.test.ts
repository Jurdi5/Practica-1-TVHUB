import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { Channel } from '../src/models/channel.model.js';
import { Favorite } from '../src/models/favorite.model.js';
import { Session } from '../src/models/session.model.js';
import { User } from '../src/models/user.model.js';

let mongo: MongoMemoryServer;
let channelId: string;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await Favorite.deleteMany({});
  await Session.deleteMany({});
  await User.deleteMany({});
  await Channel.deleteMany({});

  const channel = await Channel.create({
    name: 'Favorite Channel',
    logoUrl: 'https://example.com/logo.png',
    streamUrl: 'https://example.com/stream.m3u8',
    country: 'Mexico',
    categories: ['News'],
    isActive: true
  });
  channelId = channel.id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('favorites require authentication', async () => {
  await request(app).get('/api/favorites').expect(401);
  await request(app).post(`/api/favorites/${channelId}`).expect(401);
});

test('a user can add, list, and remove a favorite channel', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(201);

  await agent.post(`/api/favorites/${channelId}`).expect(201);

  const listed = await agent.get('/api/favorites').expect(200);
  expect(listed.body.favorites).toHaveLength(1);
  expect(listed.body.favorites[0].channelId).toEqual(expect.objectContaining({ _id: expect.any(String), name: 'Favorite Channel' }));

  await agent.delete(`/api/favorites/${channelId}`).expect(204);
  await agent.get('/api/favorites').expect(200, { favorites: [] });
});

test('a user cannot add the same channel to favorites twice', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ email: 'student@example.com', password: 'StrongPass123!' }).expect(201);
  await agent.post(`/api/favorites/${channelId}`).expect(201);
  await agent.post(`/api/favorites/${channelId}`).expect(409, {
    error: { code: 'FAVORITE_ALREADY_EXISTS', message: 'Channel is already in favorites' }
  });
});

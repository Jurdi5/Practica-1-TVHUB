import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { Channel } from '../src/models/channel.model.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await Channel.deleteMany({});
  await Channel.insertMany([
    { name: 'Noticias Aula', logoUrl: 'https://example.com/news.png', streamUrl: 'https://example.com/news.m3u8', country: 'Mexico', categories: ['News'], isActive: true },
    { name: 'Cine Aula', logoUrl: 'https://example.com/movies.png', streamUrl: 'https://example.com/movies.m3u8', country: 'Spain', categories: ['Movies'], isActive: true },
    { name: 'Hidden Channel', logoUrl: 'https://example.com/hidden.png', streamUrl: 'https://example.com/hidden.m3u8', country: 'Mexico', categories: ['News'], isActive: false }
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('GET /api/channels returns active channels', async () => {
  const response = await request(app).get('/api/channels').expect(200);

  expect(response.body.channels).toHaveLength(2);
  expect(response.body.channels[0]).toEqual(expect.objectContaining({ name: expect.any(String) }));
});

test('GET /api/channels searches by name', async () => {
  const response = await request(app).get('/api/channels?search=cine').expect(200);

  expect(response.body.channels).toHaveLength(1);
  expect(response.body.channels[0].name).toBe('Cine Aula');
});

test('GET /api/channels/:id returns one active channel', async () => {
  const channel = await Channel.findOne({ name: 'Noticias Aula' });
  const response = await request(app).get(`/api/channels/${channel?.id}`).expect(200);

  expect(response.body.channel).toEqual(expect.objectContaining({ name: 'Noticias Aula' }));
});

test('GET /api/channels/:id returns the existing error for an unavailable channel', async () => {
  await request(app)
    .get('/api/channels/507f1f77bcf86cd799439011')
    .expect(404, { error: { code: 'CHANNEL_NOT_FOUND', message: 'Channel was not found' } });
});

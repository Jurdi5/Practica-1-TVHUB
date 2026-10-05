import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('GET /health returns ok', async () => {
  await request(app).get('/health').expect(200, { status: 'ok' });
});

test('GET /ready returns connected while MongoDB is connected', async () => {
  await request(app).get('/ready').expect(200, { status: 'ready', database: 'connected' });
});

import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';

export const healthRouter = Router();

healthRouter.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

healthRouter.get('/ready', (_request, response) => {
  if (isDatabaseConnected()) {
    response.json({ status: 'ready', database: 'connected' });
    return;
  }
  response.status(503).json({ status: 'not_ready', database: 'disconnected' });
});

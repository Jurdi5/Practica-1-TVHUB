import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    response.status(409).json({ error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Email already exists' } });
    return;
  }

  console.error(error);
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};

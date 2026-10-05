import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate: RequestHandler = (request, response, next) => {
  const accessToken = request.cookies.accessToken;
  if (typeof accessToken !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  }

  try {
    const payload = verifyAccessToken(accessToken);
    request.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
  }
};

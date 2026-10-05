import type { RequestHandler } from 'express';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';

export const me: RequestHandler = async (request, response) => {
  const auth = request.auth;
  if (!auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');

  const user = await User.findById(auth.userId).select('email role');
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User no longer exists');

  response.json({ id: user.id, email: user.email, role: user.role });
};

export const adminDemo: RequestHandler = (_request, response) => {
  response.json({ message: 'Admin access granted' });
};

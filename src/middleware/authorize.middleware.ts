import type { RequestHandler } from 'express';
import type { Role } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';

export function authorize(...allowedRoles: Role[]): RequestHandler {
  return (request, response, next) => {
    const auth = request.auth;
    if (!auth || !allowedRoles.includes(auth.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource');
    }

    next();
  };
}

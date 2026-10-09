import type { RequestHandler } from 'express';
import type { Role } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { recordAuditLog } from '../audit/audit-log.js';

export function authorize(...allowedRoles: Role[]): RequestHandler {
  return async (request, response, next) => {
    const auth = request.auth;
    if (!auth || !allowedRoles.includes(auth.role)) {
      if (auth) {
        await recordAuditLog({
          category: 'SECURITY', action: 'AUTHORIZATION_DENIED', actorType: auth.role,
          actorId: auth.userId, resourceType: 'AUTH',
          metadata: { method: request.method, route: request.baseUrl + request.path, requiredRole: allowedRoles.join(','), actualRole: auth.role }
        });
      }
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource');
    }

    next();
  };
}

import { Router } from 'express';
import { listAuditLogs, listReportAuditLogs } from '../controllers/audit-log.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';

export const auditLogRouter = Router();

auditLogRouter.get('/logs', authenticate, authorize('ADMIN'), listAuditLogs);
auditLogRouter.get('/reports/:reportId/logs', authenticate, authorize('ADMIN'), listReportAuditLogs);

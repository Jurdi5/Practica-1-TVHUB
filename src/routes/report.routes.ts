import { Router } from 'express';
import { closeSupportReport, createReport, deleteReport, listReports, listSupportReports, supportReportMetrics, updateReport } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { upload } from '../middleware/upload.js';

export const reportRouter = Router();
export const supportReportRouter = Router();

reportRouter.get('/', authenticate, listReports);
reportRouter.post(
  '/',
  authenticate,
  upload.array('evidence', 5),
  createReport
);

reportRouter.patch('/:id', authenticate, updateReport);

reportRouter.delete('/:id', authenticate, deleteReport);

supportReportRouter.get('/metrics', authenticate, authorize('ADMIN'), supportReportMetrics);
supportReportRouter.get('/', authenticate, authorize('ADMIN'), listSupportReports);
supportReportRouter.patch('/:id/close', authenticate, authorize('ADMIN'), closeSupportReport);

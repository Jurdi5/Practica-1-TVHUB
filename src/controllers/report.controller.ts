import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from 'express';
import { isValidObjectId, Types } from 'mongoose';
import { Channel } from '../models/channel.model.js';
import { Report, reportReasons, reportStatuses } from '../models/report.model.js';
import { User } from '../models/user.model.js';
import { reportUploadsDirectory } from '../middleware/upload.js';
import { sendReportCreatedEmail, sendReportResolvedEmail } from '../notifications/report-email.js';
import { emitReportCreated, emitReportUpdated } from '../realtime/socket.js';
import { AppError } from '../utils/app-error.js';
import { recordAuditLog } from '../audit/audit-log.js';

function getUserId(request: Parameters<RequestHandler>[0]): string {
  if (!request.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  return request.auth.userId;
}

function readRequiredText(value: unknown, code: string, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, code, message);
  return value.trim();
}

async function removeUploadedEvidence(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(files.map((file) => unlink(file.path).catch(() => undefined)));
}

async function removeEvidenceUrls(evidenceUrls: string[]): Promise<void> {
  await Promise.all(evidenceUrls.map((evidenceUrl) => {
    const filePath = path.join(reportUploadsDirectory, path.basename(evidenceUrl));
    return unlink(filePath).catch(() => undefined);
  }));
}

function getReportId(value: unknown): string {
  if (typeof value !== 'string' || !isValidObjectId(value)) {
    throw new AppError(400, 'INVALID_REPORT_ID', 'Report id is invalid');
  }
  return value;
}

function getReportReason(value: unknown): (typeof reportReasons)[number] {
  const reason = readRequiredText(value, 'INVALID_REPORT_REASON', 'Report reason is invalid');
  if (!reportReasons.includes(reason as (typeof reportReasons)[number])) {
    throw new AppError(400, 'INVALID_REPORT_REASON', 'Report reason is invalid');
  }
  return reason as (typeof reportReasons)[number];
}

function getReportStatus(value: unknown): (typeof reportStatuses)[number] {
  const status = readRequiredText(value, 'INVALID_REPORT_STATUS', 'Report status is invalid');
  if (!reportStatuses.includes(status as (typeof reportStatuses)[number])) {
    throw new AppError(400, 'INVALID_REPORT_STATUS', 'Report status is invalid');
  }
  return status as (typeof reportStatuses)[number];
}

function reportFilter(value: unknown): Record<string, unknown> {
  if (value === undefined || value === 'all') return {};
  if (value === 'open') return { status: { $ne: 'RESOLVED' } };
  if (value === 'closed') return { status: 'RESOLVED' };
  throw new AppError(400, 'INVALID_REPORT_FILTER', 'Report filter is invalid');
}

function getPopulatedUserId(report: { userId: unknown }): string {
  const user = report.userId as { _id?: { toString(): string }; toString(): string };
  return user._id ? user._id.toString() : user.toString();
}

export const createReport: RequestHandler = async (request, response) => {
  const files = Array.isArray(request.files) ? request.files : [];

  try {
    const userId = getUserId(request);
    const channelId = readRequiredText(request.body.channelId, 'INVALID_CHANNEL_ID', 'Channel id is invalid');
    if (!isValidObjectId(channelId)) throw new AppError(400, 'INVALID_CHANNEL_ID', 'Channel id is invalid');

    const reason = getReportReason(request.body.reason);

    const description = readRequiredText(request.body.description, 'INVALID_REPORT_DESCRIPTION', 'Description is required');
    if (description.length > 1000) {
      throw new AppError(400, 'INVALID_REPORT_DESCRIPTION', 'Description must be 1000 characters or fewer');
    }

    const channel = await Channel.findOne({ _id: channelId, isActive: true });
    if (!channel) throw new AppError(404, 'CHANNEL_NOT_FOUND', 'Channel was not found');

    const evidenceUrls = files.map((file) => `/uploads/reports/${file.filename}`);

    const report = await Report.create({
      userId,
      channelId,
      reason,
      description,
      evidenceUrls
    });
    // TODO V6.5 AUDIT 1:
    // Record the REPORT_CREATED audit event after the Report has been persisted.
    const user = await User.findById(userId).select('email');

    try {
      // TODO V6 MAIL 3 (COMPLETADO): Notificar al correo de soporte al crear el reporte.
      await sendReportCreatedEmail(report, channel.name);
    } catch (error) {
      console.error('Could not send report notification:', error);
    }

    emitReportCreated(userId, {
      ...report.toObject(),
      channelId: { _id: channel.id, name: channel.name },
      userId: user ? { _id: user.id, email: user.email } : userId
    });

    response.status(201).json({ report });
  } catch (error) {
    await removeUploadedEvidence(files);
    throw error;
  }
};

export const listReports: RequestHandler = async (request, response) => {
  const reports = await Report.find({ userId: getUserId(request), ...reportFilter(request.query.filter) })
    .populate('channelId', 'name')
    .sort('-createdAt');

  response.json({ reports });
};

export const listSupportReports: RequestHandler = async (_request, response) => {
  const reports = await Report.find(reportFilter(_request.query.filter))
    .populate('channelId', 'name')
    .populate('userId', 'email')
    .sort('-createdAt');

  response.json({ reports });
};

export const supportReportMetrics: RequestHandler = async (request, response) => {
  const requestedDays = Number(request.query.days ?? 14);
  if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 90) {
    throw new AppError(400, 'INVALID_METRICS_DAYS', 'Metrics days must be an integer between 1 and 90');
  }

  const start = new Date();
  start.setDate(start.getDate() - (requestedDays - 1));
  start.setHours(0, 0, 0, 0);
  const metrics = await Report.aggregate([
    { $match: { status: 'RESOLVED', resolvedAt: { $gte: start }, resolvedBy: { $exists: true } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt', timezone: 'America/Mexico_City' } },
        resolvedCount: { $sum: 1 },
        averageResponseMinutes: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 60_000] } }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, day: '$_id', resolvedCount: 1, averageResponseMinutes: 1 } }
  ]);

  response.json({ metrics });
};

export const updateReport: RequestHandler = async (request, response) => {
  const reportId = getReportId(request.params.id);
  const reason = getReportReason(request.body.reason);
  const description = readRequiredText(request.body.description, 'INVALID_REPORT_DESCRIPTION', 'Description is required');
  if (description.length > 1000) {
    throw new AppError(400, 'INVALID_REPORT_DESCRIPTION', 'Description must be 1000 characters or fewer');
  }
  const status = getReportStatus(request.body.status);

  const report = await Report.findOne({ _id: reportId, userId: getUserId(request) });
  if (!report) {
    if (await Report.exists({ _id: reportId })) {
      await recordAuditLog({
        category: 'SECURITY', action: 'AUTHORIZATION_DENIED', actorType: request.auth!.role,
        actorId: getUserId(request), resourceType: 'REPORT', resourceId: reportId,
        metadata: { method: request.method, route: request.baseUrl + request.path, reason: 'NOT_REPORT_OWNER' }
      });
    }
    throw new AppError(404, 'REPORT_NOT_FOUND', 'Report was not found');
  }
  if (report.status === 'RESOLVED') {
    throw new AppError(409, 'REPORT_ALREADY_RESOLVED', 'Resolved reports cannot be edited');
  }
  const previousStatus = report.status;
  const changedFields = [
    ...(report.reason !== reason ? ['reason'] : []),
    ...(report.description !== description ? ['description'] : []),
    ...(report.status !== status ? ['status'] : [])
  ];
  report.reason = reason;
  report.description = description;
  report.status = status;
  await report.save();
  if (changedFields.length > 0) {
    // TODO V6.5 AUDIT 2:
    // Record REPORT_UPDATED when at least one relevant field changed.
  }

  await report.populate([{ path: 'channelId', select: 'name' }, { path: 'userId', select: 'email' }]);
  emitReportUpdated(getUserId(request), report.toObject());
  response.json({ report });
};

export const closeSupportReport: RequestHandler = async (request, response) => {
  const report = await Report.findById(getReportId(request.params.id));
  if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report was not found');

  const wasAlreadyClosed = report.status === 'RESOLVED' && Boolean(report.resolvedAt);
  if (!wasAlreadyClosed) {
    const previousStatus = report.status;
    report.status = 'RESOLVED';
    report.resolvedAt = new Date();
    report.resolvedBy = new Types.ObjectId(getUserId(request));
    await report.save();
    // TODO V6.5 AUDIT 4:
    // Record that the ADMIN resolved this Report after the state change was persisted.
  }

  await report.populate([{ path: 'channelId', select: 'name' }, { path: 'userId', select: 'email' }]);
  const userId = getPopulatedUserId(report);
  const reporter = report.userId as unknown as { email?: string };
  const channel = report.channelId as unknown as { name?: string };

  if (!wasAlreadyClosed && reporter.email) {
    try {
      // TODO V6 MAIL 4 (COMPLETADO): Avisar al reportante al resolver el reporte.
      await sendReportResolvedEmail(report, channel.name ?? 'Unknown channel', reporter.email);
    } catch (error) {
      console.error('Could not send report resolution notification:', error);
    }
  }

  if (!wasAlreadyClosed) emitReportUpdated(userId, report.toObject());
  response.json({ report });
};

export const deleteReport: RequestHandler = async (request, response) => {
  const reportId = getReportId(request.params.id);
  const report = await Report.findOne({ _id: reportId, userId: getUserId(request) });
  if (!report) {
    if (await Report.exists({ _id: reportId })) {
      await recordAuditLog({
        category: 'SECURITY', action: 'AUTHORIZATION_DENIED', actorType: request.auth!.role,
        actorId: getUserId(request), resourceType: 'REPORT', resourceId: reportId,
        metadata: { method: request.method, route: request.baseUrl + request.path, reason: 'NOT_REPORT_OWNER' }
      });
    }
    throw new AppError(404, 'REPORT_NOT_FOUND', 'Report was not found');
  }
  if (report.status === 'RESOLVED') {
    throw new AppError(409, 'REPORT_ALREADY_RESOLVED', 'Resolved reports cannot be deleted');
  }
  await Report.deleteOne({ _id: report._id });
  // TODO V6.5 AUDIT 5:
  // Record the final audit event for this Report using the data captured before deletion.

  await removeEvidenceUrls(report.evidenceUrls);
  response.status(204).send();
};

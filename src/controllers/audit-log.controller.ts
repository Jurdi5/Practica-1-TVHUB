import type { RequestHandler } from 'express';
import { isValidObjectId } from 'mongoose';
import { AuditLog, auditActions, auditActorTypes, auditCategories, auditResourceTypes } from '../models/audit-log.model.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';

function queryText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function enumFilter(value: unknown, values: readonly string[], name: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new AppError(400, 'INVALID_LOG_FILTER', `${name} is invalid`);
  }
  return value;
}

function objectIdFilter(value: unknown, name: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !isValidObjectId(value)) {
    throw new AppError(400, 'INVALID_LOG_FILTER', `${name} is invalid`);
  }
  return value;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const listAuditLogs: RequestHandler = async (request, response) => {
  const filter: Record<string, unknown> = {};
  const category = enumFilter(request.query.category, auditCategories, 'Category');
  const action = enumFilter(request.query.action, auditActions, 'Action');
  const actorType = enumFilter(request.query.actorType, auditActorTypes, 'Actor type');
  const resourceType = enumFilter(request.query.resourceType, auditResourceTypes, 'Resource type');
  const resourceId = objectIdFilter(request.query.resourceId, 'Resource id');
  const sessionId = objectIdFilter(request.query.sessionId, 'Session id');
  if (category) filter.category = category;
  if (action) filter.action = action;
  if (actorType) filter.actorType = actorType;
  if (resourceType) filter.resourceType = resourceType;
  if (resourceId) filter.resourceId = resourceId;
  if (sessionId) filter.sessionId = sessionId;

  const search = queryText(request.query.search);
  if (search.length > 100) throw new AppError(400, 'INVALID_LOG_SEARCH', 'Search is too long');
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ email: expression }).select('_id').limit(100).lean();
    const matches: Record<string, unknown>[] = [
      { action: expression },
      { 'metadata.attemptedEmail': expression },
      { actorId: { $in: users.map((user) => user._id) } }
    ];
    if (isValidObjectId(search)) {
      matches.push({ resourceId: search }, { sessionId: search });
    }
    filter.$or = matches;
  }

  const sort = request.query.sort === undefined ? 'createdAt' : queryText(request.query.sort);
  const order = request.query.order === undefined ? 'desc' : queryText(request.query.order);
  if (sort !== 'createdAt' || !['asc', 'desc'].includes(order)) {
    throw new AppError(400, 'INVALID_LOG_SORT', 'Sort must be createdAt with asc or desc order');
  }
  const page = Number(request.query.page ?? 1);
  const limit = Number(request.query.limit ?? 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, 'INVALID_LOG_PAGE', 'Page and limit are invalid');
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).populate('actorId', 'email').sort({ createdAt: order === 'asc' ? 1 : -1, _id: order === 'asc' ? 1 : -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter)
  ]);
  response.json({ logs, total, page, limit });
};

export const listReportAuditLogs: RequestHandler = async (request, response) => {
  const reportId = request.params.reportId;
  if (typeof reportId !== 'string' || !isValidObjectId(reportId)) {
    throw new AppError(400, 'INVALID_REPORT_ID', 'Report id is invalid');
  }
  const logs = await AuditLog.find({ resourceType: 'REPORT', resourceId: reportId })
    .populate('actorId', 'email').sort({ createdAt: -1, _id: -1 }).lean();
  response.json({ logs });
};

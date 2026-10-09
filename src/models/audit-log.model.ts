import { model, Schema } from 'mongoose';

export const auditCategories = ['REPORT', 'SECURITY'] as const;
export const auditActions = [
  'REPORT_CREATED', 'REPORT_UPDATED', 'REPORT_ESCALATED', 'REPORT_RESOLVED', 'REPORT_DELETED',
  'AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILURE', 'AUTH_LOGOUT',
  'AUTH_REFRESH_SUCCESS', 'AUTH_REFRESH_FAILURE', 'AUTHORIZATION_DENIED',
  'SESSION_CREATED', 'SESSION_TERMINATED', 'SESSION_EXPIRED'
] as const;
export const auditActorTypes = ['USER', 'ADMIN', 'SYSTEM', 'ANONYMOUS'] as const;
export const auditResourceTypes = ['REPORT', 'SESSION', 'AUTH', 'USER'] as const;

export type AuditCategory = (typeof auditCategories)[number];
export type AuditAction = (typeof auditActions)[number];
export type AuditActorType = (typeof auditActorTypes)[number];
export type AuditResourceType = (typeof auditResourceTypes)[number];

const auditLogSchema = new Schema({
  category: { type: String, enum: auditCategories, required: true },
  action: { type: String, enum: auditActions, required: true },
  actorType: { type: String, enum: auditActorTypes, required: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  resourceType: { type: String, enum: auditResourceTypes, required: true },
  resourceId: { type: Schema.Types.ObjectId, default: null },
  sessionId: { type: Schema.Types.ObjectId, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ sessionId: 1 });

export const AuditLog = model('AuditLog', auditLogSchema);

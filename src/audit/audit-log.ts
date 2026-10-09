import { AuditLog, type AuditAction, type AuditActorType, type AuditCategory, type AuditResourceType } from '../models/audit-log.model.js';

type AuditEntry = {
  category: AuditCategory;
  action: AuditAction;
  actorType: AuditActorType;
  actorId?: string | null;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create(entry);
  } catch {
    // Audit writes must never change the outcome of the operation being recorded.
    console.error(`Could not record audit log: ${entry.action}`);
  }
}

import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { Session } from "../models/session.model.js";
import { User, type Role } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { clearAuthCookies, setAuthCookies } from "../utils/cookies.js";
import {
  createAccessToken,
  createRefreshToken,
  refreshTokenExpiresAt,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { hashRefreshToken, refreshTokenMatches } from "../utils/token-hash.js";
import { recordAuditLog } from '../audit/audit-log.js';
import { AuditLog } from '../models/audit-log.model.js';

type Credentials = { email?: unknown; password?: unknown };

// Leer y validar las credenciales del usuario (email y password) desde el cuerpo de la solicitud.
// Si las credenciales no son válidas, se lanza un error de validación.
function readCredentials(body: Credentials): {
  email: string;
  password: string;
} {
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  // Comprueba si el texto de la variable email no cumple con el patrón de la expresión regular.
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Provide a valid email and a password of at least 8 characters",
    );
  }

  return { email, password };
}

// Helper para devolver un objeto de usuario público que contiene solo los campos necesarios para la respuesta
// para no devolver el documento MongoDB completo y exponer información sensible como el hash de la contraseña.
function publicUser(user: { _id: Types.ObjectId; email: string; role: Role }) {
  return { id: user._id.toString(), email: user.email, role: user.role };
}

// Se crea un session id y un refresh token para el usuario autenticado,
// Se guarda la sesión en la base de datos y se devuelve un objeto con el access token y el refresh token.
async function createSessionTokens(
  user: { _id: Types.ObjectId; role: Role },
  userAgent?: string,
) {
  const sessionId = new Types.ObjectId();
  const userId = user._id.toString();
  const refreshToken = createRefreshToken(userId, sessionId.toString());

  // La sesion se guarda en MongoDB para que podamos invalidar el refresh token si el usuario cierra sesión
  // o si el refresh token se ve comprometido.
  await Session.create({
    _id: sessionId,
    userId: user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshTokenExpiresAt(),
    userAgent,
  });

  await recordAuditLog({
    category: 'SECURITY', action: 'SESSION_CREATED', actorType: user.role,
    actorId: userId, resourceType: 'SESSION', resourceId: sessionId.toString(),
    sessionId: sessionId.toString(), metadata: { role: user.role, userAgent: userAgent?.slice(0, 200) }
  });

  return { accessToken: createAccessToken(userId, user.role), refreshToken, sessionId: sessionId.toString() };
}

async function auditRefreshFailure(reason: string, userId?: string, sessionId?: string): Promise<void> {
  await recordAuditLog({
    category: 'SECURITY', action: 'AUTH_REFRESH_FAILURE', actorType: userId ? 'USER' : 'ANONYMOUS',
    actorId: userId, resourceType: sessionId ? 'SESSION' : 'AUTH', resourceId: sessionId,
    sessionId, metadata: { reason }
  });
}

async function auditExpiredSession(sessionId: string, userId: string): Promise<void> {
  try {
    if (await AuditLog.exists({ action: 'SESSION_EXPIRED', sessionId })) return;
    await recordAuditLog({
      category: 'SECURITY', action: 'SESSION_EXPIRED', actorType: 'SYSTEM',
      resourceType: 'SESSION', resourceId: sessionId, sessionId,
      metadata: { userId }
    });
  } catch {
    console.error('Could not check session expiration audit log');
  }
}

// Lee y valida si en MongoDB ya existe un usuario con el mismo email, si no existe,
// se crea un nuevo usuario con el email y la contraseña hasheada.
export const register: RequestHandler = async (request, response) => {
  const { email, password } = readCredentials(request.body);
  const existingUser = await User.exists({ email });
  if (existingUser)
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "Email already exists");

  // conveierte la password en un hash seguro antes de guardarla en la base de datos
  // MiPassword123 -> bcrypt -> $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
  const passwordHash = await hashPassword(password);
  // Crea un nuevo usuario en la base de datos con el email y el hash de la password
  const user = await User.create({ email, passwordHash, role: "USER" });
  // Crea un session id y un refresh token para el usuario autenticado
  const tokens = await createSessionTokens(user, request.get("user-agent"));
  // Envia el access token y el refresh token al cliente en cookies seguras
  setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
  response.status(201).json({ user: publicUser(user) });
};

export const login: RequestHandler = async (request, response) => {
  let credentials: ReturnType<typeof readCredentials>;
  try {
    credentials = readCredentials(request.body);
  } catch (error) {
    await recordAuditLog({
      category: 'SECURITY', action: 'AUTH_LOGIN_FAILURE', actorType: 'ANONYMOUS', resourceType: 'AUTH',
      metadata: { attemptedEmail: typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase().slice(0, 200) : '', reason: 'VALIDATION_ERROR', ip: request.ip }
    });
    throw error;
  }
  const { email, password } = credentials;
  const user = await User.findOne({ email });

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    await recordAuditLog({
      category: 'SECURITY', action: 'AUTH_LOGIN_FAILURE', actorType: 'ANONYMOUS', resourceType: 'AUTH',
      metadata: { attemptedEmail: email.slice(0, 200), reason: 'INVALID_CREDENTIALS', ip: request.ip }
    });
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const tokens = await createSessionTokens(user, request.get("user-agent"));
  await recordAuditLog({
    category: 'SECURITY', action: 'AUTH_LOGIN_SUCCESS', actorType: user.role,
    actorId: user.id, resourceType: 'AUTH', resourceId: user.id, sessionId: tokens.sessionId,
    metadata: { email: user.email, role: user.role, ip: request.ip }
  });
  setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
  response.json({ user: publicUser(user) });
};

/*
¿Existe la sesión?
¿Pertenece al usuario?
¿Sigue activa?
¿No expiró?
¿El refresh token coincide?
*/
export const refresh: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies.refreshToken;
  if (typeof refreshToken !== "string") {
    await auditRefreshFailure('MISSING_TOKEN');
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is required");
  }

  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    await auditRefreshFailure('INVALID_OR_EXPIRED_TOKEN');
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  const session = await Session.findById(payload.sid);
  const failureReason = !session ? 'SESSION_NOT_FOUND'
    : session.userId.toString() !== payload.sub ? 'SESSION_USER_MISMATCH'
      : session.revokedAt ? 'SESSION_REVOKED'
        : session.expiresAt <= new Date() ? 'SESSION_EXPIRED'
          : !refreshTokenMatches(refreshToken, session.refreshTokenHash) ? 'TOKEN_MISMATCH' : undefined;
  if (!session || failureReason) {
    if (failureReason === 'SESSION_EXPIRED' && session) await auditExpiredSession(session.id, payload.sub);
    await auditRefreshFailure(failureReason ?? 'SESSION_NOT_FOUND', session?.userId.toString() === payload.sub ? payload.sub : undefined, payload.sid);
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    await auditRefreshFailure('USER_NOT_FOUND', payload.sub, session.id);
    throw new AppError(401, "UNAUTHORIZED", "User no longer exists");
  }

  const newRefreshToken = createRefreshToken(user.id, session.id);
  session.refreshTokenHash = hashRefreshToken(newRefreshToken);
  session.expiresAt = refreshTokenExpiresAt();
  await session.save();

  await recordAuditLog({
    category: 'SECURITY', action: 'AUTH_REFRESH_SUCCESS', actorType: user.role,
    actorId: user.id, resourceType: 'SESSION', resourceId: session.id, sessionId: session.id,
    metadata: { role: user.role, rotated: true }
  });

  setAuthCookies(
    response,
    createAccessToken(user.id, user.role),
    newRefreshToken,
  );
  response.json({ user: publicUser(user) });
};

export const logout: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies.refreshToken;
  if (typeof refreshToken !== "string") {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is required");
  }

  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  const session = await Session.findById(payload.sid);
  const isCurrentSession =
    session &&
    session.userId.toString() === payload.sub &&
    !session.revokedAt &&
    session.expiresAt > new Date() &&
    refreshTokenMatches(refreshToken, session.refreshTokenHash);

  if (!isCurrentSession) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  session.revokedAt = new Date();
  await session.save();
  let role: Role = 'USER';
  try {
    role = (await User.findById(payload.sub).select('role'))?.role ?? 'USER';
  } catch {
    console.error('Could not resolve role for logout audit log');
  }
  await recordAuditLog({
    category: 'SECURITY', action: 'AUTH_LOGOUT', actorType: role, actorId: payload.sub,
    resourceType: 'SESSION', resourceId: session.id, sessionId: session.id,
    metadata: { reason: 'LOGOUT' }
  });
  await recordAuditLog({
    category: 'SECURITY', action: 'SESSION_TERMINATED', actorType: role, actorId: payload.sub,
    resourceType: 'SESSION', resourceId: session.id, sessionId: session.id,
    metadata: { reason: 'LOGOUT' }
  });
  clearAuthCookies(response);
  response.status(204).send();
};

export const logoutAll: RequestHandler = async (request, response) => {
  const auth = request.auth;
  if (!auth)
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required");

  const sessions = await Session.find({ userId: auth.userId, revokedAt: { $exists: false } }).select('_id');
  await Session.updateMany(
    { _id: { $in: sessions.map((session) => session._id) }, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
  await recordAuditLog({
    category: 'SECURITY', action: 'AUTH_LOGOUT', actorType: auth.role, actorId: auth.userId,
    resourceType: 'AUTH', resourceId: auth.userId, metadata: { reason: 'LOGOUT_ALL', sessionCount: sessions.length }
  });
  for (const session of sessions) {
    await recordAuditLog({
      category: 'SECURITY', action: 'SESSION_TERMINATED', actorType: auth.role, actorId: auth.userId,
      resourceType: 'SESSION', resourceId: session.id, sessionId: session.id,
      metadata: { reason: 'LOGOUT_ALL' }
    });
  }
  clearAuthCookies(response);
  response.status(204).send();
};

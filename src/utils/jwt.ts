import jwt, { JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import type { Role } from '../models/user.model.js';

type AccessPayload = { sub: string; role: Role };
type RefreshPayload = { sub: string; sid: string };

function durationInMilliseconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error('Token TTL must use s, m, h, or d (for example 15m)');
  const units: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2]];
}

export function createAccessToken(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role }, env.accessSecret, { expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn'] });
}

export function createRefreshToken(userId: string, sessionId: string): string {
  // jti makes each rotation a distinct signed token, even within the same second.
  return jwt.sign({ sub: userId, sid: sessionId, jti: randomUUID() }, env.refreshSecret, { expiresIn: env.refreshTokenTtl as jwt.SignOptions['expiresIn'] });
}

function verify(token: string, secret: string): JwtPayload {
  const payload = jwt.verify(token, secret);
  if (typeof payload === 'string') throw new Error('Invalid token payload');
  return payload;
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = verify(token, env.accessSecret);
  if (typeof payload.sub !== 'string' || (payload.role !== 'USER' && payload.role !== 'ADMIN')) throw new Error('Invalid access token');
  return { sub: payload.sub, role: payload.role };
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const payload = verify(token, env.refreshSecret);
  if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw new Error('Invalid refresh token');
  return { sub: payload.sub, sid: payload.sid };
}

export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + durationInMilliseconds(env.refreshTokenTtl));
}

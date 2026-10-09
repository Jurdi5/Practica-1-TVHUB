import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';

let io: Server | undefined;

function accessTokenFromCookie(cookieHeader: string | undefined): string | undefined {
  return cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim().split('='))
    .find(([name]) => name === 'accessToken')
    ?.slice(1)
    .join('=');
}

export function initializeSocket(server: HttpServer): Server {
  io = new Server(server);
  io.use((socket, next) => {
    const accessToken = accessTokenFromCookie(socket.handshake.headers.cookie);
    if (!accessToken) return next(new Error('Authentication is required'));

    try {
      const auth = verifyAccessToken(accessToken);
      socket.data.userId = auth.sub;
      socket.data.role = auth.role;
      next();
    } catch {
      next(new Error('Invalid or expired access token'));
    }
  });
  io.on('connection', (socket) => {
    socket.join(socket.data.userId);
    if (socket.data.role === 'ADMIN') socket.join('admins');
  });
  return io;
}

function emitToUser(userId: string, event: 'report:created' | 'report:updated', report: unknown): void {
  try {
    io?.to(userId).emit(event, report);
    io?.to('admins').emit(event, report);
  } catch (error) {
    console.error(`Could not emit ${event}:`, error);
  }
}

export function emitReportCreated(userId: string, report: unknown): void {
  emitToUser(userId, 'report:created', report);
}

export function emitReportUpdated(userId: string, report: unknown): void {
  emitToUser(userId, 'report:updated', report);
}

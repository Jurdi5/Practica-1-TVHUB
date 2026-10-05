import type { Response } from 'express';
import { env } from '../config/env.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.nodeEnv === 'production',
  path: '/'
};

export function setAuthCookies(response: Response, accessToken: string, refreshToken: string): void {
  response.cookie('accessToken', accessToken, cookieOptions);
  response.cookie('refreshToken', refreshToken, cookieOptions);
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie('accessToken', cookieOptions);
  response.clearCookie('refreshToken', cookieOptions);
}

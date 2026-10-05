import { createHash, timingSafeEqual } from 'node:crypto';

// bcrypt truncates input after 72 bytes. JWTs are longer, so use SHA-256 for
// refresh-token comparison and keep bcrypt exclusively for user passwords.
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenMatches(token: string, storedHash: string): boolean {
  const tokenHash = Buffer.from(hashRefreshToken(token), 'hex');
  const savedHash = Buffer.from(storedHash, 'hex');
  return tokenHash.length === savedHash.length && timingSafeEqual(tokenHash, savedHash);
}

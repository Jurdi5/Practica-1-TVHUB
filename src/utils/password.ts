import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export function hashPassword(value: string): Promise<string> {
  return bcrypt.hash(value, SALT_ROUNDS);
}

export function comparePassword(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

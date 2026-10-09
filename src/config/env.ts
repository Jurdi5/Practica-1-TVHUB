import dotenv from 'dotenv';

// A clone of the project does not contain .env because it must never be
// committed. For local classes, use the versioned example as a safe fallback
// so that `npm run dev` works immediately. A real .env (or platform variables)
// always takes precedence, and production never uses the example file.
const localEnvironment = dotenv.config({ path: '.env' });

if (localEnvironment.error && process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.example' });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function positiveNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return parsed;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: required('MONGO_URI'),
  accessSecret: required('JWT_ACCESS_SECRET'),
  refreshSecret: required('JWT_REFRESH_SECRET'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '7d',
  reportNotificationEmail: process.env.REPORT_NOTIFICATION_EMAIL ?? 'reports@tvhub.local',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: positiveNumber('SMTP_PORT', 587),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM ?? 'TV Hub <no-reply@tvhub.local>',
  reportEscalationMinutes: positiveNumber('REPORT_ESCALATION_MINUTES', 2),
  reportEscalationCron: process.env.REPORT_ESCALATION_CRON ?? '*/1 * * * *'
};

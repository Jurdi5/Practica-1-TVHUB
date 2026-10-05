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

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: required('MONGO_URI'),
  accessSecret: required('JWT_ACCESS_SECRET'),
  refreshSecret: required('JWT_REFRESH_SECRET'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '7d'
};

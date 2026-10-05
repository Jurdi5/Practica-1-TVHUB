process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/tvhub-test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';

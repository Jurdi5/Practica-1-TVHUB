import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function start(): Promise<void> {
  await connectDatabase();
  app.listen(env.port, () => console.log(`TV Hub listening on http://localhost:${env.port}`));
}

start().catch((error: unknown) => {
  console.error('Could not start TV Hub:', error);
  process.exit(1);
});

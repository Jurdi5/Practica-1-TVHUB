import { createServer } from 'node:http';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { startReportEscalationJob } from './jobs/report-escalation.job.js';
import { initializeSocket } from './realtime/socket.js';

async function start(): Promise<void> {
  const httpServer = createServer(app);
  initializeSocket(httpServer);
  await connectDatabase();
  startReportEscalationJob();
  httpServer.listen(env.port, () => console.log(`TV Hub listening on http://localhost:${env.port}`));
}

start().catch((error: unknown) => {
  console.error('Could not start TV Hub:', error);
  process.exit(1);
});

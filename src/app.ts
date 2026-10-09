import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { channelRouter } from './routes/channel.routes.js';
import { favoriteRouter } from './routes/favorite.routes.js';
import { reportRouter, supportReportRouter } from './routes/report.routes.js';
import { adminRouter, userRouter } from './routes/user.routes.js';
import { auditLogRouter } from './routes/audit-log.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const publicFolder = process.env.NODE_ENV === 'production' ? 'dist/public' : 'src/public';
const publicDirectory = path.join(process.cwd(), publicFolder);

export const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(cookieParser());

app.use(healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/channels', channelRouter);
app.use('/api/favorites', favoriteRouter);
app.use('/api/reports', reportRouter);
app.use('/api/admin/reports', supportReportRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', auditLogRouter);
app.use('/api/admin', adminRouter);

app.get('/', (_request, response) => response.sendFile(path.join(publicDirectory, 'index.html')));
app.get('/login', (_request, response) => response.sendFile(path.join(publicDirectory, 'login.html')));
app.get('/register', (_request, response) => response.sendFile(path.join(publicDirectory, 'register.html')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/vendor/chart.js', express.static(path.join(process.cwd(), 'node_modules', 'chart.js', 'dist')));
app.use(express.static(publicDirectory));

app.use(notFound);
app.use(errorHandler);

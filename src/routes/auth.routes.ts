import { Router } from 'express';
import { login, logout, logoutAll, refresh, register } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/logout-all', authenticate, logoutAll);

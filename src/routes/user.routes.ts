import { Router } from 'express';
import { adminDemo, me } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';

export const userRouter = Router();
export const adminRouter = Router();

userRouter.get('/me', authenticate, me);
adminRouter.get('/demo', authenticate, authorize('ADMIN'), adminDemo);

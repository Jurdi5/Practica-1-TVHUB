import { Router } from 'express';
import { getChannel, listChannels } from '../controllers/channel.controller.js';

export const channelRouter = Router();

channelRouter.get('/', listChannels);
channelRouter.get('/:id', getChannel);

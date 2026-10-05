import { Router } from 'express';
import { getChannel, listChannels } from '../controllers/channel.controller.js';

export const channelRouter = Router();

channelRouter.get('/', listChannels);
// TODO 1:
// Completa el Controller que debe atender esta ruta.
// Objetivo: conectar GET /api/channels/:id con la lógica que recupera un solo Channel.
// Resultado esperado: Express debe ejecutar el Controller correcto cuando se solicita un canal por id.
channelRouter.get('/:id', getChannel);

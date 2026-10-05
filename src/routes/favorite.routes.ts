import { Router } from 'express';
import { addFavorite, listFavorites, removeFavorite } from '../controllers/favorite.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';

export const favoriteRouter = Router();

favoriteRouter.get('/', authenticate, listFavorites);
favoriteRouter.post('/:channelId', authenticate, addFavorite);
favoriteRouter.delete('/:channelId', authenticate, removeFavorite);

import type { RequestHandler } from 'express';
import { isValidObjectId } from 'mongoose';
import { Channel } from '../models/channel.model.js';
import { Favorite } from '../models/favorite.model.js';
import { AppError } from '../utils/app-error.js';

function readChannelId(value: unknown): string {
  if (typeof value !== 'string' || !isValidObjectId(value)) {
    throw new AppError(400, 'INVALID_CHANNEL_ID', 'Channel id is invalid');
  }

  return value;
}

function getUserId(request: Parameters<RequestHandler>[0]): string {
  if (!request.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  return request.auth.userId;
}

export const listFavorites: RequestHandler = async (request, response) => {
  const favorites = await Favorite.find({ userId: getUserId(request) })
    .populate('channelId')
    .sort('-createdAt');

  response.json({ favorites });
};

export const addFavorite: RequestHandler = async (request, response) => {
  const userId = getUserId(request);
  const channelId = readChannelId(request.params.channelId);
  const channel = await Channel.findOne({ _id: channelId, isActive: true });

  if (!channel) throw new AppError(404, 'CHANNEL_NOT_FOUND', 'Channel was not found');

  const existingFavorite = await Favorite.findOne({ userId, channelId });
  if (existingFavorite) {
    throw new AppError(409, 'FAVORITE_ALREADY_EXISTS', 'Channel is already in favorites');
  }

  const favorite = await Favorite.create({ userId, channelId });
  response.status(201).json({ favorite });
};

export const removeFavorite: RequestHandler = async (request, response) => {
  const favorite = await Favorite.findOneAndDelete({
    userId: getUserId(request),
    channelId: readChannelId(request.params.channelId)
  });

  if (!favorite) throw new AppError(404, 'FAVORITE_NOT_FOUND', 'Channel is not in favorites');

  response.status(204).send();
};

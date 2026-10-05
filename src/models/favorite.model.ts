import { model, Schema } from 'mongoose';

const favoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true }
  },
  { timestamps: true }
);

// A channel can only appear once in each user's library.
favoriteSchema.index({ userId: 1, channelId: 1 }, { unique: true });

export const Favorite = model('Favorite', favoriteSchema);

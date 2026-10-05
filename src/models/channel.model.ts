import { model, Schema } from 'mongoose';

const channelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String, required: true, trim: true },
    streamUrl: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    categories: { type: [String], required: true, default: [] },
    isActive: { type: Boolean, required: true, default: true },
    tvgId: { type: String, trim: true },
    streamType: { type: String, enum: ['hls', 'dash'] },
    httpReferrer: { type: String, trim: true },
    httpUserAgent: { type: String, trim: true }
  },
  { timestamps: true }
);

export const Channel = model('Channel', channelSchema);

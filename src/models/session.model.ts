import { model, Schema } from 'mongoose';

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    // MongoDB automatically removes a session after this date.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date },
    userAgent: { type: String }
  },
  { timestamps: true }
);

export const Session = model('Session', sessionSchema);

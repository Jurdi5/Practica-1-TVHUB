import { model, Schema } from 'mongoose';

export const roles = ['USER', 'ADMIN'] as const;
export type Role = (typeof roles)[number];

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: roles, required: true, default: 'USER' }
  },
  { timestamps: true }
);

export const User = model('User', userSchema);

import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

// ADMIN: everything incl. users. MANAGER: edit, verify, payments, vendors, items.
// STAFF: enter invoices and view only.
export const ROLES = ['ADMIN', 'MANAGER', 'STAFF'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'STAFF' },
  },
  {
    ...jsonOptions,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
      },
    },
  }
);

export default mongoose.model('User', userSchema);

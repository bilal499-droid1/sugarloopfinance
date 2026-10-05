import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

export const MOVEMENT_TYPES = [
  'RECEIPT_IN', // verified vendor receipt added stock
  'RECEIPT_REVERSAL', // receipt flagged / edited after verification
  'TRANSFER_OUT', // sent from central warehouse to a bakery branch
  'ADJUSTMENT', // manual correction by an admin
];

// Append-only audit log of every change to an item's in-hand quantity.
const stockMovementSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: String,
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    change: { type: Number, required: true }, // + in, - out
    before: Number,
    after: Number,
    recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingRecord' },
    branch: String, // destination for TRANSFER_OUT
    reason: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
  },
  jsonOptions
);

export default mongoose.model('StockMovement', stockMovementSchema);

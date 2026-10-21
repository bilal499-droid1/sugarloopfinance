import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

export const UNITS = ['kg', 'gms', 'litre', 'ml', 'pcs', 'pack', 'box', 'dozen', 'bag', 'bottle', 'per unit'];

// Item catalog entry + current central-warehouse stock.
const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    unit: { type: String, enum: [...UNITS, ''], default: '' }, // '' = no unit
    inHand: { type: Number, default: 0, min: 0 }, // only changed through stock movements
    reorderLevel: { type: Number, default: 0, min: 0 },
    notes: String,
  },
  jsonOptions
);

itemSchema.virtual('isLowStock').get(function () {
  return this.reorderLevel > 0 && this.inHand <= this.reorderLevel;
});

export default mongoose.model('Item', itemSchema);

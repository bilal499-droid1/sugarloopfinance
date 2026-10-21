import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

export const UNITS = ['Kg', 'Gms', 'Litre', 'Ml', 'Pcs', 'Pack', 'Box', 'Dozen', 'Bag', 'Bottle', 'Per Unit', 'Unit', 'Ctn'];

// The listed spelling of a unit typed in any case ('kg' -> 'Kg'); anything else is left as is.
export const canonicalUnit = (unit) => UNITS.find((u) => u.toLowerCase() === String(unit ?? '').trim().toLowerCase()) ?? unit;

// Item catalog entry + current central-warehouse stock.
const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    unit: { type: String, enum: [...UNITS, ''], default: '', set: canonicalUnit }, // '' = no unit
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

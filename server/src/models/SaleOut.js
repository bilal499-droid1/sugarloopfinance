import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const round2 = (n) => Math.round(n * 100) / 100;

const saleOutLineSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    itemName: { type: String, required: true },
    unit: { type: String, default: 'per' },
    qty: { type: Number, required: true, min: 0 },
    received: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const saleOutSchema = new mongoose.Schema(
  {
    entryNo: { type: String, unique: true, sparse: true },
    saleDate: { type: Date, required: true },
    type: { type: String, enum: ['perishable', 'nonperishable'], default: 'perishable' },
    lines: [saleOutLineSchema],
    grandTotal: { type: Number, default: 0 },
    branch: { type: String, default: '' },
    notes: String,
    createdBy: String,
  },
  jsonOptions
);

saleOutSchema.pre('save', function () {
  for (const line of this.lines) line.total = round2(line.qty * line.price);
  this.grandTotal = round2(this.lines.reduce((s, l) => s + l.total, 0));
});

export default mongoose.model('SaleOut', saleOutSchema);

import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const round2 = (n) => Math.round(n * 100) / 100;

const saleLineSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: String,
    unit: String,
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: Number,
  },
  { _id: false }
);

const saleRecordSchema = new mongoose.Schema(
  {
    saleInvoiceNo: { type: String, unique: true, sparse: true }, // auto SI-CST1001-0001
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: String,
    saleDate: { type: Date, default: Date.now },
    items: [saleLineSchema],
    amount: { type: Number, default: 0 },
    notes: String,
    createdBy: String,
    stockApplied: [{ _id: false, itemId: mongoose.Schema.Types.ObjectId, quantity: Number }],
  },
  jsonOptions
);

saleRecordSchema.pre('save', function () {
  if (this.items.length) {
    for (const line of this.items) line.amount = round2(line.quantity * line.unitPrice);
    this.amount = round2(this.items.reduce((sum, l) => sum + l.amount, 0));
  }
});

export default mongoose.model('SaleRecord', saleRecordSchema);

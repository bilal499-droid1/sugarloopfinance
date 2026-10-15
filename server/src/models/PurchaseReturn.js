import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const round2 = (n) => Math.round(n * 100) / 100;

const returnLineSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: String,
    unit: String,
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: Number, // quantity x unitPrice
  },
  { _id: false }
);

// Goods sent back to a vendor (damaged, wrong item, excess). Saving a return
// takes its quantities out of warehouse stock straight away.
const purchaseReturnSchema = new mongoose.Schema(
  {
    returnNo: { type: String, unique: true, sparse: true }, // auto, e.g. PR-VND1001-0001
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    vendorName: String,
    // The bill the goods came on (optional). Quantities can't exceed what it still has un-returned.
    recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingRecord' },
    invoiceNumber: String, // the original bill's vendor invoice no, for display
    returnDate: { type: Date, default: Date.now },
    items: [returnLineSchema],
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'PKR' },
    reason: String,
    notes: String,
    createdBy: String,
    updatedBy: String,
    // Quantities currently taken out of warehouse stock for this return, per item.
    stockApplied: [{ _id: false, itemId: mongoose.Schema.Types.ObjectId, quantity: Number }],
  },
  jsonOptions
);

purchaseReturnSchema.pre('save', function () {
  for (const line of this.items) line.amount = round2(line.quantity * line.unitPrice);
  this.amount = round2(this.items.reduce((sum, line) => sum + line.amount, 0));
});

export default mongoose.model('PurchaseReturn', purchaseReturnSchema);

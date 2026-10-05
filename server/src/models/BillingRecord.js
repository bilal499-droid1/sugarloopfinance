import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, STATUSES, CURRENCIES, PAYMENT_METHODS } from '../constants/categories.js';
import { jsonOptions } from './jsonOptions.js';

const round2 = (n) => Math.round(n * 100) / 100;

const lineItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: String,
    unit: String,
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: Number, // quantity x unitPrice
    previousUnitPrice: Number, // this vendor's last price for the item, for price-change checks
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    method: { type: String, enum: PAYMENT_METHODS, default: 'BANK' },
    reference: String,
    recordedBy: String,
  },
  { timestamps: true }
);

const billingRecordSchema = new mongoose.Schema(
  {
    purchaseInvoiceNo: { type: String, unique: true, sparse: true }, // auto, e.g. PI-VND1001-0001
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    vendorName: String,
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    source: { type: String, enum: ['OCR', 'MANUAL'], default: 'MANUAL' }, // 'OCR' only on older scanned bills

    // Invoice details
    invoiceNumber: String, // the vendor's own bill number
    receiptDate: { type: Date, default: Date.now },
    uploadDate: { type: Date, default: Date.now },
    items: [lineItemSchema],
    amount: { type: Number, default: 0 }, // receipt total = sum of line amounts when items exist
    currency: { type: String, enum: CURRENCIES, default: 'PKR' },

    // Status is derived: FLAGGED if flagged, PAID once fully paid, otherwise PENDING.
    status: { type: String, enum: STATUSES, default: 'PENDING' },
    flagged: { type: Boolean, default: false },
    payments: [paymentSchema],
    amountPaid: { type: Number, default: 0 },
    clearedAt: Date, // date of the payment that cleared the bill

    // Receipt image (stored only; all values are typed in by hand)
    imageUrl: String,
    billAvailable: { type: Boolean, default: true }, // did the vendor hand over a bill?
    // Legacy: filled by the receipt scanner, which has been removed. Kept so older bills still load.
    detectedPaidStamp: { type: Boolean, default: false },
    ocrConfidence: Number,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ocr: { type: mongoose.Schema.Types.Mixed },

    // Optional route details (INDRIVE_LOGISTICS, FUEL_TRANSIT)
    originLocation: String,
    destinationLocation: String,

    notes: String,
    createdBy: String,

    // Verification: stock is only added once a manager/admin has verified the receipt.
    verified: { type: Boolean, default: false },
    verifiedBy: String,
    verifiedAt: Date,
    // Quantities currently counted in warehouse stock for this receipt, per item.
    stockApplied: [{ _id: false, itemId: mongoose.Schema.Types.ObjectId, quantity: Number }],
  },
  jsonOptions
);

billingRecordSchema.virtual('balance').get(function () {
  return round2(this.amount - this.amountPaid);
});

// Keep line amounts, totals, payments and status consistent on every save.
billingRecordSchema.pre('save', function () {
  if (this.items.length) {
    for (const line of this.items) line.amount = round2(line.quantity * line.unitPrice);
    this.amount = round2(this.items.reduce((sum, line) => sum + line.amount, 0));
  }

  this.amountPaid = round2(this.payments.reduce((sum, p) => sum + p.amount, 0));
  const cleared = this.amount > 0 && this.amountPaid >= this.amount;
  if (cleared && !this.clearedAt) {
    this.clearedAt = this.payments.reduce((latest, p) => (p.date > latest ? p.date : latest), this.payments[0].date);
  }
  if (!cleared) this.clearedAt = undefined;

  this.status = this.flagged ? 'FLAGGED' : cleared ? 'PAID' : 'PENDING';
});

export default mongoose.model('BillingRecord', billingRecordSchema);

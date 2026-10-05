import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES } from '../constants/categories.js';
import { jsonOptions } from './jsonOptions.js';

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true }, // e.g. VND-1001
    defaultCategory: { type: String, enum: EXPENSE_CATEGORIES, default: 'MISC_OPERATIONS' },
    contactName: String,
    phone: String,
    email: String,
    address: String,
    active: { type: Boolean, default: true },
    invoiceSeq: { type: Number, default: 0 }, // last purchase invoice number issued for this vendor

    // Derived from billing records (see services/vendorTotals.js)
    complianceScore: { type: Number, default: 100 },
    totalBilled: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
  },
  jsonOptions
);

export default mongoose.model('Vendor', vendorSchema);

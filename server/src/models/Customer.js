import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    phone: String,
    address: String,
    active: { type: Boolean, default: true },
    // Running totals derived from sale records
    totalSales: { type: Number, default: 0 },
  },
  jsonOptions
);

export default mongoose.model('Customer', customerSchema);

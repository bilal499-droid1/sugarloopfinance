import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const lineSchema = new mongoose.Schema(
  { name: { type: String, required: true }, amount: { type: Number, required: true, min: 0 } },
  { _id: false }
);

const payrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    designation: { type: String, default: '' },
    department: { type: String, default: '' },
    month: { type: String, required: true }, // YYYY-MM
    basicSalary: { type: Number, required: true, min: 0 },
    allowances: [lineSchema],
    bonuses: [lineSchema],
    deductions: [lineSchema],
    grossSalary: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    paymentDate: { type: Date },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    createdBy: String,
  },
  jsonOptions
);

const sum = (arr) => (arr || []).reduce((s, l) => s + (l.amount || 0), 0);

payrollSchema.pre('save', function () {
  this.grossSalary = this.basicSalary + sum(this.allowances) + sum(this.bonuses);
  this.netSalary = this.grossSalary - sum(this.deductions);
});

export default mongoose.model('Payroll', payrollSchema);

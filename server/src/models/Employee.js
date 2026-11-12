import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    basicSalary: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  jsonOptions
);

export default mongoose.model('Employee', employeeSchema);

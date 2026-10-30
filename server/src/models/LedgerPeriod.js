import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null }, // null = currently open
    // When set, the scheduler auto-closes this period at this datetime and opens the next one.
    scheduledEndDate: { type: Date, default: null },
    nextPeriodLabel: { type: String, default: null },
    nextPeriodStartDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('LedgerPeriod', schema);

import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerPeriod', required: true },
    label: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    snapshotAt: { type: Date, default: Date.now },
    recordCount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    records: { type: mongoose.Schema.Types.Mixed, default: [] }, // frozen copy of all billing records
  },
  { timestamps: false }
);

export default mongoose.model('PeriodSnapshot', schema);

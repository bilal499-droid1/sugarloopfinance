import BillingRecord from '../models/BillingRecord.js';
import PeriodSnapshot from '../models/PeriodSnapshot.js';

export async function createPeriodSnapshot(period) {
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);

  const records = await BillingRecord.find({
    receiptDate: { $gte: start, $lte: end },
  }).lean();

  const totalAmount = records.reduce((s, r) => s + (r.amount || 0), 0);
  const totalPaid = records.reduce((s, r) => s + (r.amountPaid || 0), 0);

  const snapshot = await PeriodSnapshot.create({
    periodId: period._id ?? period.id,
    label: period.label,
    startDate: start,
    endDate: end,
    snapshotAt: new Date(),
    recordCount: records.length,
    totalAmount,
    totalPaid,
    records,
  });

  console.log(`[snapshot] Saved ${records.length} records for "${period.label}"`);
  return snapshot;
}

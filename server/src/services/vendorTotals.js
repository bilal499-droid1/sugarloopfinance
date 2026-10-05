import BillingRecord from '../models/BillingRecord.js';
import Vendor from '../models/Vendor.js';

// Recompute a vendor's ledger totals from its billing records. Flagged bills are
// excluded from what we owe.
// NOTE: sums amounts as-is; PKR/USD conversion is not handled yet.
export const recalcVendorTotals = async (vendorId) => {
  const records = await BillingRecord.find({ vendorId });
  const counted = records.filter((r) => r.status !== 'FLAGGED');
  const totalBilled = counted.reduce((sum, r) => sum + r.amount, 0);
  const totalPaid = counted.reduce((sum, r) => sum + r.amountPaid, 0);
  const flagged = records.length - counted.length;
  const complianceScore = records.length ? Math.round((counted.length / records.length) * 100) : 100;

  await Vendor.findByIdAndUpdate(vendorId, {
    totalBilled,
    totalPaid,
    pendingBalance: totalBilled - totalPaid,
    complianceScore,
  });
};

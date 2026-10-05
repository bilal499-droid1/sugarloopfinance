// Payment status of a bill, derived from what has been paid against it.
export const PAYMENT_STATUSES = {
  PAID: { label: 'Paid', tone: 'bg-emerald-100 text-emerald-700' },
  PARTIAL: { label: 'Partially paid', tone: 'bg-amber-100 text-amber-800' },
  UNPAID: { label: 'Pending', tone: 'bg-rose-100 text-rose-700' },
  FLAGGED: { label: 'Flagged', tone: 'bg-slate-200 text-slate-600' }, // rejected bills are not owed
};

export const paymentStatus = (record) => {
  if (record.status === 'FLAGGED') return 'FLAGGED';
  if (record.amount > 0 && record.amountPaid >= record.amount) return 'PAID';
  if (record.amountPaid > 0) return 'PARTIAL';
  return 'UNPAID';
};

// Short description of what was bought / what the bill is for.
export const itemDescription = (record, categoryLabel) => {
  if (record.items?.length) {
    return record.items.map((l) => `${l.itemName} × ${l.quantity} ${l.unit ?? ''}`.trim()).join(', ');
  }
  if (record.originLocation || record.destinationLocation) {
    return `${record.originLocation || '—'} → ${record.destinationLocation || '—'}`;
  }
  return record.notes || categoryLabel || '—';
};

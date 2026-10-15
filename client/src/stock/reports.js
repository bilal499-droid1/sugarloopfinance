import { toDateInput, today } from '../utils/format';

export const thisMonth = () => today().slice(0, 7);

// First and last day ("yyyy-mm-dd") of a "yyyy-mm" month.
export const monthBounds = (month) => {
  const [y, m] = month.split('-').map(Number);
  return { from: `${month}-01`, to: toDateInput(new Date(Date.UTC(y, m, 0))) };
};

const inRange = (value, { from, to }) => {
  const d = toDateInput(value);
  return (!from || d >= from) && (!to || d <= to);
};

// Bills counted in purchase reports: not flagged (rejected bills aren't owed).
export const purchasesIn = (records, range) =>
  records
    .filter((r) => r.status !== 'FLAGGED' && inRange(r.receiptDate, range))
    .sort((a, b) => new Date(a.receiptDate) - new Date(b.receiptDate));

export const returnsIn = (returns, range) =>
  returns.filter((r) => inRange(r.returnDate, range)).sort((a, b) => new Date(a.returnDate) - new Date(b.returnDate));

const sum = (list, key) => list.reduce((total, x) => total + (x[key] ?? 0), 0);

// Per-vendor totals for a period, biggest purchases first.
export const vendorSummaries = (bills, returns) => {
  const byVendor = new Map();
  const entry = (id, name) => {
    if (!byVendor.has(id)) byVendor.set(id, { vendorId: id, vendorName: name, bills: [], returns: [] });
    return byVendor.get(id);
  };
  for (const b of bills) entry(b.vendorId, b.vendorName).bills.push(b);
  for (const r of returns) entry(r.vendorId, r.vendorName).returns.push(r);

  return [...byVendor.values()]
    .map((v) => {
      const purchased = sum(v.bills, 'amount');
      const returned = sum(v.returns, 'amount');
      const paid = sum(v.bills, 'amountPaid');
      return { ...v, invoices: v.bills.length, purchased, returned, net: purchased - returned, paid, due: purchased - paid };
    })
    .sort((a, b) => b.purchased - a.purchased);
};

export const totalsOf = (summaries) => ({
  invoices: sum(summaries, 'invoices'),
  purchased: sum(summaries, 'purchased'),
  returned: sum(summaries, 'returned'),
  net: sum(summaries, 'net'),
  paid: sum(summaries, 'paid'),
  due: sum(summaries, 'due'),
});

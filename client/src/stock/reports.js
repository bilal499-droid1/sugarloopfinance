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

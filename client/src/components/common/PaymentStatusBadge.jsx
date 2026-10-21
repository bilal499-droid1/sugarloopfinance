import { PAYMENT_STATUSES, paymentStatus } from '../../utils/payment';
import { formatCurrency, formatDate } from '../../utils/format';

const balance = (r) => r.balance ?? Math.round((r.amount - r.amountPaid) * 100) / 100;

// Paid / Partially paid / Pending (nothing paid yet), with the detail that matters for each.
export default function PaymentStatusBadge({ record }) {
  const key = paymentStatus(record);
  const { label, tone } = PAYMENT_STATUSES[key];
  const money = (v) => formatCurrency(v, record.currency);
  const due = balance(record);

  return (
    <div className="whitespace-nowrap">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
      <div className="mt-0.5 text-xs text-slate-500">
        {key === 'PAID' && record.clearedAt && `on ${formatDate(record.clearedAt)}`}
        {key === 'PARTIAL' && `${money(record.amountPaid)} paid`}
        {key === 'UNPAID' && money(due)}
      </div>
    </div>
  );
}

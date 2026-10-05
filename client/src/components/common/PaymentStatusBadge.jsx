import { PAYMENT_STATUSES, paymentStatus } from '../../utils/payment';
import { formatCurrency, formatDate } from '../../utils/format';

// Paid / Partially paid / Pending (nothing paid yet), with the detail that matters for each.
export default function PaymentStatusBadge({ record }) {
  const key = paymentStatus(record);
  const { label, tone } = PAYMENT_STATUSES[key];
  const money = (v) => formatCurrency(v, record.currency);

  return (
    <div className="whitespace-nowrap">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
      <div className="mt-0.5 text-xs text-slate-500">
        {key === 'PAID' && record.clearedAt && `on ${formatDate(record.clearedAt)}`}
        {key === 'PARTIAL' && `${money(record.amountPaid)} paid · ${money(record.balance)} due`}
        {key === 'UNPAID' && `${money(record.balance)} due`}
      </div>
    </div>
  );
}

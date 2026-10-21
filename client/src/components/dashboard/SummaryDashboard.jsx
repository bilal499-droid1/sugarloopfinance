import { DollarSign, CheckCircle2, Wallet, CircleX, CircleDashed, AlertTriangle } from 'lucide-react';
import { useVisibleRecords, useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency } from '../../utils/format';
import { paymentStatus } from '../../utils/payment';
import StatCard from './StatCard';

const scrollToLedger = () =>
  document.getElementById('ledger')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

// Metrics for the records matching the current filters. Flagged bills don't count as owed.
export default function SummaryDashboard() {
  const records = useVisibleRecords();
  const setStatus = useFinanceStore((s) => s.setSelectedPaymentStatus);
  const counted = records.filter((r) => r.status !== 'FLAGGED');
  const count = (key) => records.filter((r) => paymentStatus(r) === key).length;

  const totalBilled = counted.reduce((sum, r) => sum + r.amount, 0);
  const totalPaid = counted.reduce((sum, r) => sum + r.amountPaid, 0);

  const filter = (status) => {
    setStatus(status);
    scrollToLedger();
  };

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
      <StatCard icon={DollarSign} label="Total Billed" value={formatCurrency(totalBilled)} onClick={() => filter('ALL')} />
      <StatCard icon={CheckCircle2} label="Total Paid" value={formatCurrency(totalPaid)} tone="text-emerald-600" onClick={() => filter('PAID')} />
      <StatCard icon={Wallet} label="Outstanding" value={formatCurrency(totalBilled - totalPaid)} tone="text-amber-600" onClick={() => filter('OUTSTANDING')} />
      <StatCard icon={CircleX} label="Pending Bills" value={count('UNPAID')} tone="text-rose-600" onClick={() => filter('UNPAID')} />
      <StatCard icon={CircleDashed} label="Partially Paid" value={count('PARTIAL')} tone="text-amber-600" onClick={() => filter('PARTIAL')} />
      <StatCard icon={AlertTriangle} label="Flagged" value={count('FLAGGED')} tone="text-slate-500" onClick={() => filter('FLAGGED')} />
    </section>
  );
}

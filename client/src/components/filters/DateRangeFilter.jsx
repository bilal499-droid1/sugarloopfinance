import { CalendarRange, X } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { toDateInput } from '../../utils/format';

const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return toDateInput(d);
};

const PRESETS = [
  ['This month', () => ({ from: toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), to: '' })],
  ['3 months', () => ({ from: monthsAgo(3), to: '' })],
  ['6 months', () => ({ from: monthsAgo(6), to: '' })],
  ['1 year', () => ({ from: monthsAgo(12), to: '' })],
];

// Calendar date-range filter on receipt date, with quick presets.
export default function DateRangeFilter() {
  const { from, to } = useFinanceStore((s) => s.dateRange);
  const setDateRange = useFinanceStore((s) => s.setDateRange);
  const input = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm';

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <CalendarRange className="h-4 w-4" />
      <input type="date" value={from} max={to || undefined} onChange={(e) => setDateRange({ from: e.target.value, to })} className={input} aria-label="From date" />
      <span>to</span>
      <input type="date" value={to} min={from || undefined} onChange={(e) => setDateRange({ from, to: e.target.value })} className={input} aria-label="To date" />
      {PRESETS.map(([label, range]) => (
        <button key={label} onClick={() => setDateRange(range())} className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs hover:border-indigo-400">
          {label}
        </button>
      ))}
      {(from || to) && (
        <button onClick={() => setDateRange({ from: '', to: '' })} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900">
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}

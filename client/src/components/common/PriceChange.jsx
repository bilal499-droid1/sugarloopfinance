import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber, percentChange } from '../../utils/format';

// Compares a unit price with the vendor's previous price for the same item.
export default function PriceChange({ current, previous, showPrevious = true }) {
  const pct = percentChange(Number(current), previous);
  if (pct === null) return <span className="text-xs text-slate-400">First purchase</span>;

  const rounded = Math.round(pct * 10) / 10;
  const tone =
    rounded > 0 ? 'bg-rose-100 text-rose-700' : rounded < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600';
  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      {showPrevious && <span className="text-slate-500">was {formatNumber(previous)}</span>}
      <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium ${tone}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {rounded > 0 ? '+' : ''}
        {rounded}%
      </span>
    </span>
  );
}

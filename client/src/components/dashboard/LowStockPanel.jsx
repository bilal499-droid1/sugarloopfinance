import { Link } from 'react-router-dom';
import { PackageX } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatNumber } from '../../utils/format';

export default function LowStockPanel() {
  const lowItems = useFinanceStore(useShallow((s) => s.items.filter((i) => i.isLowStock)));
  if (!lowItems.length) return null;

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-amber-800">
        <PackageX className="h-4 w-4" /> Low stock ({lowItems.length})
      </span>
      {lowItems.map((i) => (
        <span key={i.id} className="rounded-full bg-white px-2.5 py-0.5 text-amber-800 ring-1 ring-amber-200">
          {i.name}: {formatNumber(i.inHand)} / {formatNumber(i.reorderLevel)} {i.unit}
        </span>
      ))}
      <Link to="/inventory" className="ml-auto font-medium text-amber-800 underline">
        View inventory
      </Link>
    </section>
  );
}

import { useFinanceStore, filterRecords } from '../../store/useFinanceStore';
import { CATEGORIES, CATEGORY_KEYS } from '../../utils/categories';

// Category tag chips with live record counts (respecting the vendor + period filter).
export default function CategoryFilter() {
  const records = useFinanceStore((s) => s.records);
  const selectedVendorId = useFinanceStore((s) => s.selectedVendorId);
  const selectedCategory = useFinanceStore((s) => s.selectedCategory);
  const setSelectedCategory = useFinanceStore((s) => s.setSelectedCategory);
  const activePeriodStart = useFinanceStore((s) => s.activePeriodStart);
  const dateRange = useFinanceStore((s) => s.dateRange);

  const from = dateRange.from || activePeriodStart || '';
  const to = dateRange.to;
  const vendorRecords = filterRecords(records, { vendorId: selectedVendorId, from, to });
  const countFor = (key) => vendorRecords.filter((r) => r.category === key).length;

  const chip = (active) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
      active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <button className={chip(selectedCategory === 'ALL')} onClick={() => setSelectedCategory('ALL')}>
        All categories <span className="opacity-70">{vendorRecords.length}</span>
      </button>
      {CATEGORY_KEYS.map((key) => {
        const { label, icon: Icon } = CATEGORIES[key];
        return (
          <button key={key} className={chip(selectedCategory === key)} onClick={() => setSelectedCategory(key)}>
            <Icon className="h-4 w-4" />
            {label} <span className="opacity-70">{countFor(key)}</span>
          </button>
        );
      })}
    </div>
  );
}

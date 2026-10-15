import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { inputClass } from '../../components/common/Field';
import { toDateInput } from '../../utils/format';

const shiftDay = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateInput(d);
};

// "Select the date, then search the bill": a day picker with previous/next and a
// vendor / invoice search box, used by the edit screens.
export default function DayFinder({ date, onDateChange, query, onQueryChange, placeholder = 'Vendor name or invoice no' }) {
  const arrow = 'rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50';
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="block text-sm text-slate-700">
        Date
        <div className="mt-1 flex items-center gap-1">
          <button type="button" className={arrow} onClick={() => onDateChange(shiftDay(date, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input type="date" className={`${inputClass} mt-0 w-40`} value={date} onChange={(e) => e.target.value && onDateChange(e.target.value)} />
          <button type="button" className={arrow} onClick={() => onDateChange(shiftDay(date, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </label>
      <label className="block min-w-56 flex-1 text-sm text-slate-700">
        Search
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass} pl-8`} value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder={placeholder} />
        </div>
      </label>
    </div>
  );
}

// Case-insensitive match of the search box against a few text fields.
export const matchesQuery = (query, ...fields) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((f) => String(f ?? '').toLowerCase().includes(q));
};

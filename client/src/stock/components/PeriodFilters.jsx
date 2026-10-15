import Field, { inputClass } from '../../components/common/Field';
import { useFinanceStore } from '../../store/useFinanceStore';
import { monthBounds, thisMonth } from '../reports';

export const defaultPeriod = () => monthBounds(thisMonth());

// From / to dates and an optional vendor, shared by the print and search screens.
export default function PeriodFilters({ period, onChange, vendorId, onVendorChange, allLabel = 'All vendors' }) {
  const vendors = useFinanceStore((s) => s.vendors);
  return (
    <>
      <Field label="From">
        <input type="date" className={`${inputClass} w-40`} value={period.from} onChange={(e) => onChange({ ...period, from: e.target.value })} />
      </Field>
      <Field label="To">
        <input type="date" className={`${inputClass} w-40`} value={period.to} onChange={(e) => onChange({ ...period, to: e.target.value })} />
      </Field>
      {onVendorChange && (
        <Field label="Vendor">
          <select className={`${inputClass} w-56`} value={vendorId} onChange={(e) => onVendorChange(e.target.value)}>
            <option value="">{allLabel}</option>
            {[...vendors]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        </Field>
      )}
    </>
  );
}

export const periodLabel = ({ from, to }, formatDate) =>
  from && to ? `${formatDate(from)} – ${formatDate(to)}` : from ? `From ${formatDate(from)}` : to ? `Up to ${formatDate(to)}` : 'All dates';

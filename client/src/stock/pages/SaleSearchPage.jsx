import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useSalesStore } from '../useSalesStore';
import { formatCurrency, formatDate, toDateInput } from '../../utils/format';
import Field, { inputClass } from '../../components/common/Field';
import PageHeader from '../../components/common/PageHeader';
import PeriodFilters from '../components/PeriodFilters';
import { matchesQuery } from '../components/DayFinder';

const MAX_ROWS = 200;

export default function SaleSearchPage() {
  const { sales, customers, fetchSales } = useSalesStore();
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState({ from: '', to: '' });
  const [customerId, setCustomerId] = useState('');

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const found = sales
    .filter((s) => {
      const d = toDateInput(s.saleDate);
      return (
        (!period.from || d >= period.from) &&
        (!period.to || d <= period.to) &&
        (!customerId || s.customerId === customerId) &&
        matchesQuery(query, s.customerName, s.saleInvoiceNo, ...(s.items ?? []).map((l) => l.itemName))
      );
    })
    .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
  const total = found.reduce((sum, s) => sum + (s.amount ?? 0), 0);

  const customerOptions = [
    { value: '', label: 'All customers' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <>
      <PageHeader title="Sale Search" subtitle="Find a sale by customer, invoice no or product over any dates." />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Field label="Search" className="min-w-56 flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Customer, invoice no or product" autoFocus />
          </div>
        </Field>
        <Field label="Customer">
          <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <PeriodFilters period={period} onChange={setPeriod} />
      </div>

      <p className="text-sm text-slate-500">
        {found.length} sale{found.length === 1 ? '' : 's'} · {formatCurrency(total)}
        {found.length > MAX_ROWS && ` · showing the latest ${MAX_ROWS}`}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Products</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {found.slice(0, MAX_ROWS).map((s) => (
              <tr key={s.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{formatDate(s.saleDate)}</td>
                <td className="px-3 py-2 font-medium text-slate-900">{s.saleInvoiceNo}</td>
                <td className="px-3 py-2 text-slate-700">{s.customerName}</td>
                <td className="max-w-xs px-3 py-2 text-slate-600">{(s.items ?? []).map((l) => l.itemName).join(', ')}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(s.amount)}</td>
              </tr>
            ))}
            {!found.length && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No sales match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

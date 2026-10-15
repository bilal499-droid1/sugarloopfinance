import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Search } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatDate, toDateInput } from '../../utils/format';
import { itemDescription } from '../../utils/payment';
import Field, { inputClass } from '../../components/common/Field';
import PageHeader from '../../components/common/PageHeader';
import PaymentStatusBadge from '../../components/common/PaymentStatusBadge';
import PeriodFilters from '../components/PeriodFilters';
import { matchesQuery } from '../components/DayFinder';

const MAX_ROWS = 200;

// Purchase Search: find any bill by vendor, invoice no or product, over any dates.
export default function PurchaseSearchPage() {
  const records = useFinanceStore((s) => s.records);
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState({ from: '', to: '' });
  const [vendorId, setVendorId] = useState('');

  const found = records
    .filter((r) => {
      const d = toDateInput(r.receiptDate);
      return (
        (!period.from || d >= period.from) &&
        (!period.to || d <= period.to) &&
        (!vendorId || r.vendorId === vendorId) &&
        matchesQuery(query, r.vendorName, r.invoiceNumber, ...(r.items ?? []).map((l) => l.itemName))
      );
    })
    .sort((a, b) => new Date(b.receiptDate) - new Date(a.receiptDate));
  const total = found.reduce((sum, r) => sum + (r.status === 'FLAGGED' ? 0 : r.amount), 0);

  return (
    <>
      <PageHeader title="Purchase Search" subtitle="Find a bill by vendor, invoice no or product, over any dates." />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Field label="Search" className="min-w-56 flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-8`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Vendor, invoice no or product"
              autoFocus
            />
          </div>
        </Field>
        <PeriodFilters period={period} onChange={setPeriod} vendorId={vendorId} onVendorChange={setVendorId} />
      </div>

      <p className="text-sm text-slate-500">
        {found.length} bill{found.length === 1 ? '' : 's'} · {formatCurrency(total)}
        {found.length > MAX_ROWS && ` · showing the latest ${MAX_ROWS}`}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">Invoice No</th>
              <th className="px-3 py-2">Products</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {found.slice(0, MAX_ROWS).map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{formatDate(r.receiptDate)}</td>
                <td className="px-3 py-2 font-medium text-slate-900">{r.vendorName}</td>
                <td className="px-3 py-2 text-slate-600">{r.invoiceNumber || '—'}</td>
                <td className="max-w-xs px-3 py-2 text-slate-600">{itemDescription(r)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.amount, r.currency)}</td>
                <td className="px-3 py-2">
                  <PaymentStatusBadge record={r} />
                </td>
                <td className="px-3 py-2">
                  <Link to={`/invoices/${r.id}/print`} target="_blank" className="text-slate-500 hover:text-indigo-600" aria-label="Print bill">
                    <Printer className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {!found.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                  No bills match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

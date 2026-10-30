import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useSalesStore } from '../useSalesStore';
import { useCan } from '../../utils/permissions';
import { formatCurrency, today, toDateInput } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import SaleForm, { saleFromRecord } from '../components/SaleForm';
import DayFinder, { matchesQuery } from '../components/DayFinder';

export default function EditSalePage() {
  const { sales, fetchSales } = useSalesStore();
  const can = useCan();
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [savedId, setSavedId] = useState(null);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const daySales = sales.filter(
    (s) => toDateInput(s.saleDate) === date && s.items?.length && matchesQuery(query, s.customerName, s.saleInvoiceNo)
  );
  const selected = sales.find((s) => s.id === selectedId);

  const pick = (id) => { setSelectedId(id); setSavedId(null); };
  const changeDate = (d) => { setDate(d); pick(null); };
  const onSaved = (record) => { pick(null); setSavedId(record.id); setDate(toDateInput(record.saleDate)); };

  if (!can('editInvoice')) {
    return (
      <>
        <PageHeader title="Edit Sale" />
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Only managers and admins can edit sales.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Edit Sale" subtitle="Select the date, find the sale, then correct it." />
      <DayFinder date={date} onDateChange={changeDate} query={query} onQueryChange={setQuery} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Products</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {daySales.map((s) => (
              <tr key={s.id} onClick={() => pick(s.id)} className={`cursor-pointer border-t border-slate-100 ${s.id === selectedId ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                <td className="px-3 py-2 font-medium text-slate-900">{s.saleInvoiceNo}</td>
                <td className="px-3 py-2 text-slate-700">{s.customerName}</td>
                <td className="px-3 py-2 text-slate-600">{s.items.length}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(s.amount)}</td>
              </tr>
            ))}
            {!daySales.length && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No sales on this date{query && ' matching the search'}.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {savedId && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" /> Changes saved.
        </p>
      )}

      {selected && (
        <div className="space-y-2">
          <h2 className="font-medium text-slate-900">Editing {selected.saleInvoiceNo} · {selected.customerName}</h2>
          <SaleForm key={selected.id} sale={selected} initial={saleFromRecord(selected)} onSaved={onSaved} onCancel={() => pick(null)} />
        </div>
      )}
    </>
  );
}

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useCan } from '../../utils/permissions';
import { formatCurrency, today, toDateInput } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import PaymentStatusBadge from '../../components/common/PaymentStatusBadge';
import PurchaseForm, { purchaseFromRecord } from '../components/PurchaseForm';
import DayFinder, { matchesQuery } from '../components/DayFinder';

// Edit Purchase: pick the bill's date, find it by vendor, and it opens back in the
// purchase form to correct (e.g. the total didn't match the paper bill).
export default function EditPurchasePage() {
  const records = useFinanceStore((s) => s.records);
  const can = useCan();
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const dayBills = records.filter(
    (r) => toDateInput(r.receiptDate) === date && r.items?.length && matchesQuery(query, r.vendorName, r.invoiceNumber)
  );
  const selected = records.find((r) => r.id === selectedId);

  const pick = (id) => {
    setSelectedId(id);
    setSavedId(null);
  };

  const changeDate = (d) => {
    setDate(d);
    pick(null);
  };

  const onSaved = (record) => {
    pick(null);
    setSavedId(record.id);
    setDate(toDateInput(record.receiptDate));
  };

  if (!can('editInvoice')) {
    return (
      <>
        <PageHeader title="Edit Purchase" />
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Only managers and admins can edit purchases.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Edit Purchase" subtitle="Select the date, find the bill, then correct it." />
      <DayFinder date={date} onDateChange={changeDate} query={query} onQueryChange={setQuery} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">Invoice No</th>
              <th className="px-3 py-2">Products</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {dayBills.map((r) => (
              <tr
                key={r.id}
                onClick={() => pick(r.id)}
                className={`cursor-pointer border-t border-slate-100 ${r.id === selectedId ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <td className="px-3 py-2 font-medium text-slate-900">{r.vendorName}</td>
                <td className="px-3 py-2 text-slate-600">{r.invoiceNumber || '—'}</td>
                <td className="px-3 py-2 text-slate-600">{r.items.length}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.amount, r.currency)}</td>
                <td className="px-3 py-2">
                  <PaymentStatusBadge record={r} />
                </td>
              </tr>
            ))}
            {!dayBills.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  No purchases on this date{query && ' matching the search'}.
                </td>
              </tr>
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
          <h2 className="font-medium text-slate-900">
            Editing {selected.vendorName} {selected.invoiceNumber && `· ${selected.invoiceNumber}`}
          </h2>
          <PurchaseForm
            key={selected.id}
            record={selected}
            initial={purchaseFromRecord(selected)}
            onSaved={onSaved}
            onCancel={() => pick(null)}
          />
        </div>
      )}
    </>
  );
}

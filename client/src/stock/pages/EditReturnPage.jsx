import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { errorMessage } from '../../api/client';
import { useCan } from '../../utils/permissions';
import { formatCurrency, today, toDateInput } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import { buttonClass } from '../../components/common/Field';
import ConfirmButton from '../../components/common/ConfirmButton';
import ReturnForm, { returnFromSaved } from '../components/ReturnForm';
import DayFinder, { matchesQuery } from '../components/DayFinder';
import { useReturnsStore } from '../useReturnsStore';

// Edit Pur Return: same steps as Edit Purchase, for returns already entered.
export default function EditReturnPage() {
  const returns = useReturnsStore((s) => s.returns);
  const deleteReturn = useReturnsStore((s) => s.deleteReturn);
  const can = useCan();
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const dayReturns = returns.filter(
    (r) => toDateInput(r.returnDate) === date && matchesQuery(query, r.vendorName, r.returnNo, r.invoiceNumber)
  );
  const selected = returns.find((r) => r.id === selectedId);

  const pick = (id) => {
    setSelectedId(id);
    setMessage('');
    setError('');
  };

  const changeDate = (d) => {
    setDate(d);
    pick(null);
  };

  const onSaved = (ret) => {
    pick(null);
    setDate(toDateInput(ret.returnDate));
    setMessage('Changes saved.');
  };

  const remove = async () => {
    try {
      await deleteReturn(selected.id);
      pick(null);
      setMessage('Return deleted. Its products were put back into stock.');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!can('editInvoice')) {
    return (
      <>
        <PageHeader title="Edit Pur Return" />
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Only managers and admins can edit purchase returns.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Edit Pur Return" subtitle="Select the date, find the return, then correct it." />
      <DayFinder date={date} onDateChange={changeDate} query={query} onQueryChange={setQuery} placeholder="Vendor, return no or invoice no" />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">Return No</th>
              <th className="px-3 py-2">Against bill</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {dayReturns.map((r) => (
              <tr
                key={r.id}
                onClick={() => pick(r.id)}
                className={`cursor-pointer border-t border-slate-100 ${r.id === selectedId ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <td className="px-3 py-2 font-medium text-slate-900">{r.vendorName}</td>
                <td className="px-3 py-2 text-slate-600">{r.returnNo}</td>
                <td className="px-3 py-2 text-slate-600">{r.invoiceNumber || (r.recordId ? 'Yes' : '—')}</td>
                <td className="px-3 py-2 text-slate-600">{r.reason || '—'}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.amount, r.currency)}</td>
              </tr>
            ))}
            {!dayReturns.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  No returns on this date{query && ' matching the search'}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {message && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" /> {message}
        </p>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {selected && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium text-slate-900">
              Editing {selected.returnNo} · {selected.vendorName}
            </h2>
            {can('deleteInvoice') && (
              <ConfirmButton
                onConfirm={remove}
                className={buttonClass.danger}
                title="Delete this return?"
                message={`${selected.returnNo} will be deleted and its products put back into warehouse stock.`}
              >
                Delete return
              </ConfirmButton>
            )}
          </div>
          <ReturnForm key={selected.id} saved={selected} initial={returnFromSaved(selected)} onSaved={onSaved} onCancel={() => pick(null)} />
        </div>
      )}
    </>
  );
}

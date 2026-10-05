import { useState } from 'react';
import { Wallet, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { errorMessage } from '../../api/client';
import { useCan } from '../../utils/permissions';
import { formatCurrency, formatDate, today, PAYMENT_METHODS } from '../../utils/format';

// Payment history for a bill + form to record a (partial) payment.
export default function PaymentsPanel({ record }) {
  const can = useCan();
  const addPayment = useFinanceStore((s) => s.addPayment);
  const deletePayment = useFinanceStore((s) => s.deletePayment);
  const [form, setForm] = useState({ amount: '', date: today(), method: 'BANK', reference: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const balance = record.balance ?? record.amount - record.amountPaid;
  const input = 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await addPayment(record.id, { ...form, amount: Number(form.amount) });
      setForm({ ...form, amount: '', reference: '' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-medium text-slate-900">
          <Wallet className="h-4 w-4" /> Payments
        </h3>
        <span className="text-xs text-slate-500">
          Paid {formatCurrency(record.amountPaid, record.currency)} ·{' '}
          <span className={balance > 0 ? 'font-medium text-amber-700' : 'font-medium text-emerald-700'}>
            {balance > 0 ? `Balance ${formatCurrency(balance, record.currency)}` : `Cleared ${formatDate(record.clearedAt)}`}
          </span>
        </span>
      </div>

      {record.payments?.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {record.payments.map((p) => (
            <li key={p._id} className="flex items-center justify-between gap-2 py-1.5">
              <span>
                <span className="font-medium">{formatCurrency(p.amount, record.currency)}</span>{' '}
                <span className="text-slate-500">
                  · {formatDate(p.date)} · {p.method}
                  {p.reference && ` · ${p.reference}`} · by {p.recordedBy}
                </span>
              </span>
              {can('deletePayment') && (
                <button onClick={() => deletePayment(record.id, p._id).catch((err) => setError(errorMessage(err)))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete payment">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {can('recordPayment') && !record.flagged && balance > 0 && (
        <form onSubmit={submit} className="grid grid-cols-2 gap-2">
          <input type="number" min="0.01" step="any" required placeholder={`Amount (max ${balance})`} className={input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input type="date" required className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select className={input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input placeholder="Reference / cheque #" className={input} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <button disabled={busy} className="col-span-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
            Record payment
          </button>
        </form>
      )}
      {error && <p className="text-rose-600">{error}</p>}
    </div>
  );
}

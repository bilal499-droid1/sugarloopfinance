import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import api, { errorMessage } from '../../api/client';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useCan } from '../../utils/permissions';
import { formatDateTime, formatNumber } from '../../utils/format';
import { buttonClass } from '../../components/common/Field';
import PageHeader from '../../components/common/PageHeader';
import { useReturnsStore } from '../useReturnsStore';

// Stock Refresh: reload everything and recount each item's in-hand quantity from
// its stock history; a manager can fix any item that doesn't match.
export default function StockRefreshPage() {
  const can = useCan();
  const [rows, setRows] = useState([]);
  const [checkedAt, setCheckedAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const check = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [{ data }] = await Promise.all([
        api.get('/stock/check'),
        useFinanceStore.getState().refreshAll(),
        useReturnsStore.getState().fetchReturns(),
      ]);
      setRows(data);
      setCheckedAt(new Date());
    } catch (err) {
      setError(errorMessage(err, 'Could not refresh stock'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const fix = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/stock/refresh');
      setMessage(`Corrected ${data.fixed.length} item${data.fixed.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(errorMessage(err, 'Could not fix stock'));
    } finally {
      setBusy(false);
    }
    await check();
  };

  const mismatched = rows.filter((r) => r.difference);

  return (
    <>
      <PageHeader
        title="Stock Refresh"
        subtitle="Reloads all data and recounts warehouse stock from its history."
        actions={
          <button onClick={() => { setMessage(''); check(); }} disabled={busy} className={`${buttonClass.secondary} inline-flex items-center gap-1.5`}>
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      {message && <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p>}

      {checkedAt &&
        (mismatched.length ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              {mismatched.length} item{mismatched.length === 1 ? ' does' : 's do'} not match the stock history.
            </span>
            {can('adjustStock') ? (
              <button onClick={fix} disabled={busy} className={`${buttonClass.primary} ml-auto`}>
                Fix stock
              </button>
            ) : (
              <span className="ml-auto">Ask a manager to fix it.</span>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5" /> All {rows.length} items match their history · checked {formatDateTime(checkedAt)}
          </p>
        ))}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">In hand</th>
              <th className="px-3 py-2 text-right">From history</th>
              <th className="px-3 py-2 text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.itemId} className={`border-t border-slate-100 ${r.difference ? 'bg-amber-50' : ''}`}>
                <td className="px-3 py-2 font-medium text-slate-900">
                  {r.name}
                  {r.isLowStock && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Low</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatNumber(r.inHand)} {r.unit}
                </td>
                <td className="px-3 py-2 text-right text-slate-600">
                  {formatNumber(r.counted)} {r.unit}
                </td>
                <td className={`px-3 py-2 text-right ${r.difference ? 'font-medium text-amber-800' : 'text-slate-400'}`}>
                  {r.difference ? `${r.difference > 0 ? '+' : ''}${formatNumber(r.difference)}` : '—'}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                  {busy ? 'Checking…' : 'No items yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

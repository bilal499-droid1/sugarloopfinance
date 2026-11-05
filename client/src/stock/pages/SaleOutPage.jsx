import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SALEOUT_CATALOG, ALL_ITEMS } from '../catalog/saleOutCatalog';
import { useSaleOutStore } from '../useSaleOutStore';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

const blankQtys = () => Object.fromEntries(ALL_ITEMS.map((it) => [it.name, '']));

const CATEGORY_SPAN = Object.fromEntries(
  SALEOUT_CATALOG.map((cat) => [cat.category, cat.items.length])
);

export default function SaleOutPage() {
  const createRecord = useSaleOutStore((s) => s.createRecord);

  const [saleDate, setSaleDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [qtys, setQtys] = useState(blankQtys());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  const setQty = (name, val) => {
    const n = val === '' ? '' : Math.max(0, Number(val));
    setQtys((prev) => ({ ...prev, [name]: n }));
  };

  const grandTotal = ALL_ITEMS.reduce((sum, it) => {
    const q = Number(qtys[it.name]) || 0;
    return sum + q * it.price;
  }, 0);

  const handleSave = async () => {
    setError(null);
    const lines = ALL_ITEMS.filter((it) => Number(qtys[it.name]) > 0).map((it) => ({
      category: it.category,
      itemName: it.name,
      unit: it.unit,
      qty: Number(qtys[it.name]),
      price: it.price,
    }));

    if (!lines.length) {
      setError('Enter at least one item with qty > 0.');
      return;
    }

    setSaving(true);
    try {
      const record = await createRecord({ saleDate, lines, notes });
      setSaved(record);
      setQtys(blankQtys());
      setNotes('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Sale Out" subtitle="Record daily retail sales by product." />

      {saved && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            <strong>{saved.entryNo}</strong> saved — {formatCurrency(saved.grandTotal)}
          </span>
          <button className="ml-auto text-xs underline" onClick={() => setSaved(null)}>Dismiss</button>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="flex-1 min-w-48">
          <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning shift"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Entry table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-amber-500 text-white text-xs uppercase">
              <th className="w-28 px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Item Name</th>
              <th className="w-16 px-3 py-2 text-center">Unit</th>
              <th className="w-24 px-3 py-2 text-center">Qty</th>
              <th className="w-24 px-3 py-2 text-right">Price</th>
              <th className="w-28 px-3 py-2 text-right">Daily Total</th>
            </tr>
          </thead>
          <tbody>
            {SALEOUT_CATALOG.map((cat) =>
              cat.items.map((item, idx) => {
                const qty = Number(qtys[item.name]) || 0;
                const total = qty * item.price;
                return (
                  <tr key={item.name} className={`border-t border-slate-100 ${cat.colorClass}`}>
                    {idx === 0 && (
                      <td
                        rowSpan={cat.items.length}
                        className={`px-3 py-2 text-xs font-semibold text-center align-middle border-r border-slate-200 ${cat.headerClass}`}
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
                      >
                        {cat.category}
                      </td>
                    )}
                    <td className="px-3 py-1.5">{item.name}</td>
                    <td className="px-3 py-1.5 text-center text-slate-500">per</td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="number"
                        min="0"
                        value={qtys[item.name]}
                        onChange={(e) => setQty(item.name, e.target.value)}
                        className="w-20 rounded border border-slate-300 px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">
                      {item.price.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                      {total > 0 ? formatCurrency(total) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-green-100 font-semibold">
              <td colSpan={5} className="px-3 py-2 text-right text-sm">Grand Total</td>
              <td className="px-3 py-2 text-right tabular-nums text-green-800">{formatCurrency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Entry'}
        </button>
      </div>
    </>
  );
}

import { Fragment, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useSaleOutStore } from '../useSaleOutStore';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

let _rowId = 0;
const newRow = () => ({ id: ++_rowId, name: '', price: '', dispatched: '', received: '' });

export default function DispatchSheetForm({ catalog, allItems, type }) {
  const createRecord = useSaleOutStore((s) => s.createRecord);

  const blankQtys = () => Object.fromEntries(allItems.map((it) => [it.name, '']));
  const blankPrices = () => Object.fromEntries(allItems.map((it) => [it.name, it.price]));
  const blankCustomRows = () => Object.fromEntries(catalog.map((cat) => [cat.category, []]));

  const [saleDate, setSaleDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [dispatched, setDispatched] = useState(blankQtys);
  const [received, setReceived] = useState(blankQtys);
  const [prices, setPrices] = useState(blankPrices);
  const [customRows, setCustomRows] = useState(blankCustomRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  const setDispatchedQty = (name, val) => {
    const n = val === '' ? '' : Math.max(0, Number(val));
    setDispatched((prev) => ({ ...prev, [name]: n }));
  };

  const setReceivedQty = (name, val) => {
    const n = val === '' ? '' : Math.max(0, Number(val));
    setReceived((prev) => ({ ...prev, [name]: n }));
  };

  const setItemPrice = (name, val) => {
    const n = val === '' ? '' : Math.max(0, Number(val));
    setPrices((prev) => ({ ...prev, [name]: n }));
  };

  const addCustomRow = (category) =>
    setCustomRows((prev) => ({ ...prev, [category]: [...prev[category], newRow()] }));

  const removeCustomRow = (category, id) =>
    setCustomRows((prev) => ({ ...prev, [category]: prev[category].filter((r) => r.id !== id) }));

  const updateCustomRow = (category, id, field, val) =>
    setCustomRows((prev) => ({
      ...prev,
      [category]: prev[category].map((r) => (r.id === id ? { ...r, [field]: val } : r)),
    }));

  const grandTotal =
    allItems.reduce((sum, it) => {
      return sum + (Number(dispatched[it.name]) || 0) * (Number(prices[it.name]) || it.price);
    }, 0) +
    catalog.reduce((sum, cat) => {
      return (
        sum +
        customRows[cat.category].reduce(
          (s, r) => s + (Number(r.dispatched) || 0) * (Number(r.price) || 0),
          0
        )
      );
    }, 0);

  const handleSave = async () => {
    setError(null);

    const catalogLines = allItems
      .filter((it) => Number(dispatched[it.name]) > 0)
      .map((it) => ({
        category: it.category,
        itemName: it.name,
        unit: 'per',
        qty: Number(dispatched[it.name]),
        received: Number(received[it.name]) || 0,
        price: Number(prices[it.name]) || it.price,
      }));

    const customLines = catalog.flatMap((cat) =>
      customRows[cat.category]
        .filter((r) => r.name.trim() && Number(r.dispatched) > 0)
        .map((r) => ({
          category: cat.category,
          itemName: r.name.trim(),
          unit: 'per',
          qty: Number(r.dispatched),
          received: Number(r.received) || 0,
          price: Number(r.price) || 0,
        }))
    );

    const lines = [...catalogLines, ...customLines];
    if (!lines.length) {
      setError('Enter at least one item with qty > 0.');
      return;
    }

    setSaving(true);
    try {
      const record = await createRecord({ saleDate, lines, notes, type });
      setSaved(record);
      setDispatched(blankQtys());
      setReceived(blankQtys());
      setPrices(blankPrices());
      setCustomRows(blankCustomRows());
      setNotes('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  let serial = 0;

  return (
    <>
      <PageHeader title="Dispatch & Wastage Sheet" subtitle="Record daily dispatch, received, and wastage by product." />

      {saved && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            <strong>{saved.entryNo}</strong> saved — {formatCurrency(saved.grandTotal)}
          </span>
          <button className="ml-auto text-xs underline" onClick={() => setSaved(null)}>
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
      )}

      {/* Date + Notes */}
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
          <tbody>
            {catalog.map((cat) => (
              <Fragment key={cat.category}>
                {/* Category header */}
                <tr className={cat.headerClass}>
                  <th colSpan={7} className="px-3 py-2 text-center text-sm font-bold uppercase tracking-wide">
                    {cat.category}
                  </th>
                </tr>
                {/* Column sub-header */}
                <tr className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase">
                  <th className="w-10 px-3 py-1.5 text-center border-r border-slate-200">#</th>
                  <th className="px-3 py-1.5 text-left">Item Name</th>
                  <th className="w-28 px-3 py-1.5 text-center">Dispatched</th>
                  <th className="w-28 px-3 py-1.5 text-center">Received</th>
                  <th className="w-28 px-3 py-1.5 text-right">Price</th>
                  <th className="w-28 px-3 py-1.5 text-right">Daily Total</th>
                  <th className="w-10 px-3 py-1.5" />
                </tr>

                {/* Catalog item rows */}
                {cat.items.map((item) => {
                  serial++;
                  const qty = Number(dispatched[item.name]) || 0;
                  const price = Number(prices[item.name]) || item.price;
                  const total = qty * price;
                  return (
                    <tr key={item.name} className={`border-t border-slate-100 ${cat.colorClass}`}>
                      <td className="px-3 py-1.5 text-center text-slate-400 text-xs border-r border-slate-200">
                        {serial}
                      </td>
                      <td className="px-3 py-1.5">{item.name}</td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={dispatched[item.name]}
                          onChange={(e) => setDispatchedQty(item.name, e.target.value)}
                          className="w-20 rounded border border-slate-300 px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={received[item.name]}
                          onChange={(e) => setReceivedQty(item.name, e.target.value)}
                          className="w-20 rounded border border-slate-300 px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          value={prices[item.name]}
                          onChange={(e) => setItemPrice(item.name, e.target.value)}
                          className="w-24 rounded border border-slate-300 px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                        {total > 0 ? formatCurrency(total) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-1.5" />
                    </tr>
                  );
                })}

                {/* Custom item rows */}
                {customRows[cat.category].map((row) => {
                  serial++;
                  const qty = Number(row.dispatched) || 0;
                  const price = Number(row.price) || 0;
                  const total = qty * price;
                  return (
                    <tr key={row.id} className={`border-t border-slate-100 ${cat.colorClass}`}>
                      <td className="px-3 py-1.5 text-center text-slate-400 text-xs border-r border-slate-200">
                        {serial}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={row.name}
                          placeholder="Item name"
                          onChange={(e) => updateCustomRow(cat.category, row.id, 'name', e.target.value)}
                          className="w-full rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.dispatched}
                          placeholder="0"
                          onChange={(e) => updateCustomRow(cat.category, row.id, 'dispatched', e.target.value)}
                          className="w-20 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.received}
                          placeholder="0"
                          onChange={(e) => updateCustomRow(cat.category, row.id, 'received', e.target.value)}
                          className="w-20 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          value={row.price}
                          placeholder="0"
                          onChange={(e) => updateCustomRow(cat.category, row.id, 'price', e.target.value)}
                          className="w-24 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                        {total > 0 ? formatCurrency(total) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => removeCustomRow(cat.category, row.id)}
                          className="text-rose-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Add item */}
                <tr className={`border-t border-dashed border-slate-200 ${cat.colorClass}`}>
                  <td colSpan={7} className="px-3 py-1.5">
                    <button
                      onClick={() => addCustomRow(cat.category)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add item
                    </button>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-green-100 font-semibold">
              <td colSpan={5} className="px-3 py-2 text-right text-sm">Grand Total</td>
              <td className="px-3 py-2 text-right tabular-nums text-green-800">{formatCurrency(grandTotal)}</td>
              <td />
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

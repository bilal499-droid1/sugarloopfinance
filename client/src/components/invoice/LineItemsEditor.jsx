import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useFinanceStore, findPreviousPrice } from '../../store/useFinanceStore';
import { formatCurrency, formatNumber } from '../../utils/format';
import PriceChange from '../common/PriceChange';

export const emptyLine = () => ({ itemId: '', quantity: '', unitPrice: '' });
export const lineAmount = (line) => Math.round((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) * 100) / 100;
export const linesTotal = (lines) => lines.reduce((sum, line) => sum + lineAmount(line), 0);

// Editable invoice lines: item (from catalog) · in hand · qty · unit price · amount · price change.
// Typing an amount back-calculates the unit price.
export default function LineItemsEditor({ lines, onChange, vendorId, receiptDate, excludeId, currency = 'PKR', readOnly = false, allowAdd = true }) {
  const items = useFinanceStore((s) => s.items);
  const records = useFinanceStore((s) => s.records);
  const itemById = new Map(items.map((i) => [i.id, i]));

  const update = (index, patch) => onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const remove = (index) => onChange(lines.filter((_, i) => i !== index));

  const setAmount = (index, value) => {
    const qty = Number(lines[index].quantity);
    if (qty > 0) update(index, { unitPrice: value === '' ? '' : Math.round((Number(value) / qty) * 10000) / 10000 });
  };

  const cell = 'w-full min-w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:border-transparent disabled:bg-transparent';

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
          <tr>
            <th className="px-2 py-2">Item</th>
            <th className="px-2 py-2">In hand</th>
            <th className="w-24 px-2 py-2">Qty</th>
            <th className="w-28 px-2 py-2">Unit price</th>
            <th className="w-32 px-2 py-2">Amount</th>
            <th className="px-2 py-2">vs last price</th>
            {!readOnly && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const item = itemById.get(line.itemId);
            const previous =
              line.previousUnitPrice ??
              (line.itemId && vendorId
                ? findPreviousPrice(records, { vendorId, itemId: line.itemId, beforeDate: receiptDate, excludeId })
                : undefined);

            return (
              <tr key={index} className="border-t border-slate-100 align-top">
                <td className="min-w-44 px-2 py-1.5">
                  <select
                    className={cell}
                    value={line.itemId}
                    disabled={readOnly}
                    onChange={(e) => update(index, { itemId: e.target.value, previousUnitPrice: undefined })}
                  >
                    <option value="">Select item…</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap">
                  {item ? (
                    <span className={`inline-flex items-center gap-1 ${item.isLowStock ? 'font-medium text-amber-700' : 'text-slate-600'}`}>
                      {item.isLowStock && <AlertTriangle className="h-3.5 w-3.5" />}
                      {formatNumber(item.inHand)} {item.unit}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min="0" step="any" className={cell} value={line.quantity} disabled={readOnly} onChange={(e) => update(index, { quantity: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min="0" step="any" className={cell} value={line.unitPrice} disabled={readOnly} onChange={(e) => update(index, { unitPrice: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={cell}
                    value={line.quantity && line.unitPrice !== '' ? lineAmount(line) : ''}
                    disabled={readOnly || !(Number(line.quantity) > 0)}
                    title="Type the line total to calculate the unit price"
                    onChange={(e) => setAmount(index, e.target.value)}
                  />
                </td>
                <td className="px-2 py-2.5">
                  {line.itemId && line.unitPrice !== '' ? <PriceChange current={line.unitPrice} previous={previous} /> : null}
                </td>
                {!readOnly && (
                  <td className="px-1 py-1.5">
                    <button type="button" onClick={() => remove(index)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove line">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
          {!lines.length && (
            <tr>
              <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                No line items.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-slate-50">
            <td colSpan={4} className="px-2 py-2">
              {!readOnly && allowAdd && (
                <button type="button" onClick={() => onChange([...lines, emptyLine()])} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  <Plus className="h-4 w-4" /> Add item
                </button>
              )}
            </td>
            <td colSpan={3} className="px-2 py-2 text-right font-semibold text-slate-900">
              Total: {formatCurrency(linesTotal(lines), currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

import { Plus, Trash2 } from 'lucide-react';
import { useFinanceStore, findPreviousPrice } from '../../store/useFinanceStore';
import { formatNumber } from '../../utils/format';
import { emptyLine, lineAmount } from '../invoice/LineItemsEditor';
import PriceChange from '../common/PriceChange';
import ItemCombobox from '../common/ItemCombobox';

// Compact, stacked version of LineItemsEditor for the narrow Upload Bill form:
// item · qty · unit price · amount per line, with the change vs this
// vendor's previous price for the item (when the vendor is already known).
export default function QuickItemsEditor({ lines, onChange, vendorId, receiptDate }) {
  const items = useFinanceStore((s) => s.items);
  const records = useFinanceStore((s) => s.records);
  const itemById = new Map(items.map((i) => [i.id, i]));

  const update = (index, patch) => onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const remove = (index) => onChange(lines.filter((_, i) => i !== index));
  const setAmount = (index, value) => {
    const qty = Number(lines[index].quantity);
    if (qty > 0) update(index, { unitPrice: value === '' ? '' : Math.round((Number(value) / qty) * 10000) / 10000 });
  };
  const input = 'mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm';

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const item = itemById.get(line.itemId);
        const previous = line.itemId && vendorId ? findPreviousPrice(records, { vendorId, itemId: line.itemId, beforeDate: receiptDate }) : undefined;
        return (
          <div key={index} className="space-y-1.5 rounded-md border border-slate-200 p-2">
            <div className="flex gap-1.5">
              <ItemCombobox
                itemId={line.itemId}
                onChange={(id) => update(index, { itemId: id })}
                className={`${input} mt-0 flex-1`}
              />
              <button type="button" onClick={() => remove(index)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove item">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs text-slate-500">
              <label>
                Qty{item?.unit && ` (${item.unit})`}
                <input type="number" min="0" step="any" inputMode="decimal" className={input} value={line.quantity} onChange={(e) => update(index, { quantity: e.target.value })} />
              </label>
              <label>
                Unit price
                <input type="number" min="0" step="any" inputMode="decimal" className={input} value={line.unitPrice} onChange={(e) => update(index, { unitPrice: e.target.value })} />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  className={input}
                  value={line.quantity && line.unitPrice !== '' ? lineAmount(line) : ''}
                  disabled={!(Number(line.quantity) > 0)}
                  title="Type the line total to calculate the unit price"
                  onChange={(e) => setAmount(index, e.target.value)}
                />
              </label>
            </div>
            {(item || (line.itemId && vendorId && line.unitPrice !== '')) && (
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-500">
                <span>{item ? `In hand ${formatNumber(item.inHand)} ${item.unit}` : ' '}</span>
                <span className="flex items-center gap-2">
                  {line.itemId && vendorId && line.unitPrice !== '' && <PriceChange current={line.unitPrice} previous={previous} />}
                </span>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...lines, emptyLine()])} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        <Plus className="h-4 w-4" /> Add item
      </button>
    </div>
  );
}

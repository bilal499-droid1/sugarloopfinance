import { useMemo, useState } from 'react';
import { Plus, Search, Send, SlidersHorizontal, History, Pencil, AlertTriangle } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { errorMessage } from '../api/client';
import { useCan } from '../utils/permissions';
import { formatNumber } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import ConfirmButton from '../components/common/ConfirmButton';
import { buttonClass } from '../components/common/Field';
import ItemFormModal from '../components/inventory/ItemFormModal';
import StockActionModal from '../components/inventory/StockActionModal';
import ItemHistoryModal from '../components/inventory/ItemHistoryModal';

// Central warehouse stock: item catalog, in-hand quantities, transfers and adjustments.
export default function InventoryPage() {
  const items = useFinanceStore((s) => s.items);
  const deleteItem = useFinanceStore((s) => s.deleteItem);
  const can = useCan();
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [modal, setModal] = useState(null); // { type, item }
  const [error, setError] = useState('');

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((i) => (!lowOnly || i.isLowStock) && (!q || i.name.toLowerCase().includes(q)));
  }, [items, query, lowOnly]);
  const lowCount = items.filter((i) => i.isLowStock).length;
  const iconButton = 'rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900';

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Central warehouse stock in hand. Verified vendor invoices add stock; branch transfers remove it."
        actions={
          can('manageItems') && (
            <button onClick={() => setModal({ type: 'item' })} className={`${buttonClass.primary} inline-flex items-center gap-1.5`}>
              <Plus className="h-4 w-4" /> Add item
            </button>
          )
        }
      />
      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 p-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-2 left-2 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items" className="w-full rounded-md border border-slate-300 py-1.5 pr-3 pl-8 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
            Low stock only ({lowCount})
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2 text-right">In hand</th>
                <th className="px-4 py-2 text-right">Reorder level</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className={`border-t border-slate-100 hover:bg-slate-50 ${item.isLowStock ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-900">{item.name}</div>
                    {item.notes && <div className="text-xs text-slate-400">{item.notes}</div>}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                    {formatNumber(item.inHand)} {item.unit}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-500 tabular-nums">
                    {item.reorderLevel ? `${formatNumber(item.reorderLevel)} ${item.unit}` : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {item.isLowStock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> Low stock
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setModal({ type: 'history', item })} className={iconButton} title="Stock log & price history">
                      <History className="h-4 w-4" />
                    </button>
                    {can('transferStock') && (
                      <button onClick={() => setModal({ type: 'transfer', item })} disabled={item.inHand <= 0} className={`${iconButton} disabled:opacity-30`} title="Transfer to branch">
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    {can('adjustStock') && (
                      <button onClick={() => setModal({ type: 'adjust', item })} className={iconButton} title="Adjust stock count">
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>
                    )}
                    {can('manageItems') && (
                      <button onClick={() => setModal({ type: 'item', item })} className={iconButton} title="Edit item">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {can('deleteItem') && (
                      <ConfirmButton onConfirm={() => deleteItem(item.id).catch((err) => setError(errorMessage(err)))} title="Delete this item?" message={`${item.name} will be removed from the catalog.`} className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                        Delete
                      </ConfirmButton>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.type === 'item' && <ItemFormModal item={modal.item} onClose={() => setModal(null)} />}
      {(modal?.type === 'transfer' || modal?.type === 'adjust') && <StockActionModal item={modal.item} mode={modal.type} onClose={() => setModal(null)} />}
      {modal?.type === 'history' && <ItemHistoryModal item={modal.item} onClose={() => setModal(null)} />}
    </>
  );
}

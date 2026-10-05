import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../utils/format';
import Modal from '../common/Modal';
import PriceChange from '../common/PriceChange';

const MOVEMENT_LABELS = {
  RECEIPT_IN: ['Received', 'text-emerald-700'],
  RECEIPT_REVERSAL: ['Receipt reversed', 'text-rose-700'],
  TRANSFER_OUT: ['Sent to branch', 'text-indigo-700'],
  ADJUSTMENT: ['Adjustment', 'text-amber-700'],
};

// Stock movement log + unit-price history for one item.
export default function ItemHistoryModal({ item, onClose }) {
  const [tab, setTab] = useState('stock');
  const [movements, setMovements] = useState(null);
  const [prices, setPrices] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get(`/stock/movements?itemId=${item.id}`), api.get(`/items/${item.id}/prices`)])
      .then(([m, p]) => {
        setMovements(m.data);
        setPrices(p.data);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [item.id]);

  // Compare each purchase with the same vendor's previous price for this item.
  const priceRows = (prices ?? [])
    .map((row, i, all) => ({
      ...row,
      previous: all
        .slice(0, i)
        .reverse()
        .find((p) => p.vendorId === row.vendorId)?.unitPrice,
    }))
    .reverse();

  const tabClass = (active) => `rounded-md px-3 py-1.5 text-sm font-medium ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`;

  return (
    <Modal title={`${item.name} — ${formatNumber(item.inHand)} ${item.unit} in hand`} onClose={onClose} width="max-w-3xl">
      <div className="mb-3 flex gap-2">
        <button className={tabClass(tab === 'stock')} onClick={() => setTab('stock')}>
          Stock log
        </button>
        <button className={tabClass(tab === 'prices')} onClick={() => setTab('prices')}>
          Price history
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!movements && !error && <p className="text-sm text-slate-500">Loading…</p>}

      {movements && tab === 'stock' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="py-1.5">When</th>
                <th className="py-1.5">Type</th>
                <th className="py-1.5 text-right">Change</th>
                <th className="py-1.5 text-right">After</th>
                <th className="py-1.5">Details</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const [label, tone] = MOVEMENT_LABELS[m.type] ?? [m.type, ''];
                return (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="py-1.5 whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                    <td className={`py-1.5 ${tone}`}>{label}</td>
                    <td className={`py-1.5 text-right tabular-nums ${m.change > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {m.change > 0 ? '+' : ''}
                      {formatNumber(m.change)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{formatNumber(m.after)}</td>
                    <td className="py-1.5 text-xs text-slate-500">
                      {[m.branch && `→ ${m.branch}`, m.reason, m.userName && `by ${m.userName}`].filter(Boolean).join(' · ')}
                    </td>
                  </tr>
                );
              })}
              {!movements.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    No stock movements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {prices && tab === 'prices' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="py-1.5">Date</th>
                <th className="py-1.5">Vendor</th>
                <th className="py-1.5">Invoice</th>
                <th className="py-1.5 text-right">Qty</th>
                <th className="py-1.5 text-right">Unit price</th>
                <th className="py-1.5">vs vendor's previous</th>
              </tr>
            </thead>
            <tbody>
              {priceRows.map((p) => (
                <tr key={`${p.recordId}-${p.unitPrice}-${p.quantity}`} className="border-t border-slate-100">
                  <td className="py-1.5 whitespace-nowrap">{formatDate(p.date)}</td>
                  <td className="py-1.5">{p.vendorName}</td>
                  <td className="py-1.5 text-slate-500">{p.purchaseInvoiceNo}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatNumber(p.quantity)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(p.unitPrice)}</td>
                  <td className="py-1.5">
                    <PriceChange current={p.unitPrice} previous={p.previous} />
                  </td>
                </tr>
              ))}
              {!priceRows.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    Not purchased yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

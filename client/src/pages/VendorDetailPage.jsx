import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Phone, Mail, MapPin, User, FilePlus2, DollarSign, CheckCircle2, Wallet, ShieldCheck } from 'lucide-react';
import { useFinanceStore, useVisibleRecords } from '../store/useFinanceStore';
import { useCan } from '../utils/permissions';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import CategoryBadge from '../components/common/CategoryBadge';
import PriceChange from '../components/common/PriceChange';
import StatCard from '../components/dashboard/StatCard';
import { buttonClass } from '../components/common/Field';
import DateRangeFilter from '../components/filters/DateRangeFilter';
import LedgerTable from '../components/ledger/LedgerTable';
import VendorFormModal from '../components/vendors/VendorFormModal';

// Everything bought from one vendor in the selected date range, per item.
const summariseItems = (records, itemsById) => {
  const byItem = new Map();
  const sorted = [...records].filter((r) => r.status !== 'FLAGGED').sort((a, b) => new Date(a.receiptDate) - new Date(b.receiptDate));
  for (const r of sorted) {
    for (const line of r.items ?? []) {
      const row = byItem.get(line.itemId) ?? { itemId: line.itemId, name: line.itemName, unit: line.unit, quantity: 0, spent: 0, prices: [] };
      row.quantity += line.quantity;
      row.spent += line.amount;
      row.prices.push({ price: line.unitPrice, date: r.receiptDate });
      byItem.set(line.itemId, row);
    }
  }
  return [...byItem.values()].map((row) => ({
    ...row,
    lastPrice: row.prices.at(-1).price,
    lastDate: row.prices.at(-1).date,
    previousPrice: row.prices.at(-2)?.price,
    avgPrice: row.spent / row.quantity,
    inHand: itemsById.get(row.itemId),
  }));
};

export default function VendorDetailPage() {
  const { id } = useParams();
  const vendor = useFinanceStore((s) => s.vendors.find((v) => v.id === id));
  const items = useFinanceStore((s) => s.items);
  const records = useVisibleRecords({ vendorId: id, category: 'ALL' });
  const can = useCan();
  const [editing, setEditing] = useState(false);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const purchased = useMemo(() => summariseItems(records, itemsById), [records, itemsById]);

  if (!vendor) return <p className="text-slate-500">Loading vendor…</p>;

  const counted = records.filter((r) => r.status !== 'FLAGGED');
  const billed = counted.reduce((s, r) => s + r.amount, 0);
  const paid = counted.reduce((s, r) => s + r.amountPaid, 0);

  return (
    <>
      <Link to="/vendors" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> All vendors
      </Link>
      <PageHeader
        title={vendor.name}
        subtitle={
          <span className="flex items-center gap-2">
            {vendor.code} <CategoryBadge category={vendor.defaultCategory} /> {vendor.active === false && <span className="text-rose-600">Inactive</span>}
          </span>
        }
        actions={
          <>
            {can('manageVendors') && (
              <button onClick={() => setEditing(true)} className={`${buttonClass.secondary} inline-flex items-center gap-1.5`}>
                <Pencil className="h-4 w-4" /> Edit vendor
              </button>
            )}
            {can('createInvoice') && (
              <Link to="/invoices/new" onClick={() => useFinanceStore.getState().setSelectedVendor(vendor.id)} className={`${buttonClass.primary} inline-flex items-center gap-1.5`}>
                <FilePlus2 className="h-4 w-4" /> New invoice
              </Link>
            )}
          </>
        }
      />

      <section className="flex flex-wrap gap-x-8 gap-y-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
        <span className="flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" /> {vendor.contactName || '—'}</span>
        <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" /> {vendor.phone || '—'}</span>
        <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" /> {vendor.email || '—'}</span>
        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {vendor.address || '—'}</span>
      </section>

      <DateRangeFilter />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Billed (period)" value={formatCurrency(billed)} />
        <StatCard icon={CheckCircle2} label="Paid (period)" value={formatCurrency(paid)} tone="text-emerald-600" />
        <StatCard icon={Wallet} label="Outstanding (all time)" value={formatCurrency(vendor.pendingBalance)} tone="text-amber-600" />
        <StatCard icon={ShieldCheck} label="Bills not flagged" value={`${vendor.complianceScore}%`} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">Items purchased</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2 text-right">Qty bought</th>
                <th className="px-4 py-2 text-right">Spent</th>
                <th className="px-4 py-2 text-right">Avg price</th>
                <th className="px-4 py-2 text-right">Last price</th>
                <th className="px-4 py-2">Change vs previous</th>
                <th className="px-4 py-2 text-right">In hand (warehouse)</th>
              </tr>
            </thead>
            <tbody>
              {purchased.map((row) => (
                <tr key={row.itemId} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatNumber(row.quantity)} {row.unit}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.spent)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatNumber(row.avgPrice)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatNumber(row.lastPrice)}
                    <div className="text-xs text-slate-400">{formatDate(row.lastDate)}</div>
                  </td>
                  <td className="px-4 py-2">
                    <PriceChange current={row.lastPrice} previous={row.previousPrice} />
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums ${row.inHand?.isLowStock ? 'font-medium text-amber-700' : ''}`}>
                    {row.inHand ? `${formatNumber(row.inHand.inHand)} ${row.unit}` : '—'}
                  </td>
                </tr>
              ))}
              {!purchased.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No itemised purchases in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <LedgerTable vendorId={vendor.id} title="Invoices" />

      {editing && <VendorFormModal vendor={vendor} onClose={() => setEditing(false)} />}
    </>
  );
}

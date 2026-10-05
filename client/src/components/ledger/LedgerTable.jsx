import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowUpDown, Eye, ShieldCheck, Trash2, Image } from 'lucide-react';
import { useFinanceStore, useVisibleRecords } from '../../store/useFinanceStore';
import { errorMessage } from '../../api/client';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { CATEGORIES } from '../../utils/categories';
import { PAYMENT_STATUSES, paymentStatus, itemDescription } from '../../utils/payment';
import PaymentStatusBadge from '../common/PaymentStatusBadge';
import ConfirmButton from '../common/ConfirmButton';
import { useCan } from '../../utils/permissions';

const SORTS = {
  date: (a, b) => new Date(b.receiptDate) - new Date(a.receiptDate),
  supplier: (a, b) => a.vendorName.localeCompare(b.vendorName),
  amount: (a, b) => b.amount - a.amount,
  'amount due': (a, b) => b.balance - a.balance,
};

const LIVE_LABELS = {
  live: ['bg-emerald-500', 'Live'],
  connecting: ['bg-amber-400', 'Connecting…'],
  offline: ['bg-rose-500', 'Offline, retrying…'],
  off: ['bg-slate-300', 'Not live'],
};

// Shows whether the ledger is receiving real-time updates and the last change by someone else.
function LiveStatus() {
  const live = useFinanceStore((s) => s.live);
  const lastRemoteChange = useFinanceStore((s) => s.lastRemoteChange);
  const [dot, label] = LIVE_LABELS[live] ?? LIVE_LABELS.off;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-slate-500"
      title={lastRemoteChange ? `Last update by ${lastRemoteChange.by ?? 'someone'} · ${formatDateTime(lastRemoteChange.at)}` : undefined}
    >
      <span className={`h-2 w-2 rounded-full ${dot} ${live === 'live' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}

const BillBadge = ({ record }) =>
  record.billAvailable === false ? (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">No bill</span>
  ) : (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Yes</span>
  );

const InvoiceNo = ({ record }) => (
  <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-slate-900">
    {record.invoiceNumber || <span className="font-normal text-slate-400">—</span>}
    {record.imageUrl && <Image className="h-3.5 w-3.5 text-indigo-500" aria-label="Has receipt image" />}
    {record.verified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-label="Verified" />}
  </span>
);

// Vendor ledger: Date · Supplier · Invoice No · Item description · Amount · Bill · Payment status.
// Pass `vendorId` to pin it to one vendor (vendor detail page).
export default function LedgerTable({ vendorId, title = 'Vendor Ledger' }) {
  const records = useVisibleRecords(vendorId ? { vendorId, category: 'ALL' } : {});
  const openInspector = useFinanceStore((s) => s.openInspector);
  const deleteRecord = useFinanceStore((s) => s.deleteRecord);
  const can = useCan();
  const [deleteError, setDeleteError] = useState('');
  const flashIds = useFinanceStore((s) => s.flashIds);
  const flashRef = useRef(null); // table row (tablet / desktop)
  const flashCardRef = useRef(null); // card (phone)
  const [query, setQuery] = useState('');
  const [payment, setPayment] = useState('ALL');
  const [sortBy, setSortBy] = useState('date');

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return records
      .filter((r) => payment === 'ALL' || paymentStatus(r) === payment)
      .filter(
        (r) =>
          !q ||
          [r.vendorName, r.invoiceNumber, itemDescription(r), r.notes].join(' ').toLowerCase().includes(q)
      )
      .sort(SORTS[sortBy]);
  }, [records, query, payment, sortBy]);

  const counts = useMemo(() => {
    const c = { ALL: records.length };
    for (const r of records) c[paymentStatus(r)] = (c[paymentStatus(r)] ?? 0) + 1;
    return c;
  }, [records]);

  // Bring a just-saved or just-arrived bill into view.
  const firstFlash = flashIds.find((id) => rows.some((r) => r.id === id));
  useEffect(() => {
    // Only one of the two layouts is visible; scroll the one that is.
    const target = [flashRef.current, flashCardRef.current].find((el) => el?.offsetParent);
    if (firstFlash) target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [firstFlash]);

  const deleteButton = (r) =>
    can('deleteInvoice') && (
      <ConfirmButton
        onConfirm={() => {
          setDeleteError('');
          return deleteRecord(r.id).catch((err) => setDeleteError(errorMessage(err, 'Could not delete the bill')));
        }}
        title="Delete this bill?"
        message={`${r.vendorName}${r.invoiceNumber ? ` · Invoice ${r.invoiceNumber}` : ''} · ${formatCurrency(r.amount, r.currency)} will be deleted with its receipt image and payments. This cannot be undone.`}
        confirmLabel="Delete bill"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-rose-600 hover:bg-rose-50"
      >
        <Trash2 className="h-4 w-4" /> Delete
      </ConfirmButton>
    );
  const rowTone = (r) => (flashIds.includes(r.id) ? 'bg-emerald-50' : 'hover:bg-indigo-50/50');

  const control = 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm';
  const chip = (active) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400'}`;

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white">
      <div className="space-y-3 border-b border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto font-semibold text-slate-900">
            {title} <span className="text-sm font-normal text-slate-400">({rows.length})</span>
          </h2>
          <LiveStatus />
          <div className="relative w-full sm:w-auto">
            <Search className="absolute top-2 left-2 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search supplier, invoice no, item…" className={`${control} w-full pl-8 sm:w-64`} />
          </div>
          <label className="flex items-center gap-1 text-sm text-slate-600">
            <ArrowUpDown className="h-4 w-4" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={control}>
              {Object.keys(SORTS).map((k) => (
                <option key={k} value={k}>
                  Sort by {k}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPayment('ALL')} className={chip(payment === 'ALL')}>
            All ({counts.ALL})
          </button>
          {['PAID', 'UNPAID', 'PARTIAL', 'FLAGGED'].map((key) => (
            <button key={key} onClick={() => setPayment(key)} className={chip(payment === key)}>
              {PAYMENT_STATUSES[key].label} ({counts[key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {deleteError && <p className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{deleteError}</p>}
      {/* Phones: one card per bill */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((r) => (
          <li
            key={r.id}
            ref={r.id === firstFlash ? flashCardRef : undefined}
            onClick={() => openInspector(r.id)}
            className={`cursor-pointer space-y-1.5 px-4 py-3 text-sm transition-colors duration-1000 ${rowTone(r)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {!vendorId && <div className="truncate font-medium text-slate-900">{r.vendorName}</div>}
                <div className="text-xs text-slate-500">
                  <InvoiceNo record={r} /> · {formatDate(r.receiptDate)}
                </div>
              </div>
              <div className="shrink-0 font-semibold tabular-nums text-slate-900">{formatCurrency(r.amount, r.currency)}</div>
            </div>
            <p className="line-clamp-1 text-xs text-slate-500">{itemDescription(r, CATEGORIES[r.category]?.label)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <PaymentStatusBadge record={r} />
              <BillBadge record={r} />
              <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
                {deleteButton(r)}
              </span>
            </div>
          </li>
        ))}
        {!rows.length && <li className="px-4 py-8 text-center text-sm text-slate-400">No bills match the current filters.</li>}
      </ul>

      {/* Tablet and up: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Date</th>
              {!vendorId && <th className="px-4 py-2">Supplier</th>}
              <th className="px-4 py-2">Invoice No</th>
              <th className="px-4 py-2">Item description</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Bill</th>
              <th className="px-4 py-2">Payment status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                ref={r.id === firstFlash ? flashRef : undefined}
                onClick={() => openInspector(r.id)}
                title="Open receipt"
                className={`cursor-pointer border-t border-slate-100 align-top transition-colors duration-1000 ${rowTone(r)}`}
              >
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(r.receiptDate)}</td>
                {!vendorId && <td className="px-4 py-2.5 font-medium whitespace-nowrap text-slate-900">{r.vendorName}</td>}
                <td className="px-4 py-2.5">
                  <InvoiceNo record={r} />
                </td>
                <td className="max-w-80 px-4 py-2.5 text-slate-600">
                  <span className="line-clamp-2">{itemDescription(r, CATEGORIES[r.category]?.label)}</span>
                </td>
                <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap tabular-nums">{formatCurrency(r.amount, r.currency)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <BillBadge record={r} />
                </td>
                <td className="px-4 py-2.5">
                  <PaymentStatusBadge record={r} />
                </td>
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <button onClick={() => openInspector(r.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-indigo-600 hover:bg-indigo-50">
                      <Eye className="h-4 w-4" /> Open
                    </button>
                    {deleteButton(r)}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No bills match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useFinanceStore, useVisibleRecords } from '../store/useFinanceStore';
import { formatCurrency, formatDate, monthKey, monthLabel } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import PaymentStatusBadge from '../components/common/PaymentStatusBadge';
import VendorSelector from '../components/vendors/VendorSelector';
import DateRangeFilter from '../components/filters/DateRangeFilter';

const sum = (list, key) => list.reduce((s, r) => s + r[key], 0);

// What Sugarloop owes: month-by-month bills, what has been cleared (and when), and per-vendor balances.
export default function LiabilitiesPage() {
  const records = useVisibleRecords({ category: 'ALL' });
  const openInspector = useFinanceStore((s) => s.openInspector);
  const [open, setOpen] = useState({});
  const [onlyOutstanding, setOnlyOutstanding] = useState(false);

  const bills = useMemo(() => records.filter((r) => r.status !== 'FLAGGED'), [records]);

  const months = useMemo(() => {
    const groups = new Map();
    for (const r of bills) {
      const key = monthKey(r.receiptDate);
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, list]) => ({
        key,
        bills: list.sort((a, b) => new Date(a.receiptDate) - new Date(b.receiptDate)),
        billed: sum(list, 'amount'),
        paid: sum(list, 'amountPaid'),
        cleared: list.filter((r) => r.status === 'PAID').length,
      }))
      .filter((m) => !onlyOutstanding || m.billed - m.paid > 0);
  }, [bills, onlyOutstanding]);

  const byVendor = useMemo(() => {
    const groups = new Map();
    for (const r of bills) {
      const g = groups.get(r.vendorId) ?? { vendorId: r.vendorId, name: r.vendorName, billed: 0, paid: 0, open: 0, oldest: null };
      g.billed += r.amount;
      g.paid += r.amountPaid;
      if (r.balance > 0) {
        g.open += 1;
        if (!g.oldest || new Date(r.receiptDate) < new Date(g.oldest)) g.oldest = r.receiptDate;
      }
      groups.set(r.vendorId, g);
    }
    return [...groups.values()].filter((g) => g.billed - g.paid > 0).sort((a, b) => b.billed - b.paid - (a.billed - a.paid));
  }, [bills]);

  const totalOutstanding = sum(bills, 'amount') - sum(bills, 'amountPaid');

  return (
    <>
      <PageHeader title="Liabilities" subtitle={`Outstanding payables: ${formatCurrency(totalOutstanding)} (flagged bills excluded)`} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <VendorSelector />
        <DateRangeFilter />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyOutstanding} onChange={(e) => setOnlyOutstanding(e.target.checked)} />
          Months with a balance only
        </label>
      </div>

      <div className="grid grid-cols-[1fr_360px] items-start gap-6">
        <section className="space-y-3">
          {months.map((m) => {
            const outstanding = m.billed - m.paid;
            const expanded = open[m.key] ?? outstanding > 0;
            return (
              <div key={m.key} className="rounded-xl border border-slate-200 bg-white">
                <button onClick={() => setOpen({ ...open, [m.key]: !expanded })} className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left">
                  {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <span className="font-semibold text-slate-900">{monthLabel(m.key)}</span>
                  <span className="text-sm text-slate-500">
                    {m.cleared}/{m.bills.length} bills cleared
                  </span>
                  <span className="grid w-full grid-cols-3 gap-3 text-right text-sm tabular-nums sm:ml-auto sm:w-auto sm:gap-6">
                    <span>
                      <span className="block text-xs text-slate-400">Billed</span>
                      {formatCurrency(m.billed)}
                    </span>
                    <span>
                      <span className="block text-xs text-slate-400">Paid</span>
                      <span className="text-emerald-700">{formatCurrency(m.paid)}</span>
                    </span>
                    <span>
                      <span className="block text-xs text-slate-400">Outstanding</span>
                      {outstanding > 0 ? (
                        <span className="font-medium text-amber-700">{formatCurrency(outstanding)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" /> Cleared
                        </span>
                      )}
                    </span>
                  </span>
                </button>

                {expanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-t border-slate-100 text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-1.5">Date</th>
                          <th className="px-4 py-1.5">Supplier</th>
                          <th className="px-4 py-1.5">Invoice No</th>
                          <th className="px-4 py-1.5 text-right">Amount</th>
                          <th className="px-4 py-1.5">Payment status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.bills.map((r) => (
                          <tr key={r.id} onClick={() => openInspector(r.id)} className={`cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50 ${r.status === 'PAID' ? 'bg-emerald-50/60' : ''}`}>
                            <td className="px-4 py-1.5 whitespace-nowrap">{formatDate(r.receiptDate)}</td>
                            <td className="px-4 py-1.5">{r.vendorName}</td>
                            <td className="px-4 py-1.5 font-medium">{r.invoiceNumber || '—'}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums">{formatCurrency(r.amount, r.currency)}</td>
                            <td className="px-4 py-1.5">
                              <PaymentStatusBadge record={r} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          {!months.length && <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-400">No bills in this period.</p>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">Owed per vendor</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {byVendor.map((g) => (
              <li key={g.vendorId} className="flex items-center justify-between gap-3 px-4 py-2">
                <div>
                  <Link to={`/vendors/${g.vendorId}`} className="font-medium text-indigo-700 hover:underline">
                    {g.name}
                  </Link>
                  <div className="text-xs text-slate-400">
                    {g.open} open bill{g.open === 1 ? '' : 's'} · oldest {formatDate(g.oldest)}
                  </div>
                </div>
                <span className="font-medium text-amber-700 tabular-nums">{formatCurrency(g.billed - g.paid)}</span>
              </li>
            ))}
            {!byVendor.length && <li className="px-4 py-6 text-center text-slate-400">Nothing outstanding.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}

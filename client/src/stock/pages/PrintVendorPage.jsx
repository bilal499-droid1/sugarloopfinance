import { useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatDate } from '../../utils/format';
import { paymentStatus, PAYMENT_STATUSES } from '../../utils/payment';
import { useReturnsStore } from '../useReturnsStore';
import { purchasesIn, returnsIn, totalsOf, vendorSummaries } from '../reports';
import ReportShell from '../components/ReportShell';
import PeriodFilters, { defaultPeriod, periodLabel } from '../components/PeriodFilters';

const money = (v) => formatCurrency(v);

// Print Purchase Vendor: one vendor's statement for a period, or a summary of all
// vendors (bills, returns, paid, still due).
export default function PrintVendorPage() {
  const records = useFinanceStore((s) => s.records);
  const returns = useReturnsStore((s) => s.returns);
  const [period, setPeriod] = useState(defaultPeriod);
  const [vendorId, setVendorId] = useState('');

  const summaries = vendorSummaries(purchasesIn(records, period), returnsIn(returns, period));
  const shown = vendorId ? summaries.filter((s) => s.vendorId === vendorId) : summaries;
  const totals = totalsOf(shown);
  const one = vendorId ? shown[0] : null;

  return (
    <ReportShell
      title={vendorId ? 'Vendor Purchase Statement' : 'Purchases by Vendor'}
      period={periodLabel(period, formatDate)}
      filters={
        <PeriodFilters period={period} onChange={setPeriod} vendorId={vendorId} onVendorChange={setVendorId} allLabel="All vendors (summary)" />
      }
    >
      {vendorId ? (
        one ? (
          <>
            <h2 className="text-base font-semibold">{one.vendorName}</h2>
            <table className="w-full">
              <thead className="text-left text-xs text-slate-500 uppercase">
                <tr className="border-b border-slate-300">
                  <th className="py-1">Date</th>
                  <th className="py-1">Document</th>
                  <th className="py-1">Status</th>
                  <th className="py-1 text-right">Purchase</th>
                  <th className="py-1 text-right">Return</th>
                  <th className="py-1 text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...one.bills.map((b) => ({ date: b.receiptDate, bill: b })),
                  ...one.returns.map((r) => ({ date: r.returnDate, ret: r })),
                ]
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map(({ date, bill, ret }) => (
                    <tr key={(bill ?? ret).id} className="border-b border-slate-100">
                      <td className="py-1">{formatDate(date)}</td>
                      <td className="py-1">{bill ? `Bill ${bill.invoiceNumber || ''}` : `Return ${ret.returnNo}`}</td>
                      <td className="py-1 text-slate-500">{bill ? PAYMENT_STATUSES[paymentStatus(bill)].label : ret.reason || ''}</td>
                      <td className="py-1 text-right">{bill ? money(bill.amount) : ''}</td>
                      <td className="py-1 text-right">{ret ? money(ret.amount) : ''}</td>
                      <td className="py-1 text-right">{bill ? money(bill.amountPaid) : ''}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-slate-400">No purchases or returns for this vendor in this period.</p>
        )
      ) : (
        <table className="w-full">
          <thead className="text-left text-xs text-slate-500 uppercase">
            <tr className="border-b border-slate-300">
              <th className="py-1">Vendor</th>
              <th className="py-1 text-right">Bills</th>
              <th className="py-1 text-right">Purchase</th>
              <th className="py-1 text-right">Return</th>
              <th className="py-1 text-right">Net</th>
              <th className="py-1 text-right">Paid</th>
              <th className="py-1 text-right">Due</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.vendorId} className="border-b border-slate-100">
                <td className="py-1">{s.vendorName}</td>
                <td className="py-1 text-right">{s.invoices}</td>
                <td className="py-1 text-right">{money(s.purchased)}</td>
                <td className="py-1 text-right">{money(s.returned)}</td>
                <td className="py-1 text-right">{money(s.net)}</td>
                <td className="py-1 text-right">{money(s.paid)}</td>
                <td className="py-1 text-right font-medium">{money(s.due)}</td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-slate-400">
                  No purchases in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <dl className="ml-auto grid w-64 grid-cols-2 gap-y-1 border-t border-slate-300 pt-2">
        <dt>Purchase</dt>
        <dd className="text-right">{money(totals.purchased)}</dd>
        <dt>Returns</dt>
        <dd className="text-right">− {money(totals.returned)}</dd>
        <dt>Net</dt>
        <dd className="text-right">{money(totals.net)}</dd>
        <dt>Paid</dt>
        <dd className="text-right">{money(totals.paid)}</dd>
        <dt className="font-semibold">Due</dt>
        <dd className="text-right font-semibold">{money(totals.due)}</dd>
      </dl>
    </ReportShell>
  );
}

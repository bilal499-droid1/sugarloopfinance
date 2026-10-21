import { useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatDate, formatNumber } from '../../utils/format';
import { paymentStatus, PAYMENT_STATUSES } from '../../utils/payment';
import { useReturnsStore } from '../useReturnsStore';
import { purchasesIn, returnsIn } from '../reports';
import ReportShell from '../components/ReportShell';
import PeriodFilters, { defaultPeriod, periodLabel } from '../components/PeriodFilters';

const sum = (list) => list.reduce((total, x) => total + (x.amount ?? 0), 0);

// [vendorName, bills] pairs, vendors A–Z, each vendor's bills oldest-first.
const byVendor = (bills) => {
  const groups = new Map();
  for (const b of bills) groups.set(b.vendorName, [...(groups.get(b.vendorName) ?? []), b]);
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, vBills]) => [name, [...vBills].sort((a, b) => new Date(a.receiptDate) - new Date(b.receiptDate))]);
};

// Print Purchase: every bill in a period vendor-wise with its products, then the returns.
export default function PrintPurchasePage() {
  const records = useFinanceStore((s) => s.records);
  const vendors = useFinanceStore((s) => s.vendors);
  const returns = useReturnsStore((s) => s.returns);
  const [period, setPeriod] = useState(defaultPeriod);
  const [vendorId, setVendorId] = useState('');

  const ofVendor = (x) => !vendorId || x.vendorId === vendorId;
  const bills = purchasesIn(records, period).filter(ofVendor);
  const sentBack = returnsIn(returns, period).filter(ofVendor);
  const vendorName = vendors.find((v) => v.id === vendorId)?.name;

  return (
    <ReportShell
      title="Purchase Register"
      period={`${periodLabel(period, formatDate)}${vendorName ? ` · ${vendorName}` : ''}`}
      filters={<PeriodFilters period={period} onChange={setPeriod} vendorId={vendorId} onVendorChange={setVendorId} />}
    >
      {byVendor(bills).map(([name, vendorBills]) => (
        <section key={name} className="space-y-3">
          <h3 className="flex justify-between border-b-2 border-slate-300 pb-1 font-semibold">
            <span>{name}</span>
            <span>
              {vendorBills.length} bill{vendorBills.length === 1 ? '' : 's'} · {formatCurrency(sum(vendorBills))}
            </span>
          </h3>
          {vendorBills.map((b) => (
            <section key={b.id} className="break-inside-avoid space-y-1 pl-2">
              <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-1">
                <span className="font-medium">
                  {formatDate(b.receiptDate)}
                  {b.invoiceNumber && <span className="text-slate-500"> · Inv {b.invoiceNumber}</span>}
                </span>
                <span className="text-slate-500">
                  {PAYMENT_STATUSES[paymentStatus(b)].label} · <strong className="text-slate-800">{formatCurrency(b.amount, b.currency)}</strong>
                </span>
              </div>
              {b.items?.length > 0 && (
                <table className="w-full text-xs">
                  <tbody>
                    {b.items.map((line, i) => (
                      <tr key={i}>
                        <td className="py-0.5 pl-3">{line.itemName}</td>
                        <td className="py-0.5 text-right">
                          {formatNumber(line.quantity)} {line.unit}
                        </td>
                        <td className="py-0.5 text-right">@ {formatNumber(line.unitPrice)}</td>
                        <td className="w-28 py-0.5 text-right">{formatNumber(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </section>
      ))}
      {!bills.length && <p className="text-slate-400">No purchases in this period.</p>}

      {sentBack.length > 0 && (
        <section className="break-inside-avoid space-y-1">
          <h3 className="font-semibold">Purchase returns</h3>
          <table className="w-full text-xs">
            <tbody>
              {sentBack.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-1">{formatDate(r.returnDate)}</td>
                  <td className="py-1">{r.returnNo}</td>
                  <td className="py-1">{r.vendorName}</td>
                  <td className="py-1 text-slate-500">{r.items.map((l) => `${l.itemName} ${formatNumber(l.quantity)} ${l.unit}`).join(', ')}</td>
                  <td className="w-28 py-1 text-right">{formatNumber(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <dl className="ml-auto grid w-64 grid-cols-2 gap-y-1 border-t border-slate-300 pt-2">
        <dt>Bills ({bills.length})</dt>
        <dd className="text-right">{formatCurrency(sum(bills))}</dd>
        <dt>Returns ({sentBack.length})</dt>
        <dd className="text-right">− {formatCurrency(sum(sentBack))}</dd>
        <dt className="font-semibold">Net purchase</dt>
        <dd className="text-right font-semibold">{formatCurrency(sum(bills) - sum(sentBack))}</dd>
      </dl>
    </ReportShell>
  );
}

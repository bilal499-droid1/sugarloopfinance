import { useEffect, useState } from 'react';
import { useSalesStore } from '../useSalesStore';
import { formatCurrency, formatDate, formatNumber, toDateInput } from '../../utils/format';
import ReportShell from '../components/ReportShell';
import PeriodFilters, { defaultPeriod, periodLabel } from '../components/PeriodFilters';
import Field, { inputClass } from '../../components/common/Field';

const sum = (list) => list.reduce((t, s) => t + (s.amount ?? 0), 0);

const byCustomer = (sales) => {
  const groups = new Map();
  for (const s of sales) groups.set(s.customerName, [...(groups.get(s.customerName) ?? []), s]);
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, cSales]) => [name, [...cSales].sort((a, b) => new Date(a.saleDate) - new Date(b.saleDate))]);
};

export default function PrintSalePage() {
  const { sales, customers, fetchSales } = useSalesStore();
  const [period, setPeriod] = useState(defaultPeriod);
  const [customerId, setCustomerId] = useState('');

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const inPeriod = (s) => {
    const d = toDateInput(s.saleDate);
    return (!period.from || d >= period.from) && (!period.to || d <= period.to);
  };
  const filtered = sales.filter(inPeriod).filter((s) => !customerId || s.customerId === customerId);
  const customerName = customers.find((c) => c.id === customerId)?.name;

  return (
    <ReportShell
      title="Sale Register"
      period={`${periodLabel(period, formatDate)}${customerName ? ` · ${customerName}` : ''}`}
      filters={
        <div className="flex flex-wrap gap-3">
          <PeriodFilters period={period} onChange={setPeriod} />
          <Field label="Customer">
            <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">All customers</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
      }
    >
      {byCustomer(filtered).map(([name, cSales]) => (
        <section key={name} className="space-y-3">
          <h3 className="flex justify-between border-b-2 border-slate-300 pb-1 font-semibold">
            <span>{name}</span>
            <span>{cSales.length} sale{cSales.length === 1 ? '' : 's'} · {formatCurrency(sum(cSales))}</span>
          </h3>
          {cSales.map((s) => (
            <section key={s.id} className="break-inside-avoid space-y-1 pl-2">
              <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-1">
                <span className="font-medium">
                  {formatDate(s.saleDate)}
                  <span className="text-slate-500"> · {s.saleInvoiceNo}</span>
                </span>
                <strong className="text-slate-800">{formatCurrency(s.amount)}</strong>
              </div>
              {s.items?.length > 0 && (
                <table className="w-full text-xs">
                  <tbody>
                    {s.items.map((line, i) => (
                      <tr key={i}>
                        <td className="py-0.5 pl-3">{line.itemName}</td>
                        <td className="py-0.5 text-right">{formatNumber(line.quantity)} {line.unit}</td>
                        <td className="py-0.5 text-right">@ {formatNumber(line.unitPrice)}</td>
                        <td className="w-28 py-0.5 text-right">{formatNumber(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {s.notes && <p className="pl-3 text-xs text-slate-500">{s.notes}</p>}
            </section>
          ))}
        </section>
      ))}
      {!filtered.length && <p className="text-slate-400">No sales in this period.</p>}

      <dl className="ml-auto grid w-64 grid-cols-2 gap-y-1 border-t border-slate-300 pt-2">
        <dt>Sales ({filtered.length})</dt>
        <dd className="text-right">{formatCurrency(sum(filtered))}</dd>
      </dl>
    </ReportShell>
  );
}

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatNumber, today } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import { inputClass } from '../../components/common/Field';

const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export default function ConsumptionPage() {
  const records = useFinanceStore((s) => s.records);
  const items = useFinanceStore((s) => s.items);
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Aggregate purchases by product within the date range.
  const rows = useMemo(() => {
    const map = new Map(); // itemId → { item, vendors: Map<vendorId, {name, bills, qty, amount}>, totalQty, totalAmount }

    for (const rec of records) {
      if (rec.status === 'FLAGGED') continue;
      if (!rec.items?.length) continue;
      const date = rec.receiptDate?.slice(0, 10);
      if (from && date < from) continue;
      if (to && date > to) continue;

      for (const line of rec.items) {
        const id = line.itemId;
        if (!id) continue;
        if (!map.has(id)) map.set(id, { itemId: id, vendors: new Map(), totalQty: 0, totalAmount: 0 });
        const row = map.get(id);
        const amount = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
        row.totalQty += Number(line.quantity) || 0;
        row.totalAmount += amount;

        const vKey = rec.vendorId ?? rec.vendorName;
        if (!row.vendors.has(vKey)) row.vendors.set(vKey, { name: rec.vendorName, bills: 0, qty: 0, amount: 0 });
        const v = row.vendors.get(vKey);
        v.bills += 1;
        v.qty += Number(line.quantity) || 0;
        v.amount += amount;
      }
    }

    return Array.from(map.values())
      .map((r) => ({ ...r, item: itemById.get(r.itemId), vendors: Array.from(r.vendors.values()).sort((a, b) => b.amount - a.amount) }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [records, items, from, to, itemById]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => (r.item?.name ?? r.itemId).toLowerCase().includes(q));
  }, [rows, search]);

  const totalSpend = filtered.reduce((s, r) => s + r.totalAmount, 0);
  const totalQty = filtered.reduce((s, r) => s + r.totalQty, 0);

  const toggle = (id) => setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const th = 'px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide';
  const td = 'px-3 py-2 text-sm text-slate-700';

  return (
    <>
      <PageHeader title="Consumption Report" subtitle="Total purchases per product across all vendors." />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase">From</label>
          <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase">To</label>
          <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs font-medium text-slate-500 uppercase">Search product</label>
          <input className={inputClass} placeholder="Type to filter…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Products', value: filtered.length, wide: false },
          { label: 'Total Qty', value: formatNumber(totalQty), wide: false },
          { label: 'Total Spend', value: formatCurrency(totalSpend), wide: true },
        ].map(({ label, value, wide }) => (
          <div key={label} className={`rounded-xl border border-slate-200 bg-white px-4 py-3 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
            <p className="text-xs font-medium text-slate-500 uppercase">{label}</p>
            <p className="mt-1 text-lg sm:text-xl font-semibold text-slate-900 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Main table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className={th}>#</th>
              <th className={th}>Product</th>
              <th className={th}>Unit</th>
              <th className={`${th} text-right`}>Vendors</th>
              <th className={`${th} text-right`}>Total Qty</th>
              <th className={`${th} text-right`}>Total Spend</th>
              <th className={`${th} text-right`}>Avg Price</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => {
              const name = row.item?.name ?? `Unknown (${row.itemId})`;
              const unit = row.item?.unit ?? '';
              const avgPrice = row.totalQty > 0 ? row.totalAmount / row.totalQty : 0;
              const isOpen = expanded.has(row.itemId);

              return (
                <>
                  <tr
                    key={row.itemId}
                    onClick={() => toggle(row.itemId)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-2 py-2 text-slate-400">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className={td}>{index + 1}</td>
                    <td className={`${td} font-medium text-slate-900`}>{name}</td>
                    <td className={td}>{unit}</td>
                    <td className={`${td} text-right`}>{row.vendors.length}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatNumber(row.totalQty)}</td>
                    <td className={`${td} text-right font-medium tabular-nums`}>{formatCurrency(row.totalAmount)}</td>
                    <td className={`${td} text-right tabular-nums text-slate-500`}>{formatCurrency(avgPrice)}</td>
                  </tr>

                  {isOpen && (
                    <tr key={`${row.itemId}-detail`} className="border-t border-slate-100 bg-indigo-50/40">
                      <td colSpan={8} className="px-6 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-slate-500 uppercase">
                              <th className="pb-1.5 pr-4">Vendor</th>
                              <th className="pb-1.5 pr-4 text-right">Bills</th>
                              <th className="pb-1.5 pr-4 text-right">Qty</th>
                              <th className="pb-1.5 pr-4 text-right">Amount</th>
                              <th className="pb-1.5 text-right">Avg Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.vendors.map((v) => (
                              <tr key={v.name} className="border-t border-indigo-100">
                                <td className="py-1 pr-4 font-medium text-slate-800">{v.name}</td>
                                <td className="py-1 pr-4 text-right tabular-nums">{v.bills}</td>
                                <td className="py-1 pr-4 text-right tabular-nums">{formatNumber(v.qty)}</td>
                                <td className="py-1 pr-4 text-right tabular-nums">{formatCurrency(v.amount)}</td>
                                <td className="py-1 text-right tabular-nums">{formatCurrency(v.qty > 0 ? v.amount / v.qty : 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No purchases found for this period.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td colSpan={5} className="px-3 py-2 text-sm font-semibold text-slate-700">Total</td>
                <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">{formatNumber(totalQty)}</td>
                <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">{formatCurrency(totalSpend)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

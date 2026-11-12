import { useEffect, useState } from 'react';
import { Printer, Trash2 } from 'lucide-react';
import { useSaleOutStore } from '../useSaleOutStore';
import { SALEOUT_CATALOG, ALL_ITEMS } from '../catalog/saleOutCatalog';
import { NP_CATALOG, NP_ALL_ITEMS } from '../catalog/nonPerishableCatalog';
import { BRANCHES } from '../components/DispatchSheetForm';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/format';
import { useCan } from '../../utils/permissions';

const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => new Date().toISOString().slice(0, 10);

const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
};

function Tabs({ active, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit print:hidden">
      {[
        { key: 'perishable', label: 'Perishable' },
        { key: 'nonperishable', label: 'Non-Perishable' },
      ].map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-lg px-5 py-1.5 text-sm font-medium transition-colors ${
            active === t.key
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function SaleOutSearchPage() {
  const { records, loading, error, fetchRecords, deleteRecord } = useSaleOutStore();
  const can = useCan();

  const [activeTab, setActiveTab] = useState('perishable');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [branch, setBranch] = useState('');

  const catalog = activeTab === 'perishable' ? SALEOUT_CATALOG : NP_CATALOG;
  const allItems = activeTab === 'perishable' ? ALL_ITEMS : NP_ALL_ITEMS;

  useEffect(() => {
    fetchRecords({ from, to, type: activeTab, ...(branch && { branch }) });
  }, [activeTab]);

  const handleSearch = () => fetchRecords({ from, to, type: activeTab, ...(branch && { branch }) });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this Sale Out entry?')) return;
    await deleteRecord(id);
  };

  const cols = [...records].sort((a, b) => {
    const dA = new Date(a.saleDate), dB = new Date(b.saleDate);
    return dA - dB || new Date(a.createdAt) - new Date(b.createdAt);
  });

  const getQty = (record, itemName) => {
    const line = record.lines.find((l) => l.itemName === itemName);
    return line?.qty ?? 0;
  };
  const getPrice = (record, itemName) => {
    const line = record.lines.find((l) => l.itemName === itemName);
    return line?.price ?? allItems.find((i) => i.name === itemName)?.price ?? 0;
  };

  return (
    <>
      <PageHeader title="Sale Out — Browse" subtitle="View all sale out entries in a date range." />

      <Tabs active={activeTab} onChange={handleTabChange} />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 print:hidden">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Branch</label>
          <select value={branch} onChange={(e) => setBranch(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100">
            <option value="">All Branches</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <button onClick={handleSearch}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
          Search
        </button>
        <button onClick={() => window.print()}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && cols.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          No {activeTab === 'perishable' ? 'Perishable' : 'Non-Perishable'} entries found for this date range.
        </p>
      )}

      {!loading && cols.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-amber-500 text-white">
                <th className="w-28 px-2 py-2 text-left border-r border-amber-400">Category</th>
                <th className="w-40 px-2 py-2 text-left border-r border-amber-400">Item Name</th>
                <th className="w-12 px-2 py-2 text-center border-r border-amber-400">Unit</th>
                {cols.map((rec) => (
                  <th key={rec.id} colSpan={3} className="px-2 py-2 text-center border-r border-amber-400 min-w-[150px]">
                    <div className="font-semibold">{fmtDate(rec.saleDate)}</div>
                    {rec.branch && <div className="text-[10px] font-semibold opacity-90">{rec.branch}</div>}
                    {rec.notes && <div className="text-[10px] opacity-80">{rec.notes}</div>}
                    <div className="text-[10px] opacity-70">{rec.entryNo}</div>
                  </th>
                ))}
              </tr>
              <tr className="bg-amber-400 text-white text-[10px]">
                <th className="px-2 py-1 border-r border-amber-300" />
                <th className="px-2 py-1 border-r border-amber-300" />
                <th className="px-2 py-1 border-r border-amber-300" />
                {cols.map((rec) => (
                  <th key={rec.id} colSpan={3} className="border-r border-amber-300">
                    <div className="grid grid-cols-3 divide-x divide-amber-300">
                      <span className="px-2 py-0.5 text-center">Qty</span>
                      <span className="px-2 py-0.5 text-center">Price</span>
                      <span className="px-2 py-0.5 text-center">Daily T</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catalog.map((cat) =>
                cat.items.map((item, idx) => (
                  <tr key={item.name} className={`border-t border-slate-100 ${cat.colorClass}`}>
                    {idx === 0 && (
                      <td
                        rowSpan={cat.items.length}
                        className={`px-2 py-1 font-semibold text-center align-middle border-r border-slate-200 ${cat.headerClass}`}
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
                      >
                        {cat.category}
                      </td>
                    )}
                    <td className="px-2 py-1 border-r border-slate-100">{item.name}</td>
                    <td className="px-2 py-1 text-center text-slate-400 border-r border-slate-100">per</td>
                    {cols.map((rec) => {
                      const qty = getQty(rec, item.name);
                      const price = getPrice(rec, item.name);
                      const total = qty * price;
                      return (
                        <td key={rec.id} colSpan={3} className="border-r border-slate-100 p-0">
                          <div className="grid grid-cols-3 divide-x divide-slate-100">
                            <span className="px-2 py-1 text-center tabular-nums">{qty || ''}</span>
                            <span className="px-2 py-1 text-center tabular-nums text-slate-500">{price > 0 ? price.toFixed(2) : ''}</span>
                            <span className="px-2 py-1 text-center tabular-nums font-medium">{total > 0 ? total : ''}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-green-200 font-semibold text-green-900">
                <td colSpan={3} className="px-2 py-2 text-right text-xs border-r border-slate-300">Daily Total</td>
                {cols.map((rec) => (
                  <td key={rec.id} colSpan={3} className="border-r border-slate-300 p-0">
                    <div className="grid grid-cols-3 divide-x divide-slate-300">
                      <span />
                      <span />
                      <span className="px-2 py-2 text-center tabular-nums">{rec.grandTotal}</span>
                    </div>
                  </td>
                ))}
              </tr>
              {can('manageUsers') && (
                <tr className="print:hidden bg-slate-50 border-t border-slate-200">
                  <td colSpan={3} className="px-2 py-1 text-xs text-slate-400 border-r border-slate-200">Actions</td>
                  {cols.map((rec) => (
                    <td key={rec.id} colSpan={3} className="px-2 py-1 text-center border-r border-slate-200">
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3 w-3" /> Del
                      </button>
                    </td>
                  ))}
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { Printer, Trash2 } from 'lucide-react';
import { useSaleOutStore } from '../useSaleOutStore';
import { SALEOUT_CATALOG, ALL_ITEMS } from '../catalog/saleOutCatalog';
import { NP_CATALOG, NP_ALL_ITEMS } from '../catalog/nonPerishableCatalog';
import { BRANCHES } from '../components/DispatchSheetForm';
import PageHeader from '../../components/common/PageHeader';
import { useCan } from '../../utils/permissions';

const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => new Date().toISOString().slice(0, 10);

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

// Build a per-branch aggregated map from records
function buildBranchMap(records) {
  const map = {};
  BRANCHES.forEach((b) => { map[b] = { lines: {}, grandTotal: 0 }; });

  records.forEach((rec) => {
    const b = rec.branch;
    if (!b || !map[b]) return;
    rec.lines.forEach((line) => {
      if (!map[b].lines[line.itemName]) {
        map[b].lines[line.itemName] = { qty: 0, total: 0, price: line.price };
      }
      map[b].lines[line.itemName].qty += line.qty;
      map[b].lines[line.itemName].total += line.total;
      map[b].lines[line.itemName].price = line.price;
    });
    map[b].grandTotal += rec.grandTotal;
  });

  return map;
}

export default function SaleOutSearchPage() {
  const { records, loading, error, fetchRecords, deleteRecord } = useSaleOutStore();
  const can = useCan();

  const [activeTab, setActiveTab] = useState('perishable');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const catalog = activeTab === 'perishable' ? SALEOUT_CATALOG : NP_CATALOG;
  const allItems = activeTab === 'perishable' ? ALL_ITEMS : NP_ALL_ITEMS;

  useEffect(() => {
    fetchRecords({ from, to, type: activeTab });
  }, [activeTab]);

  const handleSearch = () => fetchRecords({ from, to, type: activeTab });

  const handleDelete = async (id) => {
    if (!confirm('Delete this Sale Out entry?')) return;
    await deleteRecord(id);
    handleSearch();
  };

  const branchMap = buildBranchMap(records);

  const getQty   = (branch, itemName) => branchMap[branch]?.lines[itemName]?.qty   ?? 0;
  const getPrice = (branch, itemName) => branchMap[branch]?.lines[itemName]?.price ?? allItems.find((i) => i.name === itemName)?.price ?? 0;
  const getTotal = (branch, itemName) => branchMap[branch]?.lines[itemName]?.total ?? 0;

  return (
    <>
      <PageHeader title="Sale Out — Browse" subtitle="View dispatched quantities per branch for a date range." />

      <Tabs active={activeTab} onChange={setActiveTab} />

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

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-xs">
            <thead>
              {/* Row 1 — branch names */}
              <tr className="bg-amber-500 text-white">
                <th className="px-2 py-2 text-left border-r border-amber-400 w-28">Category</th>
                <th className="px-2 py-2 text-left border-r border-amber-400 w-40">Item Name</th>
                <th className="px-2 py-2 text-center border-r border-amber-400 w-10">Unit</th>
                {BRANCHES.map((b) => (
                  <th key={b} colSpan={3} className="px-2 py-2 text-center border-r border-amber-400 min-w-[160px]">
                    {b}
                  </th>
                ))}
              </tr>
              {/* Row 2 — sub-headers */}
              <tr className="bg-amber-400 text-white text-[10px]">
                <th className="px-2 py-1 border-r border-amber-300" />
                <th className="px-2 py-1 border-r border-amber-300" />
                <th className="px-2 py-1 border-r border-amber-300" />
                {BRANCHES.map((b) => (
                  <th key={b} colSpan={3} className="border-r border-amber-300">
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
                    {BRANCHES.map((b) => {
                      const qty   = getQty(b, item.name);
                      const price = getPrice(b, item.name);
                      const total = getTotal(b, item.name);
                      return (
                        <td key={b} colSpan={3} className="border-r border-slate-100 p-0">
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
                <td colSpan={3} className="px-2 py-2 text-right text-xs border-r border-slate-300">Total</td>
                {BRANCHES.map((b) => (
                  <td key={b} colSpan={3} className="border-r border-slate-300 p-0">
                    <div className="grid grid-cols-3 divide-x divide-slate-300">
                      <span />
                      <span />
                      <span className="px-2 py-2 text-center tabular-nums">
                        {branchMap[b]?.grandTotal > 0 ? branchMap[b].grandTotal : ''}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Admin: individual entries for deletion */}
      {can('manageUsers') && records.length > 0 && (
        <div className="print:hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
            Entries ({records.length})
          </div>
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                <th className="px-3 py-2 text-left">Entry No</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Branch</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {[...records]
                .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
                .map((rec) => (
                  <tr key={rec.id} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-mono">{rec.entryNo}</td>
                    <td className="px-3 py-1.5">{new Date(rec.saleDate).toLocaleDateString('en-PK')}</td>
                    <td className="px-3 py-1.5">{rec.branch || <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{rec.grandTotal}</td>
                    <td className="px-3 py-1.5 text-center">
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3 w-3" /> Del
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

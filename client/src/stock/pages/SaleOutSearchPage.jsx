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
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit print:hidden dark:border-slate-700 dark:bg-slate-800">
      {[
        { key: 'perishable', label: 'Perishable' },
        { key: 'nonperishable', label: 'Non-Perishable' },
      ].map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-lg px-5 py-1.5 text-sm font-medium transition-colors ${
            active === t.key
              ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100'
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

  const catalog = activeTab === 'perishable' ? SALEOUT_CATALOG : NP_CATALOG;
  const allItems = activeTab === 'perishable' ? ALL_ITEMS : NP_ALL_ITEMS;

  useEffect(() => {
    fetchRecords({ from, to, type: activeTab });
  }, [activeTab]);

  const handleSearch = () => fetchRecords({ from, to, type: activeTab });

  const handleDelete = async (id) => {
    if (!confirm('Delete this Sale Out entry?')) return;
    await deleteRecord(id);
    fetchRecords({ from, to, type: activeTab });
  };

  // Group records by date key → branch
  const dateMap = {};
  records.forEach((rec) => {
    const dk = new Date(rec.saleDate).toISOString().slice(0, 10);
    if (!dateMap[dk]) dateMap[dk] = {};
    dateMap[dk][rec.branch || ''] = rec;
  });
  const dates = Object.keys(dateMap).sort();

  // Build flat column list: one entry per date×branch combination
  const cols = [];
  dates.forEach((dk) => {
    BRANCHES.forEach((br) => {
      cols.push({ dk, br, rec: dateMap[dk]?.[br] ?? null });
    });
  });

  const getQty = (rec, itemName) => {
    if (!rec) return 0;
    const line = rec.lines.find((l) => l.itemName === itemName);
    return line?.qty ?? 0;
  };

  return (
    <>
      <PageHeader title="Sale Out — Browse" subtitle="View all sale out entries grouped by date and branch." />

      <Tabs active={activeTab} onChange={setActiveTab} />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 print:hidden dark:border-slate-700 dark:bg-slate-800">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
        </div>
        <button onClick={handleSearch}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
          Search
        </button>
        <button onClick={() => window.print()}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

      {!loading && dates.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No {activeTab === 'perishable' ? 'Perishable' : 'Non-Perishable'} entries found for this date range.
        </p>
      )}

      {!loading && cols.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-amber-500 text-white">
                <th className="w-28 px-2 py-2 text-left border-r border-amber-400">Category</th>
                <th className="w-40 px-2 py-2 text-left border-r border-amber-400">Item Name</th>
                <th className="w-12 px-2 py-2 text-center border-r border-amber-400">Unit</th>
                {cols.map((col) => (
                  <th key={`${col.dk}-${col.br}`} className="px-2 py-2 text-center border-r border-amber-400 min-w-[90px]">
                    <div className="font-semibold">{fmtDate(col.dk)}</div>
                    <div className="text-[11px] font-medium opacity-90 mt-0.5">{col.br}</div>
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
                    {cols.map((col) => {
                      const qty = getQty(col.rec, item.name);
                      return (
                        <td key={`${col.dk}-${col.br}`} className="px-2 py-1 text-center tabular-nums border-r border-slate-100">
                          {qty > 0 ? qty : <span className="text-slate-300 dark:text-slate-600">0</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-green-200 font-semibold text-green-900 dark:bg-green-900/30 dark:text-green-200 dark:border-slate-600">
                <td colSpan={3} className="px-2 py-2 text-right text-xs border-r border-slate-300 dark:border-slate-600">Daily Total</td>
                {cols.map((col) => (
                  <td key={`${col.dk}-${col.br}`} className="px-2 py-2 text-center tabular-nums border-r border-slate-300 dark:border-slate-600">
                    {col.rec
                      ? formatCurrency(col.rec.grandTotal)
                      : <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>}
                  </td>
                ))}
              </tr>
              {can('manageUsers') && (
                <tr className="print:hidden bg-slate-50 border-t border-slate-200 dark:bg-slate-900/50 dark:border-slate-700">
                  <td colSpan={3} className="px-2 py-1 text-xs text-slate-400 border-r border-slate-200 dark:border-slate-700">Actions</td>
                  {cols.map((col) => (
                    <td key={`${col.dk}-${col.br}`} className="px-2 py-1 text-center border-r border-slate-200 dark:border-slate-700">
                      {col.rec && (
                        <button
                          onClick={() => handleDelete(col.rec.id)}
                          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                        >
                          <Trash2 className="h-3 w-3" /> Del
                        </button>
                      )}
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

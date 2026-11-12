import { useEffect, useState } from 'react';
import { Check, Pencil, Printer, Trash2, X } from 'lucide-react';
import { useSaleOutStore } from '../useSaleOutStore';
import { SALEOUT_CATALOG, ALL_ITEMS } from '../catalog/saleOutCatalog';
import { NP_CATALOG, NP_ALL_ITEMS } from '../catalog/nonPerishableCatalog';
import { BRANCHES } from '../components/DispatchSheetForm';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/format';
import { useCan } from '../../utils/permissions';

const ninetyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
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
  const { records, loading, error, fetchRecords, deleteRecord, updateRecord } = useSaleOutStore();
  const can = useCan();

  const [activeTab, setActiveTab] = useState('perishable');
  const [from, setFrom] = useState(ninetyDaysAgo());
  const [to, setTo] = useState(today());
  const [filterBranch, setFilterBranch] = useState('');
  const [editColKey, setEditColKey] = useState(null);
  const [editQtys, setEditQtys] = useState({});
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);

  const catalog = activeTab === 'perishable' ? SALEOUT_CATALOG : NP_CATALOG;
  const allItems = activeTab === 'perishable' ? ALL_ITEMS : NP_ALL_ITEMS;

  useEffect(() => {
    fetchRecords({ from, to, type: activeTab, ...(filterBranch && { branch: filterBranch }) });
  }, [activeTab]);

  const handleSearch = () =>
    fetchRecords({ from, to, type: activeTab, ...(filterBranch && { branch: filterBranch }) });

  const handleDelete = async (id) => {
    if (!confirm('Delete this Sale Out entry?')) return;
    await deleteRecord(id);
    fetchRecords({ from, to, type: activeTab });
  };

  const startEdit = (col) => {
    const qtys = {};
    allItems.forEach((it) => {
      const line = col.rec?.lines.find((l) => l.itemName === it.name);
      qtys[it.name] = line?.qty ?? 0;
    });
    setEditQtys(qtys);
    setEditDate(new Date(col.rec.saleDate).toISOString().slice(0, 10));
    setEditColKey(`${col.dk}-${col.br}`);
  };

  const cancelEdit = () => { setEditColKey(null); setEditQtys({}); setEditDate(''); };

  const saveEdit = async (col) => {
    setSaving(true);
    try {
      const lines = catalog.flatMap((cat) =>
        cat.items
          .filter((it) => Number(editQtys[it.name]) > 0)
          .map((it) => {
            const existing = col.rec.lines.find((l) => l.itemName === it.name);
            const qty = Number(editQtys[it.name]);
            return {
              category: cat.category,
              itemName: it.name,
              unit: 'per',
              qty,
              received: existing?.received ?? qty,
              price: existing?.price ?? it.price,
            };
          })
      );
      await updateRecord(col.rec.id, { lines, saleDate: editDate });
      cancelEdit();
      fetchRecords({ from, to, type: activeTab });
    } finally {
      setSaving(false);
    }
  };

  // Group records by date key → branch (most recent entry wins per slot)
  const dateMap = {};
  [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach((rec) => {
    const dk = new Date(rec.saleDate).toISOString().slice(0, 10);
    if (!dateMap[dk]) dateMap[dk] = {};
    const brKey = rec.branch || '';
    if (!dateMap[dk][brKey]) dateMap[dk][brKey] = rec; // first = most recent
  });
  const dates = Object.keys(dateMap).sort();

  // Build flat column list: selected branch only, or all 5 + any extras
  const activeBranches = filterBranch ? [filterBranch] : BRANCHES;
  const cols = [];
  dates.forEach((dk) => {
    const knownBranchSet = new Set(BRANCHES);
    activeBranches.forEach((br) => {
      cols.push({ dk, br, rec: dateMap[dk]?.[br] ?? null });
    });
    // Show any entries saved without a recognised branch (e.g. old records) — only when showing all
    if (!filterBranch) {
      Object.keys(dateMap[dk]).forEach((brKey) => {
        if (!knownBranchSet.has(brKey)) {
          cols.push({ dk, br: brKey || '(No Branch)', rec: dateMap[dk][brKey] });
        }
      });
    }
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
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Branch</label>
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="">All Branches</option>
            {BRANCHES.map((br) => (
              <option key={br} value={br}>{br}</option>
            ))}
          </select>
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
                {cols.map((col) => {
                  const colKey = `${col.dk}-${col.br}`;
                  const isEditing = editColKey === colKey;
                  return (
                    <th key={colKey} className="px-2 py-2 text-center border-r border-amber-400 min-w-[90px]">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full rounded border border-amber-300 bg-amber-50 px-1 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      ) : (
                        <div className="font-semibold">{fmtDate(col.dk)}</div>
                      )}
                      <div className="text-[11px] font-medium opacity-90 mt-0.5">{col.br}</div>
                    </th>
                  );
                })}
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
                      const colKey = `${col.dk}-${col.br}`;
                      const isEditing = editColKey === colKey;
                      const qty = getQty(col.rec, item.name);
                      return (
                        <td key={colKey} className="px-1 py-0.5 text-center tabular-nums border-r border-slate-100">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editQtys[item.name] ?? 0}
                              onChange={(e) => setEditQtys((prev) => ({ ...prev, [item.name]: e.target.value }))}
                              className="w-14 rounded border border-indigo-300 px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-indigo-600 dark:bg-slate-700 dark:text-slate-100"
                            />
                          ) : (
                            qty > 0 ? qty : <span className="text-slate-300 dark:text-slate-600">0</span>
                          )}
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
              <tr className="print:hidden bg-slate-50 border-t border-slate-200 dark:bg-slate-900/50 dark:border-slate-700">
                <td colSpan={3} className="px-2 py-1 text-xs text-slate-400 border-r border-slate-200 dark:border-slate-700">Actions</td>
                {cols.map((col) => {
                  const colKey = `${col.dk}-${col.br}`;
                  const isEditing = editColKey === colKey;
                  return (
                    <td key={colKey} className="px-1 py-1 text-center border-r border-slate-200 dark:border-slate-700">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveEdit(col)}
                            disabled={saving}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        col.rec && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => startEdit(col)}
                              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                            {can('manageUsers') && (
                              <button
                                onClick={() => handleDelete(col.rec.id)}
                                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                              >
                                <Trash2 className="h-3 w-3" /> Del
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}

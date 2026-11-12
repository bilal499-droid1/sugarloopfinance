import { Fragment, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useSaleOutStore } from '../useSaleOutStore';
import { useItemPricesStore } from '../useItemPricesStore';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/format';

export const BRANCHES = [
  'DHA Phase 1',
  'DHA Phase 2',
  'Bahria Phase 4',
  'NUST 1',
  'NUST 2',
];

let _rowId = 0;
const newRow = () => ({ id: ++_rowId, name: '', price: '', dispatched: '', received: '' });

export default function DispatchSheetForm({ catalog, allItems, type, saleDate, onSaleDateChange, branch, onBranchChange }) {
  const createRecord = useSaleOutStore((s) => s.createRecord);
  const updateRecord = useSaleOutStore((s) => s.updateRecord);
  const storePricesMap = useItemPricesStore((s) => s.prices);
  const fetchPrices = useItemPricesStore((s) => s.fetchPrices);
  const getPrice = useItemPricesStore((s) => s.getPrice);

  const blankQtys = () => Object.fromEntries(allItems.map((it) => [it.name, '']));
  const blankPrices = () => Object.fromEntries(allItems.map((it) => [it.name, getPrice(type, it.name, it.price)]));
  const blankCustomRows = () => Object.fromEntries(catalog.map((cat) => [cat.category, []]));

  const [notes, setNotes] = useState('');
  const [dispatched, setDispatched] = useState(blankQtys);
  const [received, setReceived] = useState(blankQtys);
  const [prices, setPrices] = useState(blankPrices);
  const [customRows, setCustomRows] = useState(blankCustomRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const searchInputRef = useRef(null);

  const tableRef = useRef(null);

  // Arrow-key navigation between rows in the same column
  const handleArrow = (e, navKey) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (!tableRef.current) return;
    const all = Array.from(tableRef.current.querySelectorAll(`input[data-nav="${navKey}"]`));
    const idx = all.indexOf(e.currentTarget);
    const target = all[e.key === 'ArrowDown' ? idx + 1 : idx - 1];
    if (target) { target.focus(); target.select(); }
  };

  // Ctrl+F → focus search box
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Scroll to first match when query changes
  useEffect(() => {
    if (!searchQuery.trim() || !tableRef.current) return;
    const first = tableRef.current.querySelector('[data-search-match="true"]');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchQuery]);

  // Load a saved record back into the form for editing
  const loadForEdit = (rec) => {
    const catalogMap = Object.fromEntries(
      rec.lines
        .filter((l) => allItems.some((it) => it.name === l.itemName))
        .map((l) => [l.itemName, l])
    );
    const newDispatched = {};
    const newReceived = {};
    const newPrices = {};
    allItems.forEach((it) => {
      const l = catalogMap[it.name];
      newDispatched[it.name] = l?.qty ?? '';
      newReceived[it.name] = l?.received ?? '';
      newPrices[it.name] = l?.price ?? getPrice(type, it.name, it.price);
    });
    setDispatched(newDispatched);
    setReceived(newReceived);
    setPrices(newPrices);
    setNotes(rec.notes || '');

    const newCustomRows = Object.fromEntries(catalog.map((cat) => [cat.category, []]));
    rec.lines
      .filter((l) => !allItems.some((it) => it.name === l.itemName))
      .forEach((l) => {
        if (newCustomRows[l.category] !== undefined) {
          newCustomRows[l.category].push({ id: ++_rowId, name: l.itemName, price: l.price, dispatched: l.qty, received: l.received ?? l.qty });
        }
      });
    setCustomRows(newCustomRows);

    onSaleDateChange(new Date(rec.saleDate).toISOString().slice(0, 10));
    onBranchChange(rec.branch || '');
    setEditingId(rec.id);
    setSaved(null);
  };

  // Fetch stored prices on mount and re-sync whenever the store updates
  useEffect(() => { fetchPrices(type); }, [type]);
  useEffect(() => {
    setPrices((prev) => {
      const updated = { ...prev };
      allItems.forEach((it) => {
        const sp = storePricesMap[`${type}:${it.name}`];
        if (sp !== undefined) updated[it.name] = sp;
      });
      return updated;
    });
  }, [storePricesMap]);

  const setDispatchedQty = (name, val) => {
    const n = val === '' ? '' : Math.max(0, Number(val));
    setDispatched((prev) => ({ ...prev, [name]: n }));
    setReceived((prev) => ({ ...prev, [name]: n }));
  };

  const setReceivedQty = (name, val) => {
    const n = val === '' ? '' : Math.max(0, Number(val));
    setReceived((prev) => ({ ...prev, [name]: n }));
  };

  const addCustomRow = (category) =>
    setCustomRows((prev) => ({ ...prev, [category]: [...prev[category], newRow()] }));

  const removeCustomRow = (category, id) =>
    setCustomRows((prev) => ({ ...prev, [category]: prev[category].filter((r) => r.id !== id) }));

  const updateCustomRow = (category, id, field, val) =>
    setCustomRows((prev) => ({
      ...prev,
      [category]: prev[category].map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };
        if (field === 'dispatched') updated.received = val;
        if (field === 'name') {
          const trimmed = val.trim();
          // Duplicate check: catalog items
          const isCatalogDup = allItems.some((it) => it.name.toLowerCase() === trimmed.toLowerCase());
          // Duplicate check: other custom rows across all categories
          const allCustomNames = Object.values(prev).flat()
            .filter((cr) => cr.id !== id)
            .map((cr) => cr.name.trim().toLowerCase());
          const isCustomDup = allCustomNames.includes(trimmed.toLowerCase());
          updated.dupError = trimmed && (isCatalogDup || isCustomDup)
            ? isCatalogDup
              ? `"${trimmed}" is already in the catalog — enter qty directly in its row above.`
              : `"${trimmed}" is already added.`
            : '';
          // Auto-fill price from catalog
          const catalogMatch = allItems.find((it) => it.name === val);
          if (catalogMatch) updated.price = getPrice(type, val, catalogMatch.price);
        }
        return updated;
      }),
    }));

  const grandTotal =
    allItems.reduce((sum, it) => {
      return sum + (Number(dispatched[it.name]) || 0) * (Number(prices[it.name]) || it.price);
    }, 0) +
    catalog.reduce((sum, cat) => {
      return (
        sum +
        customRows[cat.category].reduce(
          (s, r) => s + (Number(r.dispatched) || 0) * (Number(r.price) || 0),
          0
        )
      );
    }, 0);

  const handleSave = async () => {
    setError(null);

    const catalogLines = allItems
      .filter((it) => Number(dispatched[it.name]) > 0)
      .map((it) => ({
        category: it.category,
        itemName: it.name,
        unit: 'per',
        qty: Number(dispatched[it.name]),
        received: Number(received[it.name]) || 0,
        price: Number(prices[it.name]) || it.price,
      }));

    const customLines = catalog.flatMap((cat) =>
      customRows[cat.category]
        .filter((r) => r.name.trim() && Number(r.dispatched) > 0)
        .map((r) => ({
          category: cat.category,
          itemName: r.name.trim(),
          unit: 'per',
          qty: Number(r.dispatched),
          received: Number(r.received) || 0,
          price: Number(r.price) || 0,
        }))
    );

    if (!branch) {
      setError('Please select a branch.');
      return;
    }
    const hasDups = Object.values(customRows).flat().some((r) => r.dupError);
    if (hasDups) {
      setError('Fix duplicate item names before saving.');
      return;
    }
    const lines = [...catalogLines, ...customLines];

    setSaving(true);
    try {
      const record = editingId
        ? await updateRecord(editingId, { saleDate, branch, lines, notes, type })
        : await createRecord({ saleDate, branch, lines, notes, type });
      setSaved(record);
      setEditingId(null);
      setDispatched(blankQtys());
      setReceived(blankQtys());
      setPrices(blankPrices());
      setCustomRows(blankCustomRows());
      setNotes('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const searchQ = searchQuery.trim().toLowerCase();
  const isMatch = (name) => searchQ && name.toLowerCase().includes(searchQ);
  const matchCount = searchQ ? allItems.filter((it) => isMatch(it.name)).length : 0;
  const suggestions = searchQ
    ? allItems.filter((it) => it.name.toLowerCase().includes(searchQ)).slice(0, 8)
    : [];

  let serial = 0;

  return (
    <>
      <PageHeader title="Dispatch & Wastage Sheet" subtitle="Record daily dispatch, received, and wastage by product." />

      {saved && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            <strong>{saved.entryNo}</strong> saved — {formatCurrency(saved.grandTotal)}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <button
              className="rounded border border-emerald-400 px-3 py-0.5 text-xs font-medium hover:bg-emerald-100"
              onClick={() => loadForEdit(saved)}
            >
              Edit
            </button>
            <button className="text-xs underline" onClick={() => setSaved(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
      )}

      {/* Date + Branch + Notes */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Date</label>
          <input
            type="date"
            value={saleDate}
            onChange={(e) => onSaleDateChange(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Branch <span className="text-rose-400">*</span></label>
          <select
            value={branch}
            onChange={(e) => onBranchChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="">— select branch —</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Search Item
            {searchQ && <span className="ml-2 text-indigo-500">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>}
          </label>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); setSuggestionIndex(-1); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setSearchQuery(''); setShowSuggestions(false); setSuggestionIndex(-1); return; }
                if (!showSuggestions || suggestions.length === 0) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1)); return; }
                if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestionIndex((i) => Math.max(i - 1, -1)); return; }
                const active = suggestionIndex >= 0 ? suggestions[suggestionIndex] : suggestions[0];
                if (e.key === 'Tab') {
                  e.preventDefault();
                  setSearchQuery(active.name);
                  setShowSuggestions(false);
                  setSuggestionIndex(-1);
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setSearchQuery(active.name);
                  setShowSuggestions(false);
                  setSuggestionIndex(-1);
                  setTimeout(() => {
                    if (!tableRef.current) return;
                    const first = tableRef.current.querySelector('[data-search-match="true"]');
                    if (first) {
                      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      const inp = first.querySelector('input[data-nav="dispatched"]');
                      if (inp) inp.focus();
                    }
                  }, 50);
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => { setShowSuggestions(false); setSuggestionIndex(-1); }, 200)}
              placeholder="Search items… (Ctrl+F)"
              autoComplete="off"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {searchQ && (
              <button onMouseDown={(e) => { e.preventDefault(); setSearchQuery(''); setShowSuggestions(false); setSuggestionIndex(-1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
                {suggestions.map((it, si) => {
                  const idx = it.name.toLowerCase().indexOf(searchQ);
                  const isActive = si === suggestionIndex || (suggestionIndex === -1 && si === 0 && false);
                  return (
                    <div
                      key={it.name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(it.name);
                        setShowSuggestions(false);
                        setSuggestionIndex(-1);
                        setTimeout(() => {
                          if (!tableRef.current) return;
                          const first = tableRef.current.querySelector('[data-search-match="true"]');
                          if (first) {
                            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            const inp = first.querySelector('input[data-nav="dispatched"]');
                            if (inp) inp.focus();
                          }
                        }, 50);
                      }}
                      className={`cursor-pointer border-b border-slate-100 px-3 py-2 text-sm last:border-0 dark:border-slate-700 ${isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-900/40'}`}
                    >
                      {it.name.slice(0, idx)}
                      <span className="bg-yellow-200 font-semibold text-slate-900 dark:bg-yellow-500 dark:text-slate-900">
                        {it.name.slice(idx, idx + searchQ.length)}
                      </span>
                      {it.name.slice(idx + searchQ.length)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-48">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning shift"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Datalist for custom-row autocomplete */}
      <datalist id={`catalog-items-${type}`}>
        {allItems.map((it) => <option key={it.name} value={it.name} />)}
      </datalist>

      {/* Entry table */}
      <div ref={tableRef} className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <table className="min-w-full text-sm">
          <tbody>
            {catalog.map((cat) => (
              <Fragment key={cat.category}>
                {/* Category header */}
                <tr className={cat.headerClass}>
                  <th colSpan={7} className="px-3 py-2 text-center text-sm font-bold uppercase tracking-wide">
                    {cat.category}
                  </th>
                </tr>
                {/* Column sub-header */}
                <tr className="bg-slate-200 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase">
                  <th className="w-10 px-3 py-1.5 text-center border-r border-slate-200">#</th>
                  <th className="px-3 py-1.5 text-left">Item Name</th>
                  <th className="w-28 px-3 py-1.5 text-center">Dispatched</th>
                  <th className="w-28 px-3 py-1.5 text-center">Received</th>
                  <th className="w-28 px-3 py-1.5 text-right">Price</th>
                  <th className="w-28 px-3 py-1.5 text-right">Daily Total</th>
                  <th className="w-10 px-3 py-1.5" />
                </tr>

                {/* Catalog item rows */}
                {cat.items.map((item) => {
                  serial++;
                  const qty = Number(dispatched[item.name]) || 0;
                  const price = Number(prices[item.name]) || item.price;
                  const total = qty * price;
                  const matched = isMatch(item.name);
                  return (
                    <tr key={item.name} data-search-match={matched || undefined} className={`border-t border-slate-100 ${matched ? 'bg-yellow-100 dark:bg-yellow-900/30' : cat.colorClass}`}>
                      <td className="px-3 py-1.5 text-center text-slate-400 text-xs border-r border-slate-200">
                        {serial}
                      </td>
                      <td className="px-3 py-1.5">
                        {matched ? (() => {
                          const idx = item.name.toLowerCase().indexOf(searchQ);
                          return <><span>{item.name.slice(0, idx)}</span><span className="bg-yellow-300 font-semibold text-slate-900 dark:bg-yellow-500 dark:text-slate-900">{item.name.slice(idx, idx + searchQ.length)}</span><span>{item.name.slice(idx + searchQ.length)}</span></>;
                        })() : item.name}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          data-nav="dispatched"
                          data-item-name={item.name}
                          value={dispatched[item.name]}
                          onChange={(e) => setDispatchedQty(item.name, e.target.value)}
                          onKeyDown={(e) => handleArrow(e, 'dispatched')}
                          className="w-20 rounded border border-slate-300 px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          data-nav="received"
                          value={received[item.name]}
                          onChange={(e) => setReceivedQty(item.name, e.target.value)}
                          onKeyDown={(e) => handleArrow(e, 'received')}
                          className="w-20 rounded border border-slate-300 px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <span className="inline-block w-24 px-2 py-0.5 text-right text-sm tabular-nums text-slate-600">
                          {prices[item.name] > 0 ? prices[item.name] : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                        {total > 0 ? formatCurrency(total) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-1.5" />
                    </tr>
                  );
                })}

                {/* Custom item rows */}
                {customRows[cat.category].map((row) => {
                  serial++;
                  const qty = Number(row.dispatched) || 0;
                  const price = Number(row.price) || 0;
                  const total = qty * price;
                  return (
                    <tr key={row.id} className={`border-t border-slate-100 ${cat.colorClass}`}>
                      <td className="px-3 py-1.5 text-center text-slate-400 text-xs border-r border-slate-200">
                        {serial}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          list={`catalog-items-${type}`}
                          value={row.name}
                          placeholder="Item name"
                          onChange={(e) => updateCustomRow(cat.category, row.id, 'name', e.target.value)}
                          className={`w-full rounded border px-2 py-0.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                            row.dupError
                              ? 'border-rose-400 bg-rose-50 focus:ring-rose-400 dark:border-rose-600 dark:bg-rose-900/20'
                              : 'border-indigo-200 bg-indigo-50 focus:ring-indigo-400 dark:border-indigo-700 dark:bg-indigo-900/30'
                          } dark:text-slate-100`}
                        />
                        {row.dupError && <p className="mt-0.5 text-xs text-rose-500 leading-tight">{row.dupError}</p>}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          data-nav="dispatched"
                          value={row.dispatched}
                          placeholder="0"
                          onChange={(e) => updateCustomRow(cat.category, row.id, 'dispatched', e.target.value)}
                          onKeyDown={(e) => handleArrow(e, 'dispatched')}
                          className="w-20 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          data-nav="received"
                          value={row.received}
                          placeholder="0"
                          onChange={(e) => updateCustomRow(cat.category, row.id, 'received', e.target.value)}
                          onKeyDown={(e) => handleArrow(e, 'received')}
                          className="w-20 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          data-nav="price"
                          value={row.price}
                          placeholder="0"
                          onChange={(e) => updateCustomRow(cat.category, row.id, 'price', e.target.value)}
                          onKeyDown={(e) => handleArrow(e, 'price')}
                          className="w-24 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                        {total > 0 ? formatCurrency(total) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => removeCustomRow(cat.category, row.id)}
                          className="text-rose-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Add item */}
                <tr className={`border-t border-dashed border-slate-200 ${cat.colorClass}`}>
                  <td colSpan={7} className="px-3 py-1.5">
                    <button
                      onClick={() => addCustomRow(cat.category)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add item
                    </button>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-green-100 font-semibold dark:border-slate-600 dark:bg-green-900/30">
              <td colSpan={5} className="px-3 py-2 text-right text-sm dark:text-slate-200">Grand Total</td>
              <td className="px-3 py-2 text-right tabular-nums text-green-800 dark:text-green-300">{formatCurrency(grandTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : editingId ? 'Update Entry' : 'Save Entry'}
        </button>
      </div>
    </>
  );
}

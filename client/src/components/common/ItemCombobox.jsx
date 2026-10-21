import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';

// Combo-box for item selection that also allows creating a new inventory item inline.
// `itemId` is the currently selected item id; `onChange(id)` is called when it changes.
export default function ItemCombobox({ itemId, onChange, className, placeholder = 'Select or type item…' }) {
  const items = useFinanceStore((s) => s.items);
  const saveItem = useFinanceStore((s) => s.saveItem);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef(null);

  const selected = items.find((i) => i.id === itemId);

  useEffect(() => {
    if (!open) setQuery(selected?.name ?? '');
  }, [open, selected?.name]);

  const filtered = query.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : items;
  const exactMatch = items.some((i) => i.name.toLowerCase() === query.trim().toLowerCase());
  const showAdd = query.trim().length > 0 && !exactMatch;

  const pick = (item) => {
    onChange(item.id);
    setQuery(item.name);
    setOpen(false);
  };

  const addNew = async () => {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const newItem = await saveItem({ name, unit: '', reorderLevel: 0, openingStock: 0 });
      onChange(newItem.id);
      setQuery(newItem.name);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const close = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        className={className}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onChange('');
        }}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
      />
      {open && (
        <ul className="absolute z-20 mt-0.5 max-h-52 w-full overflow-auto rounded-md border border-slate-200 bg-white text-sm shadow-lg">
          {filtered.map((i) => (
            <li
              key={i.id}
              onMouseDown={() => pick(i)}
              className="cursor-pointer px-3 py-1.5 hover:bg-indigo-50"
            >
              {i.name}
              {i.unit && <span className="ml-1 text-xs text-slate-400">({i.unit})</span>}
            </li>
          ))}
          {showAdd && (
            <li
              onMouseDown={addNew}
              className="flex cursor-pointer items-center gap-1 border-t border-slate-100 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {creating ? 'Adding…' : `Add "${query.trim()}" to inventory`}
            </li>
          )}
          {!filtered.length && !showAdd && (
            <li className="px-3 py-2 text-slate-400">No items found.</li>
          )}
        </ul>
      )}
    </div>
  );
}

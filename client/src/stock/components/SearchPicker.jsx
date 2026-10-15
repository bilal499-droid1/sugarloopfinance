import { forwardRef, useState } from 'react';
import { inputClass } from '../../components/common/Field';

const MAX_OPTIONS = 50;

// Type-to-search box with a pick list, driven from the keyboard like the old POS:
// type, ↑/↓ to move, Enter to pick (and move on), Esc to close.
// `allowNew` lets Enter keep typed text that matches nothing (a new vendor);
// `allowEmpty` lets Enter on an empty box skip an optional pick. Both pick null.
const SearchPicker = forwardRef(function SearchPicker(
  { value, onChange, onPick, options, columns, placeholder, allowNew = false, allowEmpty = false, disabled = false, className = '' },
  ref
) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const q = value.trim().toLowerCase();
  const matches = options.filter((o) => !q || o.search.includes(q)).slice(0, MAX_OPTIONS);

  const pick = (option) => {
    setOpen(false);
    onPick(option);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => Math.min(Math.max(a + step, 0), Math.max(matches.length - 1, 0)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const exact = options.find((o) => o.label.toLowerCase() === q);
      if (exact) pick(exact);
      else if (open && matches[active]) pick(matches[active]);
      else if ((allowNew && q) || (allowEmpty && !q)) pick(null);
      else setOpen(true);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        className={inputClass}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {open && !disabled && matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full min-w-[22rem] overflow-auto rounded-md border border-slate-300 bg-white shadow-lg">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-100 text-left text-slate-500 uppercase">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-2 py-1 ${c.right ? 'text-right' : ''}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches.map((o, i) => (
                <tr
                  key={o.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(o);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer ${i === active ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-2 py-1 whitespace-nowrap ${c.right ? 'text-right' : ''}`}>
                      {o.cells[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export default SearchPicker;

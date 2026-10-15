import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useFinanceStore, findPreviousPrice } from '../../store/useFinanceStore';
import { errorMessage } from '../../api/client';
import { findVendorByName } from '../../utils/vendors';
import { formatCurrency, formatDate, formatNumber, today, toDateInput } from '../../utils/format';
import Field, { inputClass, buttonClass } from '../../components/common/Field';
import { lineAmount, linesTotal } from '../../components/invoice/LineItemsEditor';
import { useReturnsStore, returnedOnBill } from '../useReturnsStore';
import SearchPicker from './SearchPicker';
import { useEntryKeys } from './entryKeys';

export const RETURN_REASONS = ['Damaged', 'Expired', 'Wrong item', 'Excess quantity', 'Quality issue', 'Other'];

export const blankReturn = (returnDate = today()) => ({
  returnDate,
  vendorName: '',
  recordId: '',
  reason: RETURN_REASONS[0],
  notes: '',
  items: [],
});

export const returnFromSaved = (ret) => ({
  returnDate: toDateInput(ret.returnDate),
  vendorName: ret.vendorName,
  recordId: ret.recordId ?? '',
  reason: ret.reason ?? RETURN_REASONS[0],
  notes: ret.notes ?? '',
  items: ret.items.map(({ itemId, quantity, unitPrice }) => ({ itemId, quantity, unitPrice })),
});

const billLabel = (r) => `${formatDate(r.receiptDate)} · ${r.invoiceNumber || 'no invoice no'}`;
const blankEntry = { itemId: '', search: '', quantity: '', unitPrice: '', editIndex: null };

// Purchase return, same keyboard flow as Purchase: Date ⏎ Vendor ⏎ Against bill ⏎
// (Enter on empty = not linked) Reason ⏎, then Product ⏎ Quantity ⏎ Price ⏎ per line.
// Against a bill only that bill's products can be returned, up to what is left.
// `saved` switches it to editing that return (vendor fixed).
export default function ReturnForm({ initial, saved, onSaved, onCancel }) {
  const vendors = useFinanceStore((s) => s.vendors);
  const records = useFinanceStore((s) => s.records);
  const items = useFinanceStore((s) => s.items);
  const returns = useReturnsStore((s) => s.returns);
  const createReturn = useReturnsStore((s) => s.createReturn);
  const updateReturn = useReturnsStore((s) => s.updateReturn);
  const [form, setForm] = useState(initial);
  const initialBillLabel = () => {
    const linked = initial.recordId && records.find((r) => r.id === initial.recordId);
    return linked ? billLabel(linked) : '';
  };
  const [billSearch, setBillSearch] = useState(initialBillLabel);
  const [entry, setEntry] = useState(blankEntry);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const editing = Boolean(saved);
  const { refs, focus, nextOnEnter, saveRef } = useEntryKeys(
    ['date', 'vendor', 'bill', 'reason', 'product', 'quantity', 'price'],
    editing ? 'product' : 'date'
  );

  const vendor = editing ? vendors.find((v) => v.id === saved.vendorId) : findVendorByName(vendors, form.vendorName);
  const vendorBills = vendor
    ? records
        .filter((r) => r.vendorId === vendor.id && r.status !== 'FLAGGED' && r.items?.length)
        .sort((a, b) => new Date(b.receiptDate) - new Date(a.receiptDate))
    : [];
  const bill = vendorBills.find((r) => r.id === form.recordId);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const currency = bill?.currency;
  const total = linesTotal(form.items);

  // What is still returnable per product on the chosen bill (before this form's lines).
  const left = new Map();
  if (bill) {
    const returned = returnedOnBill(returns, bill.id, saved?.id);
    for (const line of bill.items) left.set(line.itemId, (left.get(line.itemId) ?? 0) + line.quantity);
    for (const [itemId, qty] of returned) if (left.has(itemId)) left.set(itemId, left.get(itemId) - qty);
  }
  const inForm = (itemId, skipIndex) =>
    form.items.reduce((sum, l, i) => (l.itemId === itemId && i !== skipIndex ? sum + Number(l.quantity) : sum), 0);
  const billPrice = (itemId) => bill?.items.find((l) => l.itemId === itemId)?.unitPrice;
  const priceFor = (itemId) =>
    billPrice(itemId) ?? (vendor ? findPreviousPrice(records, { vendorId: vendor.id, itemId, beforeDate: form.returnDate }) : undefined);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // ---- Pick lists ----
  const vendorOptions = vendors.map((v) => ({
    id: v.id,
    label: v.name,
    search: `${v.code} ${v.name} ${v.address ?? ''}`.toLowerCase(),
    cells: { code: v.code, name: v.name, address: v.address ?? '' },
  }));
  const vendorColumns = [
    { key: 'code', label: 'ID' },
    { key: 'name', label: 'Vendor' },
    { key: 'address', label: 'Address' },
  ];

  const billOptions = vendorBills.map((r) => ({
    id: r.id,
    label: billLabel(r),
    search: `${r.invoiceNumber ?? ''} ${formatDate(r.receiptDate)} ${toDateInput(r.receiptDate)}`.toLowerCase(),
    cells: { date: formatDate(r.receiptDate), inv: r.invoiceNumber || '—', products: r.items.length, amount: formatNumber(r.amount) },
  }));
  const billColumns = [
    { key: 'date', label: 'Dated' },
    { key: 'inv', label: 'Inv #' },
    { key: 'products', label: 'Products', right: true },
    { key: 'amount', label: 'Amount', right: true },
  ];

  const productOptions = (bill ? items.filter((i) => left.has(i.id)) : items).map((i) => {
    const price = priceFor(i.id);
    return {
      id: i.id,
      label: i.name,
      search: i.name.toLowerCase(),
      cells: {
        name: i.name,
        unit: i.unit,
        inHand: formatNumber(i.inHand),
        left: bill ? formatNumber((left.get(i.id) ?? 0) - inForm(i.id)) : '',
        price: price === undefined ? '—' : formatNumber(price),
      },
    };
  });
  const productColumns = [
    { key: 'name', label: 'Product' },
    { key: 'unit', label: 'Unit' },
    { key: 'inHand', label: 'In hand', right: true },
    ...(bill ? [{ key: 'left', label: 'Left on bill', right: true }] : []),
    { key: 'price', label: bill ? 'Bill price' : 'Last price', right: true },
  ];

  // ---- Header picks ----
  const pickVendor = (option) => {
    if (!option) return;
    setForm((f) => ({ ...f, vendorName: option.label, recordId: '', items: f.vendorName === option.label ? f.items : [] }));
    setBillSearch('');
    focus('bill');
  };

  // Switching to a different bill means different products and prices, so the
  // lines start over; unlinking (Enter on an empty box) keeps them.
  const pickBill = (option) => {
    const recordId = option?.id ?? '';
    setBillSearch(option?.label ?? '');
    if (recordId !== form.recordId) {
      setForm((f) => ({ ...f, recordId, items: recordId ? [] : f.items }));
      setEntry(blankEntry);
    }
    focus('reason');
  };

  // ---- Product entry ----
  const pickProduct = (option) => {
    if (!option) return;
    setEntry((en) => ({ ...en, itemId: option.id, search: option.label, unitPrice: en.editIndex !== null ? en.unitPrice : priceFor(option.id) ?? '' }));
    focus('quantity');
  };

  const commitEntry = () => {
    if (!entry.itemId) return focus('product');
    const qty = Number(entry.quantity);
    if (!(qty > 0)) return focus('quantity');
    if (bill) {
      const room = (left.get(entry.itemId) ?? 0) - inForm(entry.itemId, entry.editIndex ?? -1);
      if (qty > room + 1e-9) {
        setError(`Only ${formatNumber(room)} ${itemById.get(entry.itemId)?.unit ?? ''} of ${entry.search} left to return on this bill.`);
        return focus('quantity');
      }
    }
    if (entry.unitPrice === '' || Number(entry.unitPrice) < 0) return focus('price');
    const line = { itemId: entry.itemId, quantity: qty, unitPrice: Number(entry.unitPrice) };
    setForm((f) => ({
      ...f,
      items: entry.editIndex === null ? [...f.items, line] : f.items.map((l, i) => (i === entry.editIndex ? line : l)),
    }));
    setEntry(blankEntry);
    setError('');
    focus('product');
  };

  const editLine = (index) => {
    const line = form.items[index];
    setEntry({ itemId: line.itemId, search: itemById.get(line.itemId)?.name ?? '', quantity: line.quantity, unitPrice: line.unitPrice, editIndex: index });
    focus('quantity');
  };

  const removeLine = (index) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
    if (entry.editIndex !== null) setEntry(blankEntry);
  };

  const fillFromBill = () => {
    setForm((f) => ({
      ...f,
      items: [...left].filter(([, qty]) => qty > 0).map(([itemId, qty]) => ({ itemId, quantity: qty, unitPrice: billPrice(itemId) })),
    }));
    setEntry(blankEntry);
  };

  // Clear: throw away what's typed and start again (nothing is saved).
  const clear = () => {
    setForm(initial);
    setBillSearch(initialBillLabel());
    setEntry(blankEntry);
    setError('');
    focus(editing ? 'product' : 'date');
  };

  // ---- Save ----
  const save = async () => {
    if (busy) return;
    if (!vendor) {
      setError('Goods can only be returned to an existing vendor.');
      return focus('vendor');
    }
    if (!form.items.length) {
      setError('Add at least one product to return.');
      return focus('product');
    }
    const payload = {
      returnDate: form.returnDate,
      recordId: form.recordId || null,
      reason: form.reason,
      notes: form.notes,
      items: form.items.map(({ itemId, quantity, unitPrice }) => ({ itemId, quantity: Number(quantity), unitPrice: Number(unitPrice) })),
    };
    setBusy(true);
    setError('');
    try {
      onSaved(editing ? await updateReturn(saved.id, payload) : await createReturn({ ...payload, vendorId: vendor.id }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  saveRef.current = save; // Ctrl+S

  const entryItem = itemById.get(entry.itemId);
  const entryRoom = bill && entry.itemId ? (left.get(entry.itemId) ?? 0) - inForm(entry.itemId, entry.editIndex ?? -1) : null;
  const entryAmount = lineAmount(entry);
  const label = 'text-xs font-medium text-slate-500 uppercase';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      {/* ---- Return header ---- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <Field label="Dated">
          <input ref={refs.date} type="date" required className={inputClass} value={form.returnDate} onChange={set('returnDate')} onKeyDown={nextOnEnter('vendor')} />
        </Field>
        <Field label="Vendor" className="sm:col-span-3">
          <SearchPicker
            ref={refs.vendor}
            value={form.vendorName}
            disabled={editing}
            onChange={(vendorName) => {
              setForm((f) => ({ ...f, vendorName, recordId: '' }));
              setBillSearch('');
            }}
            onPick={pickVendor}
            options={vendorOptions}
            columns={vendorColumns}
            placeholder="Type to search vendors"
          />
          {vendor ? (
            <span className="mt-1 block text-xs text-slate-500">
              {vendor.code} · {vendorBills.length} bill{vendorBills.length === 1 ? '' : 's'} with products
            </span>
          ) : (
            !editing &&
            form.vendorName.trim() && <span className="mt-1 block text-xs text-amber-700">No vendor with this name — pick one from the list.</span>
          )}
        </Field>
        <Field label="Against bill (optional)" className="sm:col-span-2">
          <SearchPicker
            ref={refs.bill}
            value={billSearch}
            disabled={!vendor}
            onChange={setBillSearch}
            onPick={pickBill}
            options={billOptions}
            columns={billColumns}
            allowEmpty
            placeholder={vendor ? 'Search date or invoice no — Enter to skip' : 'Pick the vendor first'}
          />
          {bill && (
            <span className="mt-1 block text-xs text-slate-500">
              Bill total {formatCurrency(bill.amount, currency)} · only its products, up to what is left
            </span>
          )}
        </Field>
        <Field label="Reason" className="sm:col-span-2">
          <select ref={refs.reason} className={inputClass} value={form.reason} onChange={set('reason')} onKeyDown={nextOnEnter('product')}>
            {RETURN_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Remarks" className="sm:col-span-4">
          <input className={inputClass} value={form.notes} onChange={set('notes')} />
        </Field>
      </div>

      {/* ---- Product detail (entry bar) ---- */}
      <div className="space-y-3 rounded-lg border border-rose-100 bg-rose-50/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-rose-900">{entry.editIndex === null ? 'Product returned' : `Editing line ${entry.editIndex + 1}`}</h2>
          <div className="flex gap-3">
            {bill && (
              <button type="button" onClick={fillFromBill} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                Return everything left on this bill
              </button>
            )}
            {entry.editIndex !== null && (
              <button type="button" onClick={() => setEntry(blankEntry)} className="text-xs font-medium text-slate-500 hover:text-slate-800">
                Cancel edit
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
          <Field label="Product" className="col-span-2 sm:col-span-5">
            <SearchPicker
              ref={refs.product}
              value={entry.search}
              onChange={(search) => setEntry((en) => ({ ...en, search, itemId: '' }))}
              onPick={pickProduct}
              options={productOptions}
              columns={productColumns}
              placeholder={bill ? "Search this bill's products" : 'Type to search products'}
            />
            {entryItem && (
              <span className="mt-1 block text-xs text-slate-500">
                In hand <strong className="text-slate-800">{formatNumber(entryItem.inHand)} {entryItem.unit}</strong>
                {entryRoom !== null && (
                  <>
                    {' '}
                    · left on bill <strong className="text-slate-800">{formatNumber(entryRoom)}</strong>
                  </>
                )}
              </span>
            )}
          </Field>
          <Field label={`Quantity${entryItem ? ` (${entryItem.unit})` : ''}`} className="sm:col-span-2">
            <input
              ref={refs.quantity}
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={entry.quantity}
              onChange={(e) => setEntry({ ...entry, quantity: e.target.value })}
              onKeyDown={nextOnEnter('price')}
              onFocus={(e) => e.target.select()}
            />
          </Field>
          <Field label="Price" className="sm:col-span-2">
            <input
              ref={refs.price}
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={entry.unitPrice}
              onChange={(e) => setEntry({ ...entry, unitPrice: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitEntry();
                }
              }}
              onFocus={(e) => e.target.select()}
            />
          </Field>
          <div className="col-span-2 flex items-end justify-between gap-2 sm:col-span-3">
            <div className="pb-1.5 text-sm">
              <div className={label}>Amount</div>
              <strong>{entryAmount ? formatNumber(entryAmount) : '—'}</strong>
            </div>
            <button type="button" onClick={commitEntry} className={buttonClass.secondary}>
              {entry.editIndex === null ? 'Add' : 'Update'}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">Enter moves to the next box; Enter on Price adds the line. Saving takes these quantities out of warehouse stock.</p>
      </div>

      {/* ---- Lines grid ---- */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="w-10 px-2 py-2">Sr#</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2">Unit</th>
              <th className="px-2 py-2 text-right">In hand</th>
              {bill && <th className="px-2 py-2 text-right">Left on bill</th>}
              <th className="px-2 py-2 text-right">Quantity</th>
              <th className="px-2 py-2 text-right">Price</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {form.items.map((line, index) => {
              const item = itemById.get(line.itemId);
              const short = item && Number(line.quantity) > item.inHand;
              return (
                <tr
                  key={index}
                  onDoubleClick={() => editLine(index)}
                  className={`border-t border-slate-100 ${entry.editIndex === index ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-2 py-1.5 text-slate-500">{index + 1}</td>
                  <td className="px-2 py-1.5 font-medium text-slate-900">{item?.name ?? '—'}</td>
                  <td className="px-2 py-1.5 text-slate-600">{item?.unit}</td>
                  <td className={`px-2 py-1.5 text-right ${short ? 'font-medium text-rose-600' : 'text-slate-600'}`} title={short ? 'Not enough in stock to return this much' : undefined}>
                    {item ? formatNumber(item.inHand) : '—'}
                  </td>
                  {bill && <td className="px-2 py-1.5 text-right text-slate-600">{formatNumber(left.get(line.itemId) ?? 0)}</td>}
                  <td className="px-2 py-1.5 text-right">{formatNumber(line.quantity)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(line.unitPrice)}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{formatNumber(lineAmount(line))}</td>
                  <td className="px-1 py-1 whitespace-nowrap">
                    <button type="button" onClick={() => editLine(index)} className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label="Edit line">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeLine(index)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete row">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!form.items.length && (
              <tr>
                <td colSpan={bill ? 9 : 8} className="px-3 py-6 text-center text-slate-400">
                  No products yet — search one above.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 text-sm">
              <td colSpan={bill ? 5 : 4} className="px-2 py-2 text-slate-600">
                Total items <strong className="text-slate-900">{form.items.length}</strong>
              </td>
              <td className="px-2 py-2 text-right font-medium">{formatNumber(form.items.reduce((s, l) => s + Number(l.quantity), 0))}</td>
              <td />
              <td className="px-2 py-2 text-right font-semibold">{formatNumber(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-baseline justify-end gap-3">
        <span className={label}>Return total</span>
        <span className="text-2xl font-semibold text-slate-900">{formatCurrency(total, currency)}</span>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={clear} className={buttonClass.secondary} title="Discard what's typed and start again">
          Clear
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass.secondary}>
            Close
          </button>
        )}
        <button disabled={busy} className={buttonClass.primary} title="Shortcut: Ctrl+S">
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Save'}
        </button>
      </div>
    </form>
  );
}

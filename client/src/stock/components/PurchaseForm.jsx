import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Trash2, UploadCloud, FileText, X } from 'lucide-react';
import { useFinanceStore, findPreviousPrice } from '../../store/useFinanceStore';
import api, { errorMessage } from '../../api/client';
import { useCan } from '../../utils/permissions';
import { findVendorByName } from '../../utils/vendors';
import { PAYMENT_METHODS, formatCurrency, formatDate, formatNumber, today, toDateInput } from '../../utils/format';
import { CATEGORIES, CATEGORY_KEYS } from '../../utils/categories';
import Field, { inputClass, buttonClass } from '../../components/common/Field';
import PriceChange from '../../components/common/PriceChange';
import { lineAmount, linesTotal } from '../../components/invoice/LineItemsEditor';
import SearchPicker, { findTyped } from './SearchPicker';
import { useEntryKeys } from './entryKeys';

const HISTORY_ROWS = 5;

export const blankPurchase = (receiptDate = today()) => ({
  receiptDate,
  vendorName: '',
  invoiceNumber: '',
  notes: '',
  billAvailable: true,
  items: [],
  verify: false,
  payMode: 'FULL', // CREDIT (pay later) | FULL | PARTIAL, as on the old POS
  payment: { date: receiptDate, method: 'CASH', reference: '', amount: '' }, // paid on the bill date unless changed
});

// A saved bill in the form's shape, for editing.
export const purchaseFromRecord = (record) => ({
  ...blankPurchase(toDateInput(record.receiptDate)),
  vendorName: record.vendorName,
  invoiceNumber: record.invoiceNumber ?? '',
  notes: record.notes ?? '',
  billAvailable: record.billAvailable !== false,
  category: record.category ?? 'RAW_PROCUREMENT',
  items: record.items.map(({ itemId, quantity, unitPrice, previousUnitPrice }) => ({ itemId, quantity, unitPrice, previousUnitPrice })),
});

// `unit` is only used for a product that isn't in Inventory yet.
const blankEntry = { itemId: '', search: '', unit: 'Kg', quantity: '', unitPrice: '', amount: '', byAmount: false, editIndex: null };

// Quantity × Price = Amount, filled in as you type: a Price works out the Amount and
// an Amount works out the Price, whichever was typed last (`byAmount`).
const fillEntry = (entry, field, value) => {
  const next = { ...entry, [field]: value };
  if (field === 'amount') next.byAmount = value !== '';
  if (field === 'unitPrice') next.byAmount = false;
  const qty = Number(next.quantity);
  if (!(qty > 0) || (field === 'amount' && value === '')) return next;
  if (next.byAmount) next.unitPrice = String(Math.round((Number(next.amount) / qty) * 10000) / 10000);
  else next.amount = next.unitPrice === '' ? '' : String(lineAmount(next));
  return next;
};

// Latest purchases of an item (any vendor), newest first, for the history strip.
const purchaseHistory = (records, itemId, excludeId) =>
  records
    .filter((r) => r.id !== excludeId && r.status !== 'FLAGGED')
    .flatMap((r) => (r.items ?? []).filter((l) => l.itemId === itemId).map((l) => ({ record: r, line: l })))
    .sort((a, b) => new Date(b.record.receiptDate) - new Date(a.record.receiptDate))
    .slice(0, HISTORY_ROWS);

// Purchase Entry, keyboard-first like the old POS: Date ⏎ Vendor ⏎ Vendor Inv# ⏎,
// then per product: Product ⏎ Quantity ⏎ Price ⏎ (line goes into the grid and the
// cursor is back on Product). Ctrl+S saves. `record` switches to editing that bill.
export default function PurchaseForm({ initial, record, onSaved, onCancel }) {
  const vendors = useFinanceStore((s) => s.vendors);
  const items = useFinanceStore((s) => s.items);
  const records = useFinanceStore((s) => s.records);
  const createRecord = useFinanceStore((s) => s.createRecord);
  const updateRecord = useFinanceStore((s) => s.updateRecord);
  const attachReceipt = useFinanceStore((s) => s.attachReceipt);
  const can = useCan();
  const [form, setForm] = useState(initial);
  const [entry, setEntry] = useState(blankEntry);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [units, setUnits] = useState(['Kg']);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf';
  const handleFile = (picked) => {
    if (!picked) return;
    setFile(picked);
    setPreview(picked.type.startsWith('image/') ? URL.createObjectURL(picked) : null);
  };
  const clearFile = () => { setFile(null); setPreview(null); };

  useEffect(() => {
    api.get('/items/units').then((res) => setUnits(res.data));
  }, []);

  const editing = Boolean(record);
  const { refs, focus, nextOnEnter, saveRef } = useEntryKeys(
    ['date', 'vendor', 'invoice', 'product', 'unit', 'quantity', 'price', 'amount'],
    editing ? 'product' : 'date'
  );
  const canPay = !editing && can('recordPayment');
  const vendor = findVendorByName(vendors, form.vendorName);

  // Live duplicate-invoice warning: check the typed invoice number against existing records.
  const dupBill = useMemo(() => {
    const inv = form.invoiceNumber.trim();
    if (!inv || !vendor) return null;
    return records.find(
      (r) =>
        r.id !== record?.id &&
        r.status !== 'FLAGGED' &&
        r.vendorId === vendor.id &&
        String(r.invoiceNumber ?? '').trim().toLowerCase() === inv.toLowerCase()
    ) ?? null;
  }, [form.invoiceNumber, vendor, records, record?.id]);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const total = linesTotal(form.items);
  const totalQty = form.items.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setPayment = (field) => (e) => setForm({ ...form, payment: { ...form.payment, [field]: e.target.value } });
  // The payment date follows the bill date until it's changed by hand.
  const setReceiptDate = (e) =>
    setForm({
      ...form,
      receiptDate: e.target.value,
      payment: form.payment.date === form.receiptDate ? { ...form.payment, date: e.target.value } : form.payment,
    });

  const lastPrice = (itemId) =>
    vendor ? findPreviousPrice(records, { vendorId: vendor.id, itemId, beforeDate: form.receiptDate, excludeId: record?.id }) : undefined;

  // ---- Pick lists ----
  const vendorOptions = vendors
    .filter((v) => v.active !== false)
    .map((v) => ({
      id: v.id,
      label: v.name,
      search: `${v.code} ${v.name} ${v.address ?? ''}`.toLowerCase(),
      cells: { code: v.code, name: v.name, address: v.address ?? '', balance: formatNumber(v.pendingBalance) },
    }));
  const vendorColumns = [
    { key: 'code', label: 'ID' },
    { key: 'name', label: 'Vendor' },
    { key: 'address', label: 'Address' },
    { key: 'balance', label: 'Balance', right: true },
  ];

  const productOptions = items.map((i) => {
    const last = lastPrice(i.id);
    return {
      id: i.id,
      label: i.name,
      search: i.name.toLowerCase(),
      cells: { name: i.name, unit: i.unit, inHand: formatNumber(i.inHand), last: last === undefined ? '—' : formatNumber(last) },
    };
  });
  const productColumns = [
    { key: 'name', label: 'Product' },
    { key: 'unit', label: 'Unit' },
    { key: 'inHand', label: 'In hand', right: true },
    { key: 'last', label: 'Last price', right: true },
  ];

  // ---- Product entry ----
  // A typed name that matches no product is a new one: it goes on the bill and is
  // added to Inventory when the bill is saved (managers/admins only, like vendors).
  const typed = entry.search.trim().toLowerCase();
  const newProduct = !entry.itemId && Boolean(typed) && !productOptions.some((o) => o.search.includes(typed));
  const canAddProduct = can('manageItems');

  const pickProduct = (option) => {
    if (!option) return newProduct && focus('unit');
    const last = lastPrice(option.id);
    const itemUnit = items.find((i) => i.id === option.id)?.unit ?? '';
    setEntry((en) => fillEntry({ ...en, itemId: option.id, search: option.label, unit: itemUnit }, 'unitPrice', en.editIndex !== null ? en.unitPrice : String(last ?? '')));
    focus('quantity');
  };
  const setEntryField = (field) => (e) => setEntry((en) => fillEntry(en, field, e.target.value));

  const commitEntry = () => {
    // A product typed but not picked from the list (e.g. clicked away) still counts.
    const itemId = entry.itemId || findTyped(productOptions, entry.search)?.id;
    const name = entry.search.trim().replace(/\s+/g, ' ');
    if (!itemId && !(newProduct && canAddProduct)) {
      setError(
        !name
          ? 'Pick a product.'
          : newProduct
            ? `"${name}" isn't in Inventory. Ask a manager to add it.`
            : `No single product matches "${name}" — pick one from the list.`
      );
      return focus('product');
    }
    if (!(Number(entry.quantity) > 0)) {
      setError('Enter a quantity greater than 0.');
      return focus('quantity');
    }
    if (entry.unitPrice === '' || Number(entry.unitPrice) < 0) {
      setError('Enter the price.');
      return focus('price');
    }
    const product = itemId ? { itemId, unit: entry.unit } : { itemId: '', itemName: name, unit: entry.unit };
    const line = { ...product, quantity: Number(entry.quantity), unitPrice: Number(entry.unitPrice) };
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
    setEntry({
      ...blankEntry,
      itemId: line.itemId,
      search: itemById.get(line.itemId)?.name ?? line.itemName ?? '',
      unit: line.unit ?? itemById.get(line.itemId)?.unit ?? blankEntry.unit,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: String(lineAmount(line)),
      editIndex: index,
    });
    focus('quantity');
  };

  const removeLine = (index) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
    if (entry.editIndex !== null) setEntry(blankEntry);
  };

  // Clear: throw away what's typed and start again (nothing is saved).
  const clear = () => {
    setForm(initial);
    setEntry(blankEntry);
    setError('');
    focus(editing ? 'product' : 'date');
  };

  // ---- Save ----
  const save = async () => {
    if (busy) return;
    if (!form.vendorName.trim()) {
      setError('Enter the vendor.');
      return focus('vendor');
    }
    if (!form.items.length) {
      setError('Add at least one product.');
      return focus('product');
    }
    const paidAmount = form.payMode === 'FULL' ? total : Number(form.payment.amount);
    if (canPay && form.payMode === 'PARTIAL' && !(paidAmount > 0 && paidAmount < total)) {
      return setError('Partial payment must be more than 0 and less than the grand total.');
    }

    const fields = {
      invoiceNumber: form.invoiceNumber,
      receiptDate: form.receiptDate,
      notes: form.notes,
      billAvailable: form.billAvailable,
      ...(editing && form.category && { category: form.category }),
      items: form.items.map(({ itemId, itemName, unit, quantity, unitPrice }) => ({
        ...(itemId ? { itemId } : { itemName, unit }),
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      })),
    };
    const paying = canPay && form.payMode !== 'CREDIT';

    setBusy(true);
    setError('');
    try {
      let saved;
      if (editing) {
        saved = await updateRecord(record.id, { ...fields, vendorName: form.vendorName });
        if (file) saved = await attachReceipt(saved.id, file);
      } else {
        saved = await createRecord({
          ...fields,
          vendorName: form.vendorName,
          verify: form.verify || paying,
          ...(file && { billAvailable: true }),
          ...(paying && { payment: { date: form.payment.date, method: form.payment.method, reference: form.payment.reference, amount: paidAmount } }),
        }, file);
      }
      clearFile();
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  saveRef.current = save; // Ctrl+S

  const entryItem = itemById.get(entry.itemId);
  const entryUnit = entryItem ? entryItem.unit : newProduct ? entry.unit : '';
  const history = entry.itemId ? purchaseHistory(records, entry.itemId, record?.id) : [];
  const label = 'text-xs font-medium text-slate-500 uppercase';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      {/* ---- Bill header ---- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <Field label="Dated">
          <input ref={refs.date} type="date" required className={inputClass} value={form.receiptDate} onChange={setReceiptDate} onKeyDown={nextOnEnter('vendor')} />
        </Field>
        <Field label="Vendor" className="sm:col-span-3">
          <SearchPicker
            ref={refs.vendor}
            value={form.vendorName}
            onChange={(vendorName) => setForm((f) => ({ ...f, vendorName }))}
            onPick={(option) => {
              if (option) setForm((f) => ({ ...f, vendorName: option.label }));
              focus('invoice');
            }}
            options={vendorOptions}
            columns={vendorColumns}
            allowNew={can('manageVendors')}
            placeholder="Type to search vendors"
          />
          {vendor ? (
            <span className="mt-1 block text-xs">
              <span className="text-slate-500">Ledger balance </span>
              <strong className={vendor.pendingBalance > 0 ? 'text-rose-600' : 'text-slate-700'}>{formatCurrency(vendor.pendingBalance)}</strong>
              <span className="text-slate-400"> · {vendor.code}</span>
            </span>
          ) : (
            form.vendorName.trim() &&
            (can('manageVendors') ? (
              <span className="mt-1 block text-xs text-slate-500">New vendor — it will be added to the vendor list.</span>
            ) : (
              <span className="mt-1 block text-xs text-rose-600">Not in the vendor list. Ask a manager to add this vendor.</span>
            ))
          )}
        </Field>
        <Field label="Vendor Inv #" className="sm:col-span-2">
          <input ref={refs.invoice} className={`${inputClass} ${dupBill ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : ''}`} value={form.invoiceNumber} onChange={set('invoiceNumber')} onKeyDown={nextOnEnter('product')} />
          {dupBill && (
            <p className="mt-1 text-xs text-rose-600">
              Duplicate — this invoice number was already entered on {new Date(dupBill.receiptDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}.
            </p>
          )}
        </Field>
        {editing && (
          <Field label="Category" className="sm:col-span-2">
            <select className={inputClass} value={form.category ?? ''} onChange={set('category')}>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>{CATEGORIES[key].label}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {/* ---- Product detail (entry bar) ---- */}
      <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-indigo-900">{entry.editIndex === null ? 'Product detail' : `Editing line ${entry.editIndex + 1}`}</h2>
          {entry.editIndex !== null && (
            <button type="button" onClick={() => setEntry(blankEntry)} className="text-xs font-medium text-slate-500 hover:text-slate-800">
              Cancel edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
          <Field label="Product" className="col-span-2 sm:col-span-4">
            <SearchPicker
              ref={refs.product}
              value={entry.search}
              onChange={(search) => setEntry((en) => ({ ...en, search, itemId: '' }))}
              onPick={pickProduct}
              options={productOptions}
              columns={productColumns}
              placeholder="Type to search products"
              allowNew={canAddProduct}
              emptyText={
                !typed
                  ? `No products yet. ${canAddProduct ? 'Type a name to add one.' : 'Ask a manager to add them.'}`
                  : canAddProduct
                    ? `New product — "${entry.search.trim()}" will be added to Inventory when you save.`
                    : `No product matches "${entry.search.trim()}". Ask a manager to add it.`
              }
            />
            {entryItem && (
              <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                In hand <strong className="text-slate-800">{formatNumber(entryItem.inHand)}</strong>
                <span className="text-slate-300">·</span> Unit
                <select
                  ref={refs.unit}
                  className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-800"
                  value={entry.unit}
                  onChange={(e) => setEntry({ ...entry, unit: e.target.value })}
                  onKeyDown={nextOnEnter('quantity')}
                >
                  <option value="">No unit</option>
                  {units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </span>
            )}
            {newProduct &&
              (canAddProduct ? (
                <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  New product — added to Inventory on save. Unit
                  <select
                    ref={refs.unit}
                    className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-800"
                    value={entry.unit}
                    onChange={(e) => setEntry({ ...entry, unit: e.target.value })}
                    onKeyDown={nextOnEnter('quantity')}
                  >
                    <option value="">No unit</option>
                    {units.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </span>
              ) : (
                <span className="mt-1 block text-xs text-rose-600">Not in Inventory. Ask a manager to add this product.</span>
              ))}
          </Field>
          <Field label={`Quantity${entryUnit ? ` (${entryUnit})` : ''}`} className="sm:col-span-2">
            <input
              ref={refs.quantity}
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={entry.quantity}
              onChange={setEntryField('quantity')}
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
              onChange={setEntryField('unitPrice')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // No price yet: go to Amount so the price can be worked out from it.
                  if (entry.unitPrice === '') focus('amount');
                  else commitEntry();
                }
              }}
              onFocus={(e) => e.target.select()}
            />
          </Field>
          <Field label="Amount" className="sm:col-span-2">
            <input
              ref={refs.amount}
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={entry.amount}
              onChange={setEntryField('amount')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitEntry();
                }
              }}
              onFocus={(e) => e.target.select()}
            />
          </Field>
          <div className="col-span-2 flex items-end sm:col-span-2">
            <button type="button" onClick={commitEntry} className={`${buttonClass.secondary} w-full`}>
              {entry.editIndex === null ? 'Add' : 'Update'}
            </button>
          </div>
        </div>

        {entry.itemId && (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-slate-500 uppercase">
                <tr>
                  <th className="px-2 py-1">Dated</th>
                  <th className="px-2 py-1">Inv #</th>
                  <th className="px-2 py-1">Vendor</th>
                  <th className="px-2 py-1 text-right">Quantity</th>
                  <th className="px-2 py-1 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {history.map(({ record: r, line }) => (
                  <tr key={r.id} className={`border-t border-slate-100 ${vendor && r.vendorId === vendor.id ? 'font-medium' : 'text-slate-600'}`}>
                    <td className="px-2 py-1">{formatDate(r.receiptDate)}</td>
                    <td className="px-2 py-1">{r.invoiceNumber || '—'}</td>
                    <td className="px-2 py-1">{r.vendorName}</td>
                    <td className="px-2 py-1 text-right">{formatNumber(line.quantity)}</td>
                    <td className="px-2 py-1 text-right">{formatNumber(line.unitPrice)}</td>
                  </tr>
                ))}
                {!history.length && (
                  <tr>
                    <td colSpan={5} className="px-2 py-2 text-center text-slate-400">
                      Not purchased before.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500">
          Enter moves to the next box; Enter on Price adds the line. Price and Amount fill each other in — leave Price empty and press Enter to type the
          Amount instead.{' '}
          {canAddProduct ? 'A product not in the list is added to Inventory when you save.' : 'Product missing? Ask a manager to add it.'}
        </p>
      </div>

      {/* ---- Lines grid ---- */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="w-10 px-2 py-2">Sr#</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2">Unit</th>
              <th className="px-2 py-2 text-right">Quantity</th>
              <th className="px-2 py-2 text-right">Price</th>
              <th className="px-2 py-2">vs last</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {form.items.map((line, index) => {
              const item = itemById.get(line.itemId);
              const previous = line.previousUnitPrice ?? lastPrice(line.itemId);
              return (
                <tr
                  key={index}
                  onDoubleClick={() => editLine(index)}
                  className={`border-t border-slate-100 ${entry.editIndex === index ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-2 py-1.5 text-slate-500">{index + 1}</td>
                  <td className="px-2 py-1.5 font-medium text-slate-900">
                    {item?.name ?? line.itemName ?? '—'}
                    {!item && line.itemName && <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-normal text-emerald-700">new</span>}
                  </td>
                  <td className="px-2 py-1.5 text-slate-600">{line.unit || item?.unit}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(line.quantity)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(line.unitPrice)}</td>
                  <td className="px-2 py-1.5">
                    <PriceChange current={line.unitPrice} previous={previous} />
                  </td>
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
                <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                  No products yet — search one above.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 text-sm">
              <td colSpan={3} className="px-2 py-2 text-slate-600">
                Total items <strong className="text-slate-900">{form.items.length}</strong>
              </td>
              <td className="px-2 py-2 text-right font-medium">{formatNumber(totalQty)}</td>
              <td colSpan={2} />
              <td className="px-2 py-2 text-right font-semibold">{formatNumber(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ---- Footer: remarks, payment, grand total, actions ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label="Remarks">
            <textarea rows={2} className={inputClass} value={form.notes} onChange={set('notes')} />
          </Field>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase">Attach bill image</span>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              className={`relative mt-1.5 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-3 transition ${
                dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'
              }`}
            >
              {preview ? (
                <img src={preview} alt="Bill preview" className="max-h-32 rounded object-contain" />
              ) : file ? (
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-5 w-5 text-slate-400" /> {file.name}
                </span>
              ) : (
                <span className="flex flex-col items-center gap-1 text-center text-xs text-slate-500">
                  <UploadCloud className="h-6 w-6 text-slate-400" />
                  Drop or click to attach (PNG, JPG, PDF)
                </span>
              )}
              {file && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="absolute right-1.5 top-1.5 rounded-full bg-white p-0.5 text-slate-400 shadow hover:text-rose-600"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase">Bill available?</span>
            <div className="mt-1.5 flex gap-5 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="billAvailable" checked={form.billAvailable !== false} onChange={() => setForm({ ...form, billAvailable: true })} />
                Yes
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="billAvailable" checked={form.billAvailable === false} onChange={() => setForm({ ...form, billAvailable: false })} />
                No bill
              </label>
            </div>
          </div>
          {editing
            ? record.verified && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  This bill is verified. Changing quantities corrects warehouse stock by the difference.
                </p>
              )
            : can('verifyInvoice') &&
              form.payMode === 'CREDIT' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.verify} onChange={set('verify')} />
                  Verified — goods received, add to warehouse stock now
                </label>
              )}
        </div>

        <div className="space-y-3">
          {canPay && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap gap-4">
                {[
                  ['CREDIT', 'Credit'],
                  ['FULL', 'Full Paid'],
                  ['PARTIAL', 'Partial Payment'],
                ].map(([mode, text]) => (
                  <label key={mode} className="flex items-center gap-1.5">
                    <input type="radio" name="payMode" checked={form.payMode === mode} onChange={() => setForm({ ...form, payMode: mode })} />
                    {text}
                  </label>
                ))}
              </div>
              {form.payMode !== 'CREDIT' && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {form.payMode === 'PARTIAL' && (
                    <Field label="Amount paid">
                      <input type="number" min="0" step="any" className={inputClass} value={form.payment.amount} onChange={setPayment('amount')} />
                    </Field>
                  )}
                  <Field label="Payment date">
                    <input type="date" className={inputClass} value={form.payment.date} onChange={setPayment('date')} />
                  </Field>
                  <Field label="Method">
                    <select className={inputClass} value={form.payment.method} onChange={setPayment('method')}>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Reference">
                    <input className={inputClass} value={form.payment.reference} onChange={setPayment('reference')} />
                  </Field>
                  <p className="col-span-full text-xs text-slate-500">Paying marks the bill verified and adds the products to stock.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-baseline justify-end gap-3">
            <span className={label}>Grand total</span>
            <span className="text-2xl font-semibold text-slate-900">{formatCurrency(total, record?.currency)}</span>
          </div>
        </div>
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

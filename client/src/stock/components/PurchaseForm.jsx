import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { useFinanceStore, findPreviousPrice } from '../../store/useFinanceStore';
import { errorMessage } from '../../api/client';
import { useCan } from '../../utils/permissions';
import { findVendorByName } from '../../utils/vendors';
import { PAYMENT_METHODS, formatCurrency, formatDate, formatNumber, today, toDateInput } from '../../utils/format';
import Field, { inputClass, buttonClass } from '../../components/common/Field';
import PriceChange from '../../components/common/PriceChange';
import { lineAmount, linesTotal } from '../../components/invoice/LineItemsEditor';
import SearchPicker from './SearchPicker';
import { useEntryKeys } from './entryKeys';

const HISTORY_ROWS = 5;

export const blankPurchase = (receiptDate = today()) => ({
  receiptDate,
  vendorName: '',
  invoiceNumber: '',
  notes: '',
  items: [],
  verify: false,
  payMode: 'CREDIT', // CREDIT (pay later) | FULL | PARTIAL, as on the old POS
  payment: { date: today(), method: 'CASH', reference: '', amount: '' },
});

// A saved bill in the form's shape, for editing.
export const purchaseFromRecord = (record) => ({
  ...blankPurchase(toDateInput(record.receiptDate)),
  vendorName: record.vendorName,
  invoiceNumber: record.invoiceNumber ?? '',
  notes: record.notes ?? '',
  items: record.items.map(({ itemId, quantity, unitPrice, previousUnitPrice }) => ({ itemId, quantity, unitPrice, previousUnitPrice })),
});

const blankEntry = { itemId: '', search: '', quantity: '', unitPrice: '', editIndex: null };

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
  const can = useCan();
  const [form, setForm] = useState(initial);
  const [entry, setEntry] = useState(blankEntry);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const editing = Boolean(record);
  const { refs, focus, nextOnEnter, saveRef } = useEntryKeys(
    ['date', 'vendor', 'invoice', 'product', 'quantity', 'price'],
    editing ? 'product' : 'date'
  );
  const canPay = !editing && can('recordPayment');
  const vendor = editing ? vendors.find((v) => v.id === record.vendorId) : findVendorByName(vendors, form.vendorName);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const total = linesTotal(form.items);
  const totalQty = form.items.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setPayment = (field) => (e) => setForm({ ...form, payment: { ...form.payment, [field]: e.target.value } });

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
  const pickProduct = (option) => {
    if (!option) return;
    const last = lastPrice(option.id);
    setEntry((en) => ({ ...en, itemId: option.id, search: option.label, unitPrice: en.editIndex !== null ? en.unitPrice : last ?? '' }));
    focus('quantity');
  };

  const commitEntry = () => {
    if (!entry.itemId) return focus('product');
    if (!(Number(entry.quantity) > 0)) return focus('quantity');
    if (entry.unitPrice === '' || Number(entry.unitPrice) < 0) return focus('price');
    const line = { itemId: entry.itemId, quantity: Number(entry.quantity), unitPrice: Number(entry.unitPrice) };
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
    if (!editing && !form.vendorName.trim()) {
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
      items: form.items.map(({ itemId, quantity, unitPrice }) => ({ itemId, quantity: Number(quantity), unitPrice: Number(unitPrice) })),
    };
    const paying = canPay && form.payMode !== 'CREDIT';

    setBusy(true);
    setError('');
    try {
      const saved = editing
        ? await updateRecord(record.id, fields)
        : await createRecord({
            ...fields,
            vendorName: form.vendorName,
            verify: form.verify || paying,
            ...(paying && { payment: { date: form.payment.date, method: form.payment.method, reference: form.payment.reference, amount: paidAmount } }),
          });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  saveRef.current = save; // Ctrl+S

  const entryItem = itemById.get(entry.itemId);
  const history = entry.itemId ? purchaseHistory(records, entry.itemId, record?.id) : [];
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
      {/* ---- Bill header ---- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <Field label="Dated">
          <input ref={refs.date} type="date" required className={inputClass} value={form.receiptDate} onChange={set('receiptDate')} onKeyDown={nextOnEnter('vendor')} />
        </Field>
        <Field label="Vendor" className="sm:col-span-3">
          <SearchPicker
            ref={refs.vendor}
            value={form.vendorName}
            disabled={editing}
            onChange={(vendorName) => setForm((f) => ({ ...f, vendorName }))}
            onPick={(option) => {
              if (option) setForm((f) => ({ ...f, vendorName: option.label }));
              focus('invoice');
            }}
            options={vendorOptions}
            columns={vendorColumns}
            allowNew
            placeholder="Type to search vendors"
          />
          {vendor ? (
            <span className="mt-1 block text-xs">
              <span className="text-slate-500">Ledger balance </span>
              <strong className={vendor.pendingBalance > 0 ? 'text-rose-600' : 'text-slate-700'}>{formatCurrency(vendor.pendingBalance)}</strong>
              <span className="text-slate-400"> · {vendor.code}</span>
            </span>
          ) : (
            !editing &&
            form.vendorName.trim() && <span className="mt-1 block text-xs text-slate-500">New vendor — it will be added to the vendor list.</span>
          )}
        </Field>
        <Field label="Vendor Inv #" className="sm:col-span-2">
          <input ref={refs.invoice} className={inputClass} value={form.invoiceNumber} onChange={set('invoiceNumber')} onKeyDown={nextOnEnter('product')} />
        </Field>
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
          <Field label="Product" className="col-span-2 sm:col-span-5">
            <SearchPicker
              ref={refs.product}
              value={entry.search}
              onChange={(search) => setEntry((en) => ({ ...en, search, itemId: '' }))}
              onPick={pickProduct}
              options={productOptions}
              columns={productColumns}
              placeholder="Type to search products"
            />
            {entryItem && (
              <span className="mt-1 block text-xs text-slate-500">
                In hand <strong className="text-slate-800">{formatNumber(entryItem.inHand)} {entryItem.unit}</strong>
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
          Enter moves to the next box; Enter on Price adds the line. Product missing?{' '}
          {can('manageItems') ? (
            <Link to="/inventory" className="underline">
              Add it in Inventory
            </Link>
          ) : (
            'Ask a manager to add it.'
          )}
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
                  <td className="px-2 py-1.5 font-medium text-slate-900">{item?.name ?? '—'}</td>
                  <td className="px-2 py-1.5 text-slate-600">{item?.unit}</td>
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

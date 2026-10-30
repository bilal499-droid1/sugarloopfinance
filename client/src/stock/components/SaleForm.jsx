import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSalesStore } from '../useSalesStore';
import { errorMessage } from '../../api/client';
import { useCan } from '../../utils/permissions';
import { formatCurrency, formatDate, formatNumber, today, toDateInput } from '../../utils/format';
import Field, { inputClass, buttonClass } from '../../components/common/Field';
import SearchPicker, { findTyped } from './SearchPicker';
import { useEntryKeys } from './entryKeys';
import { lineAmount, linesTotal } from '../../components/invoice/LineItemsEditor';

const HISTORY_ROWS = 5;

export const blankSale = (saleDate = today()) => ({
  saleDate,
  customerName: '',
  notes: '',
  items: [],
});

export const saleFromRecord = (sale) => ({
  ...blankSale(toDateInput(sale.saleDate)),
  customerName: sale.customerName,
  notes: sale.notes ?? '',
  items: sale.items.map(({ itemId, quantity, unitPrice }) => ({ itemId, quantity, unitPrice })),
});

const blankEntry = { itemId: '', search: '', quantity: '', unitPrice: '', amount: '', byAmount: false, editIndex: null };

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

const saleHistory = (sales, itemId, excludeId) =>
  sales
    .filter((s) => s.id !== excludeId)
    .flatMap((s) => (s.items ?? []).filter((l) => l.itemId === itemId).map((l) => ({ sale: s, line: l })))
    .sort((a, b) => new Date(b.sale.saleDate) - new Date(a.sale.saleDate))
    .slice(0, HISTORY_ROWS);

export default function SaleForm({ initial, sale, onSaved, onCancel }) {
  const items = useFinanceStore((s) => s.items);
  const { customers, sales, createSale, updateSale } = useSalesStore();
  const can = useCan();
  const [form, setForm] = useState(initial);
  const [entry, setEntry] = useState(blankEntry);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const editing = Boolean(sale);
  const { refs, focus, nextOnEnter, saveRef } = useEntryKeys(
    ['date', 'customer', 'product', 'quantity', 'price', 'amount'],
    editing ? 'product' : 'date'
  );

  const customer = customers.find(
    (c) => c.name.trim().toLowerCase() === form.customerName.trim().toLowerCase()
  );
  const itemById = new Map(items.map((i) => [i.id, i]));
  const total = linesTotal(form.items);
  const totalQty = form.items.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const customerOptions = customers
    .filter((c) => c.active !== false)
    .map((c) => ({
      id: c.id,
      label: c.name,
      search: `${c.code} ${c.name} ${c.address ?? ''}`.toLowerCase(),
      cells: { code: c.code, name: c.name, address: c.address ?? '', sales: formatNumber(c.totalSales) },
    }));
  const customerColumns = [
    { key: 'code', label: 'ID' },
    { key: 'name', label: 'Customer' },
    { key: 'address', label: 'Address' },
    { key: 'sales', label: 'Total Sales', right: true },
  ];

  const productOptions = items.map((i) => ({
    id: i.id,
    label: i.name,
    search: i.name.toLowerCase(),
    cells: { name: i.name, unit: i.unit || '—', inHand: formatNumber(i.inHand) },
  }));
  const productColumns = [
    { key: 'name', label: 'Product' },
    { key: 'unit', label: 'Unit' },
    { key: 'inHand', label: 'In Hand', right: true },
  ];

  const typed = entry.search.trim().toLowerCase();
  const pickProduct = (option) => {
    if (!option) return;
    setEntry((en) => fillEntry({ ...en, itemId: option.id, search: option.label }, 'unitPrice', en.editIndex !== null ? en.unitPrice : ''));
    focus('quantity');
  };
  const setEntryField = (field) => (e) => setEntry((en) => fillEntry(en, field, e.target.value));

  const commitEntry = () => {
    const itemId = entry.itemId || findTyped(productOptions, entry.search)?.id;
    if (!itemId) {
      setError(!entry.search.trim() ? 'Pick a product.' : `No product matches "${entry.search.trim()}".`);
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
    const line = { itemId, quantity: Number(entry.quantity), unitPrice: Number(entry.unitPrice) };
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
      search: itemById.get(line.itemId)?.name ?? '',
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

  const clear = () => {
    setForm(initial);
    setEntry(blankEntry);
    setError('');
    focus(editing ? 'product' : 'date');
  };

  const save = async () => {
    if (busy) return;
    if (!form.customerName.trim()) {
      setError('Select a customer.');
      return focus('customer');
    }
    if (!customer) {
      setError('Customer not found. Pick one from the list.');
      return focus('customer');
    }
    if (!form.items.length) {
      setError('Add at least one product.');
      return focus('product');
    }

    const payload = {
      customerId: customer.id,
      saleDate: form.saleDate,
      notes: form.notes,
      items: form.items.map(({ itemId, quantity, unitPrice }) => ({ itemId, quantity: Number(quantity), unitPrice: Number(unitPrice) })),
    };

    setBusy(true);
    setError('');
    try {
      const saved = editing ? await updateSale(sale.id, payload) : await createSale(payload);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  saveRef.current = save;

  const entryItem = itemById.get(entry.itemId);
  const history = entry.itemId ? saleHistory(sales, entry.itemId, sale?.id) : [];
  const label = 'text-xs font-medium text-slate-500 uppercase';

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(); }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      {/* Header */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <Field label="Date">
          <input ref={refs.date} type="date" required className={inputClass} value={form.saleDate} onChange={set('saleDate')} onKeyDown={nextOnEnter('customer')} />
        </Field>
        <Field label="Customer" className="sm:col-span-4">
          <SearchPicker
            ref={refs.customer}
            value={form.customerName}
            onChange={(customerName) => setForm((f) => ({ ...f, customerName }))}
            onPick={(option) => {
              if (option) setForm((f) => ({ ...f, customerName: option.label }));
              focus('product');
            }}
            options={customerOptions}
            columns={customerColumns}
            placeholder="Type to search customers"
          />
          {customer ? (
            <span className="mt-1 block text-xs text-slate-500">
              {customer.code} · Total sales <strong className="text-slate-800">{formatCurrency(customer.totalSales)}</strong>
            </span>
          ) : (
            form.customerName.trim() && (
              <span className="mt-1 block text-xs text-rose-600">Not in the customer list. {can('manageVendors') ? 'Go to the Customers page to add them.' : 'Ask a manager.'}</span>
            )
          )}
        </Field>
      </div>

      {/* Product entry */}
      <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/40 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-amber-900">{entry.editIndex === null ? 'Product detail' : `Editing line ${entry.editIndex + 1}`}</h2>
          {entry.editIndex !== null && (
            <button type="button" onClick={() => setEntry(blankEntry)} className="text-xs font-medium text-slate-500 hover:text-slate-800">Cancel edit</button>
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
              emptyText={!typed ? 'No products yet.' : `No product matches "${entry.search.trim()}".`}
            />
            {entryItem && (
              <span className={`mt-1 block text-xs ${entryItem.inHand <= 0 ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                In hand: <strong>{formatNumber(entryItem.inHand)}</strong> {entryItem.unit}
                {entryItem.inHand <= 0 && ' — no stock!'}
              </span>
            )}
          </Field>
          <Field label={`Qty${entryItem?.unit ? ` (${entryItem.unit})` : ''}`} className="sm:col-span-2">
            <input ref={refs.quantity} type="number" min="0" step="any" className={inputClass} value={entry.quantity} onChange={setEntryField('quantity')} onKeyDown={nextOnEnter('price')} onFocus={(e) => e.target.select()} />
          </Field>
          <Field label="Price" className="sm:col-span-2">
            <input
              ref={refs.price}
              type="number" min="0" step="any" className={inputClass} value={entry.unitPrice}
              onChange={setEntryField('unitPrice')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); entry.unitPrice === '' ? focus('amount') : commitEntry(); } }}
              onFocus={(e) => e.target.select()}
            />
          </Field>
          <Field label="Amount" className="sm:col-span-2">
            <input
              ref={refs.amount}
              type="number" min="0" step="any" className={inputClass} value={entry.amount}
              onChange={setEntryField('amount')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitEntry(); } }}
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
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Invoice</th>
                  <th className="px-2 py-1">Customer</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {history.map(({ sale: s, line }) => (
                  <tr key={s.id} className={`border-t border-slate-100 ${customer && s.customerId === customer.id ? 'font-medium' : 'text-slate-600'}`}>
                    <td className="px-2 py-1">{formatDate(s.saleDate)}</td>
                    <td className="px-2 py-1">{s.saleInvoiceNo || '—'}</td>
                    <td className="px-2 py-1">{s.customerName}</td>
                    <td className="px-2 py-1 text-right">{formatNumber(line.quantity)}</td>
                    <td className="px-2 py-1 text-right">{formatNumber(line.unitPrice)}</td>
                  </tr>
                ))}
                {!history.length && (
                  <tr><td colSpan={5} className="px-2 py-2 text-center text-slate-400">Not sold before.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500">Enter moves to next box · Enter on Price adds the line · leave Price empty then Enter to type Amount instead · Ctrl+S saves.</p>
      </div>

      {/* Lines grid */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="w-10 px-2 py-2">Sr#</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2">Unit</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Price</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {form.items.map((line, index) => {
              const item = itemById.get(line.itemId);
              return (
                <tr key={index} onDoubleClick={() => editLine(index)} className={`border-t border-slate-100 ${entry.editIndex === index ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-2 py-1.5 text-slate-500">{index + 1}</td>
                  <td className="px-2 py-1.5 font-medium text-slate-900">{item?.name ?? '—'}</td>
                  <td className="px-2 py-1.5 text-slate-600">{item?.unit || '—'}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(line.quantity)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(line.unitPrice)}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{formatNumber(lineAmount(line))}</td>
                  <td className="px-1 py-1 whitespace-nowrap">
                    <button type="button" onClick={() => editLine(index)} className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-700"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => removeLine(index)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
            {!form.items.length && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No products yet — search one above.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 text-sm">
              <td colSpan={3} className="px-2 py-2 text-slate-600">Total items <strong className="text-slate-900">{form.items.length}</strong></td>
              <td className="px-2 py-2 text-right font-medium">{formatNumber(totalQty)}</td>
              <td />
              <td className="px-2 py-2 text-right font-semibold">{formatNumber(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Remarks">
          <textarea rows={2} className={inputClass} value={form.notes} onChange={set('notes')} />
        </Field>
        <div className="flex items-end justify-end">
          <div className="text-right">
            <div className={label}>Grand Total</div>
            <div className="text-3xl font-semibold text-slate-900">{formatCurrency(total)}</div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={clear} className={buttonClass.secondary}>Clear</button>
        {onCancel && <button type="button" onClick={onCancel} className={buttonClass.secondary}>Close</button>}
        <button disabled={busy} className={buttonClass.primary}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Save Sale'}
        </button>
      </div>
    </form>
  );
}

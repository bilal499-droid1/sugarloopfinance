import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Printer, Eye } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { errorMessage } from '../api/client';
import { useCan } from '../utils/permissions';
import { findVendorByName } from '../utils/vendors';
import { CATEGORIES, CATEGORY_KEYS } from '../utils/categories';
import { PAYMENT_METHODS, formatCurrency, today } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import Field, { inputClass, buttonClass } from '../components/common/Field';
import LineItemsEditor, { emptyLine, linesTotal } from '../components/invoice/LineItemsEditor';

const blankForm = () => ({
  vendorName: '',
  category: '',
  invoiceNumber: '',
  receiptDate: today(),
  currency: 'PKR',
  notes: '',
  items: [emptyLine()],
  verify: false,
  paid: false,
  payment: { date: today(), method: 'BANK', reference: '' },
});

// Manual purchase invoice entry (paper bills, verbal orders). Any role can enter;
// managers/admins can also verify and mark paid in one go.
export default function NewInvoicePage() {
  const vendors = useFinanceStore((s) => s.vendors);
  const createRecord = useFinanceStore((s) => s.createRecord);
  const openInspector = useFinanceStore((s) => s.openInspector);
  const can = useCan();
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const vendor = findVendorByName(vendors, form.vendorName);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  // Typing a known vendor picks its usual category.
  const setVendorName = (vendorName) => {
    const match = findVendorByName(vendors, vendorName);
    setForm((f) => ({ ...f, vendorName, ...(match && { category: match.defaultCategory }) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const items = form.items.filter((l) => l.itemId);
    if (!items.length) return setError('Add at least one item.');
    if (items.some((l) => !(Number(l.quantity) > 0) || l.unitPrice === '')) return setError('Every item needs a quantity and unit price.');

    setBusy(true);
    setError('');
    try {
      const record = await createRecord({
        vendorName: form.vendorName,
        category: form.category,
        invoiceNumber: form.invoiceNumber,
        receiptDate: form.receiptDate,
        currency: form.currency,
        notes: form.notes,
        items: items.map(({ itemId, quantity, unitPrice }) => ({ itemId, quantity: Number(quantity), unitPrice: Number(unitPrice) })),
        verify: form.verify || form.paid,
        ...(form.paid && { payment: { ...form.payment, amount: linesTotal(items) } }),
      });
      setCreated(record);
      setForm({ ...blankForm(), vendorName: record.vendorName, category: form.category });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="New purchase invoice" subtitle="Enter a vendor bill by hand. Type the vendor's name; a new name is added to the vendor list." />

      {created && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          <span>
            Bill {created.invoiceNumber && <strong>{created.invoiceNumber}</strong>} saved for {created.vendorName} — {formatCurrency(created.amount, created.currency)} ({created.status}
            {created.verified ? ', verified' : ', awaiting verification'})
          </span>
          <button onClick={() => openInspector(created.id)} className="ml-auto inline-flex items-center gap-1 font-medium underline">
            <Eye className="h-4 w-4" /> Open
          </button>
          <Link to={`/invoices/${created.id}/print`} target="_blank" className="inline-flex items-center gap-1 font-medium underline">
            <Printer className="h-4 w-4" /> Print
          </Link>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Vendor name" className="sm:col-span-2">
            <input
              required
              list="new-invoice-vendors"
              className={inputClass}
              value={form.vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Type the vendor's name"
            />
            <datalist id="new-invoice-vendors">
              {vendors
                .filter((v) => v.active !== false)
                .map((v) => (
                  <option key={v.id} value={v.name} />
                ))}
            </datalist>
            {form.vendorName.trim() && !vendor && (
              <span className="mt-1 block text-xs text-slate-500">New vendor — it will be added to the vendor list.</span>
            )}
          </Field>
          <Field label="Category" className="sm:col-span-2">
            <select required className={inputClass} value={form.category} onChange={set('category')}>
              <option value="">—</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CATEGORIES[key].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Invoice No (optional)" className="sm:col-span-2">
            <input className={inputClass} value={form.invoiceNumber} onChange={set('invoiceNumber')} />
          </Field>
          <Field label="Receipt date" className="sm:col-span-2">
            <input type="date" required className={inputClass} value={form.receiptDate} onChange={set('receiptDate')} />
          </Field>
        </div>

        <div>
          <h2 className="mb-2 font-medium text-slate-900">Items</h2>
          <LineItemsEditor
            lines={form.items}
            onChange={(items) => setForm({ ...form, items })}
            vendorId={vendor?.id}
            receiptDate={form.receiptDate}
            currency={form.currency}
          />
          <p className="mt-1 text-xs text-slate-500">
            Items missing from the list? {can('manageItems') ? <Link to="/inventory" className="underline">Add them in Inventory</Link> : 'Ask a manager to add them to the catalog.'}
          </p>
        </div>

        <Field label="Notes">
          <textarea rows={2} className={inputClass} value={form.notes} onChange={set('notes')} />
        </Field>

        {can('verifyInvoice') && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.verify || form.paid} disabled={form.paid} onChange={set('verify')} />
              Verified — goods received, add items to warehouse stock now
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.paid} onChange={set('paid')} />
              Already paid in full
            </label>
            {form.paid && (
              <div className="grid grid-cols-1 gap-3 pl-6 sm:grid-cols-3">
                <Field label="Payment date">
                  <input type="date" className={inputClass} value={form.payment.date} onChange={(e) => setForm({ ...form, payment: { ...form.payment, date: e.target.value } })} />
                </Field>
                <Field label="Method">
                  <select className={inputClass} value={form.payment.method} onChange={(e) => setForm({ ...form, payment: { ...form.payment, method: e.target.value } })}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Reference">
                  <input className={inputClass} value={form.payment.reference} onChange={(e) => setForm({ ...form, payment: { ...form.payment, reference: e.target.value } })} />
                </Field>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-slate-500">
            Total <strong className="text-slate-900">{formatCurrency(linesTotal(form.items), form.currency)}</strong>
          </span>
          <button disabled={busy} className={buttonClass.primary}>
            {busy ? 'Saving…' : 'Save invoice'}
          </button>
        </div>
      </form>
    </>
  );
}

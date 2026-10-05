import { useEffect, useRef, useState } from 'react';
import { UploadCloud, FilePlus2, FileText, X, CheckCircle2 } from 'lucide-react';
import { useFinanceStore, useVisibleRecords } from '../../store/useFinanceStore';
import { useCan } from '../../utils/permissions';
import { findVendorByName } from '../../utils/vendors';
import { CATEGORIES, CATEGORY_KEYS } from '../../utils/categories';
import { formatCurrency, today } from '../../utils/format';
import Field, { inputClass, buttonClass } from '../common/Field';
import { linesTotal } from '../invoice/LineItemsEditor';
import QuickItemsEditor from './QuickItemsEditor';

const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf';

const PAY_STATUSES = [
  ['UNPAID', 'Pending'],
  ['PARTIAL', 'Partially paid'],
  ['PAID', 'Paid'],
];

const EMPTY = {
  vendorName: '',
  category: 'MISC_OPERATIONS',
  amount: '',
  invoiceNumber: '',
  receiptDate: today(),
  payStatus: 'UNPAID',
  paidPercent: '',
  billAvailable: false,
  items: [], // optional; verified bills with items add them to warehouse stock
};

const round2 = (n) => Math.round(n * 100) / 100;

export default function UploadDropzone() {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');

  const can = useCan();
  const canPay = can('recordPayment');
  const vendors = useFinanceStore((s) => s.vendors);
  const createRecord = useFinanceStore((s) => s.createRecord);
  const openInspector = useFinanceStore((s) => s.openInspector);
  const setSelectedVendor = useFinanceStore((s) => s.setSelectedVendor);
  const setSelectedCategory = useFinanceStore((s) => s.setSelectedCategory);
  const setDateRange = useFinanceStore((s) => s.setDateRange);
  // Is the saved bill visible in the ledger with the current vendor/category/date filters?
  const savedVisible = useVisibleRecords().some((r) => r.id === saved?.id);
  const showAllBills = () => {
    setSelectedVendor('ALL');
    setSelectedCategory('ALL');
    setDateRange({ from: '', to: '' });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const findVendor = (name) => findVendorByName(vendors, name);
  const knownVendor = findVendor(form.vendorName);

  // Typing a known vendor picks its usual category.
  const setVendorName = (vendorName) => {
    const vendor = findVendor(vendorName);
    setForm((f) => ({ ...f, vendorName, ...(vendor && { category: vendor.defaultCategory }) }));
  };

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  // The image is only kept for the bill; it is uploaded together with the bill on save.
  const handleFile = (picked) => {
    if (!picked) return;
    setError('');
    setSaved(null);
    setFile(picked);
    setPreview(picked.type.startsWith('image/') ? URL.createObjectURL(picked) : null);
    setForm((f) => ({ ...f, billAvailable: true }));
  };

  const hasItems = form.items.length > 0;
  // With items the bill total is their sum (the server computes it the same way).
  const amount = hasItems ? round2(linesTotal(form.items)) : Number(form.amount) || 0;
  const percent = Number(form.paidPercent) || 0;
  const paidNow = form.payStatus === 'PAID' ? amount : form.payStatus === 'PARTIAL' ? round2((amount * percent) / 100) : 0;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.items.some((l) => !l.itemId || !(Number(l.quantity) > 0) || l.unitPrice === '' || !(Number(l.unitPrice) >= 0))) {
      return setError('Each item needs an item, a quantity and a unit price (or remove the empty line).');
    }
    if (!(amount > 0)) return setError(hasItems ? 'The items add up to zero.' : 'Enter the bill amount.');
    if (form.payStatus === 'PARTIAL' && !(percent > 0 && percent < 100)) {
      return setError('Enter how much was paid, between 1% and 99%.');
    }

    setSaving(true);
    try {
      const record = await createRecord(
        {
          vendorName: form.vendorName,
          category: form.category,
          amount,
          invoiceNumber: form.invoiceNumber.trim() || undefined,
          receiptDate: form.receiptDate,
          billAvailable: form.billAvailable,
          ...(hasItems && {
            items: form.items.map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
          }),
          // Paid in full lets the server use the exact bill total.
          ...(canPay && form.payStatus === 'PAID' && { payment: { date: form.receiptDate } }),
          ...(canPay && form.payStatus === 'PARTIAL' && { payment: { amount: paidNow, date: form.receiptDate } }),
        },
        file
      );
      setSaved(record);
      setForm({ ...EMPTY, receiptDate: today() });
      clearFile();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
        <FilePlus2 className="h-5 w-5 text-indigo-600" /> Upload Bill
      </h2>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`relative flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'
        }`}
      >
        {preview ? (
          <img src={preview} alt="Receipt preview" className="max-h-64 rounded object-contain" />
        ) : file ? (
          <>
            <FileText className="h-10 w-10 text-slate-400" />
            <p className="mt-2 truncate text-sm text-slate-600">{file.name}</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-10 w-10 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">Drop a receipt here or click to browse</p>
            <p className="text-xs text-slate-400">PNG, JPG, WebP or PDF — optional</p>
          </>
        )}
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            className="absolute right-2 top-2 rounded-full bg-white p-1 text-slate-500 shadow hover:text-rose-600"
            title="Remove receipt"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <Field label="Vendor name">
          <input
            required
            list="quick-entry-vendors"
            className={inputClass}
            value={form.vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Type the vendor's name"
          />
          <datalist id="quick-entry-vendors">
            {vendors.map((v) => (
              <option key={v.id} value={v.name} />
            ))}
          </datalist>
          {form.vendorName.trim() && !knownVendor && (
            <span className="mt-1 block text-xs text-slate-500">New vendor — it will be added to the vendor list.</span>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice No">
            <input className={inputClass} value={form.invoiceNumber} onChange={set('invoiceNumber')} placeholder="Vendor's bill number" />
          </Field>
          <Field label={hasItems ? 'Amount (sum of items)' : 'Amount (PKR)'}>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              className={inputClass}
              value={hasItems ? amount : form.amount}
              onChange={set('amount')}
              disabled={hasItems}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input required type="date" className={inputClass} value={form.receiptDate} onChange={set('receiptDate')} />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={set('category')}>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CATEGORIES[key].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="text-sm text-slate-700">
          Items <span className="text-xs text-slate-400">(optional)</span>
          <p className="mb-1.5 text-xs text-slate-500">Add what was delivered to update warehouse stock (In Hand) once a manager verifies the bill.</p>
          <QuickItemsEditor
            lines={form.items}
            onChange={(items) => setForm((f) => ({ ...f, items }))}
            vendorId={knownVendor?.id}
            receiptDate={form.receiptDate}
          />
        </div>

        <div className="text-sm text-slate-700">
          Status
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1">
            {PAY_STATUSES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={!canPay && value !== 'UNPAID'}
                onClick={() => setForm((f) => ({ ...f, payStatus: value }))}
                className={`rounded px-2 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  form.payStatus === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {!canPay && <span className="mt-1 block text-xs text-slate-500">Only a manager can record payments.</span>}
        </div>

        {form.payStatus === 'PARTIAL' && (
          <div className="rounded-md bg-slate-50 p-3">
            <Field label="Paid so far (%)">
              <input
                required
                type="number"
                min="1"
                max="99"
                step="any"
                inputMode="decimal"
                className={inputClass}
                value={form.paidPercent}
                onChange={set('paidPercent')}
                placeholder="e.g. 20"
              />
            </Field>
            {amount > 0 && percent > 0 && percent < 100 && (
              <p className="mt-2 text-xs text-slate-600">
                <span className="font-medium text-emerald-700">{percent}% paid</span> ({formatCurrency(paidNow)}) ·{' '}
                <span className="font-medium text-rose-700">{round2(100 - percent)}% not paid</span> (
                {formatCurrency(amount - paidNow)})
              </p>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.billAvailable} onChange={set('billAvailable')} />
          Bill available (vendor gave a bill)
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button type="submit" disabled={saving} className={`${buttonClass.primary} w-full`}>
          {saving ? 'Saving…' : 'Save bill'}
        </button>
      </form>

      {saved && (
        <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              Bill {saved.invoiceNumber && <strong>{saved.invoiceNumber}</strong>} saved for {saved.vendorName}
            </span>
            <button onClick={() => openInspector(saved.id)} className="ml-auto shrink-0 font-medium underline">
              Open
            </button>
          </div>
          <p className="mt-1 text-xs">
            {savedVisible ? (
              'Added to the Vendor Ledger.'
            ) : (
              <>
                Hidden in the ledger by the current filters.{' '}
                <button onClick={showAllBills} className="font-medium underline">
                  Show all bills
                </button>
              </>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle2, Clock, XCircle, Printer, Save, Lock, ShieldCheck, ImageOff, Upload } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { errorMessage } from '../../api/client';
import { useCan } from '../../utils/permissions';
import { CATEGORIES, CATEGORY_KEYS } from '../../utils/categories';
import { formatCurrency, formatDateTime, toDateInput } from '../../utils/format';
import StatusBadge from '../common/StatusBadge';
import ConfirmButton from '../common/ConfirmButton';
import { inputClass } from '../common/Field';
import ReceiptViewer from './ReceiptViewer';
import LineItemsEditor, { linesTotal } from '../invoice/LineItemsEditor';
import PaymentsPanel from '../invoice/PaymentsPanel';

const ACTIONS = [
  { status: 'PAID', label: 'Mark Paid', icon: CheckCircle2, className: 'bg-emerald-600 hover:bg-emerald-700' },
  { status: 'PENDING', label: 'Mark Pending', icon: Clock, className: 'bg-amber-500 hover:bg-amber-600' },
  { status: 'FLAGGED', label: 'Flag / Reject', icon: XCircle, className: 'bg-rose-600 hover:bg-rose-700' },
];

const toForm = (record) => ({
  ...record,
  receiptDate: toDateInput(record.receiptDate),
  metadata: record.metadata ?? {},
  items: (record.items ?? []).map((l) => ({ ...l })),
});

export default function VerificationDrawer() {
  const record = useFinanceStore((s) => s.records.find((r) => r.id === s.inspectedRecordId));
  const closeInspector = useFinanceStore((s) => s.closeInspector);
  const updateRecord = useFinanceStore((s) => s.updateRecord);
  const setRecordStatus = useFinanceStore((s) => s.setRecordStatus);
  const deleteRecord = useFinanceStore((s) => s.deleteRecord);
  const attachReceipt = useFinanceStore((s) => s.attachReceipt);
  const can = useCan();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Result of the last action, tied to the bill it was for: { id, text }
  const [notice, setNotice] = useState(null);
  const [working, setWorking] = useState(null); // status being applied, for the button label

  // Reset the form when a different record opens or the record changes on the server.
  useEffect(() => {
    setForm(record ? toForm(record) : null);
    setError('');
  }, [record?.id, record?.updatedAt]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeInspector();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeInspector]);

  if (!record || !form) return null;

  const readOnly = !can('editInvoice');
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const hasLines = form.items.length > 0;

  const run = async (action) => {
    setBusy(true);
    setError('');
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const payload = () => ({
    ...form,
    amount: Number(form.amount),
    items: form.items.filter((l) => l.itemId).map(({ itemId, quantity, unitPrice }) => ({ itemId, quantity: Number(quantity), unitPrice: Number(unitPrice) })),
  });

  const save = () => run(() => updateRecord(record.id, payload()));
  // Save edits and apply the verification action in one request.
  const act = (status) => {
    setWorking(status);
    return run(async () => {
      const removed = status === 'PENDING' ? record.amountPaid : 0;
      await setRecordStatus(record.id, status, undefined, payload());
      const text = {
        PAID: 'Marked as paid.',
        PENDING: removed > 0 ? `Set to Pending (unpaid). ${formatCurrency(removed, record.currency)} of payments removed.` : 'Set to Pending (unpaid) and verified.',
        FLAGGED: 'Bill flagged. It no longer counts as owed or as stock received.',
      }[status];
      setNotice({ id: record.id, text });
    }).finally(() => setWorking(null));
  };

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-900/40" onClick={closeInspector}>
      <div
        className="flex h-full w-full max-w-[1500px] flex-col bg-white shadow-xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left (top on phones): the receipt, or a way to attach one when the bill has none. */}
        <div className="flex h-[35vh] min-w-0 shrink-0 bg-slate-800 md:h-auto md:flex-1">
          {record.imageUrl ? (
            <ReceiptViewer src={record.imageUrl} />
          ) : (
            <div className="m-auto flex max-w-xs flex-col items-center gap-3 p-6 text-center text-slate-300">
              <ImageOff className="h-10 w-10 text-slate-500" />
              <p className="text-sm">No receipt image for this bill{record.billAvailable === false ? ' (vendor gave no bill)' : ''}.</p>
              {!readOnly && (
                <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
                  <Upload className="h-4 w-4" /> {busy ? 'Uploading…' : 'Upload receipt'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      e.target.value = '';
                      if (file) run(() => attachReceipt(record.id, file));
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Right: invoice details, line items, payments, verification actions */}
        <div className="flex min-h-0 w-full flex-1 flex-col md:w-[min(780px,60%)] md:flex-none">
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                {record.invoiceNumber || 'No invoice no.'} <StatusBadge status={record.status} />
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {record.vendorName} · {record.imageUrl ? 'Receipt image' : 'No receipt image uploaded'} · entered by {record.createdBy || '—'}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <ShieldCheck className={`h-3.5 w-3.5 ${record.verified ? 'text-emerald-600' : 'text-slate-400'}`} />
                {record.verified ? `Verified by ${record.verifiedBy} · ${formatDateTime(record.verifiedAt)}` : 'Not verified yet — stock not added'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Link to={`/invoices/${record.id}/print`} target="_blank" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Print invoice">
                <Printer className="h-5 w-5" />
              </Link>
              <button onClick={closeInspector} className="rounded p-1.5 hover:bg-slate-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm sm:px-6 text-slate-700">
            {readOnly && (
              <p className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
                <Lock className="h-3.5 w-3.5" /> View only. Ask a manager or admin to make changes.
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="col-span-1 block">
                Category
                <select className={inputClass} value={form.category} onChange={set('category')} disabled={readOnly}>
                  {CATEGORY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {CATEGORIES[key].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Invoice No
                <input className={inputClass} value={form.invoiceNumber ?? ''} onChange={set('invoiceNumber')} disabled={readOnly} />
              </label>
              <label className="block">
                Receipt date
                <input type="date" className={inputClass} value={form.receiptDate} onChange={set('receiptDate')} disabled={readOnly} />
              </label>
            </div>

            {/* Items are only shown for bills entered with line items (New invoice page). */}
            {hasLines && (
              <div>
                <h3 className="mb-1.5 font-medium text-slate-900">Items</h3>
                <LineItemsEditor
                  allowAdd={false}
                  lines={form.items}
                  onChange={(items) => setForm({ ...form, items })}
                  vendorId={record.vendorId}
                  receiptDate={form.receiptDate}
                  excludeId={record.id}
                  currency={form.currency}
                  readOnly={readOnly}
                />
              </div>
            )}

            <label className="block">
              Total amount (PKR) {hasLines && <span className="text-xs text-slate-400">(sum of items)</span>}
              <input type="number" step="0.01" className={inputClass} value={hasLines ? linesTotal(form.items) : form.amount} onChange={set('amount')} disabled={readOnly || hasLines} />
            </label>

            <label className="block">
              Notes
              <textarea rows={2} className={inputClass} value={form.notes ?? ''} onChange={set('notes')} disabled={readOnly} />
            </label>

            <PaymentsPanel record={record} />
          </div>

          {!readOnly && (
            <div className="space-y-2 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              {notice?.id === record.id && (
                <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> {notice.text}
                </p>
              )}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {ACTIONS.map(({ status, label, icon: Icon, className }) =>
                  status === 'PENDING' && record.amountPaid > 0 ? (
                    <ConfirmButton
                      key={status}
                      disabled={busy}
                      onConfirm={() => act(status)}
                      title="Set this bill back to Pending?"
                      message={`${formatCurrency(record.amountPaid, record.currency)} has been recorded as paid on this bill. Setting it to Pending removes that payment, so the full ${formatCurrency(record.amount, record.currency)} shows as owed again.`}
                      confirmLabel="Remove payment & set Pending"
                      className={`flex items-center justify-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-white disabled:opacity-50 ${className}`}
                    >
                      <Icon className="h-4 w-4" />
                      {working === status ? 'Saving…' : label}
                    </ConfirmButton>
                  ) : (
                    <button
                      key={status}
                      disabled={busy}
                      onClick={() => act(status)}
                      className={`flex items-center justify-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-white disabled:opacity-50 ${className}`}
                    >
                      <Icon className="h-4 w-4" />
                      {working === status ? 'Saving…' : label}
                    </button>
                  )
                )}
              </div>
              <div className="flex items-center justify-between">
                <button disabled={busy} onClick={save} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50">
                  <Save className="h-4 w-4" /> Save changes only
                </button>
                {can('deleteInvoice') && (
                  <ConfirmButton
                    disabled={busy}
                    onConfirm={() => run(() => deleteRecord(record.id))}
                    title="Delete this bill?"
                    message={`${record.vendorName}${record.invoiceNumber ? ` · Invoice ${record.invoiceNumber}` : ''} · ${formatCurrency(record.amount, record.currency)} will be deleted with its receipt image and payments. This cannot be undone.`}
                    confirmLabel="Delete bill"
                    className="rounded-md px-2 py-1 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Delete invoice
                  </ConfirmButton>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Mark Paid records a payment for the remaining balance. Mark Pending sets the bill back to unpaid (removes recorded payments, admin only) and verifies it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

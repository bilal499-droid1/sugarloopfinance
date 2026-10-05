import { useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { errorMessage } from '../../api/client';
import { formatNumber } from '../../utils/format';
import Modal from '../common/Modal';
import Field, { inputClass, buttonClass } from '../common/Field';

// mode: 'transfer' (send to a bakery branch) or 'adjust' (set exact in-hand count)
export default function StockActionModal({ item, mode, onClose }) {
  const transferStock = useFinanceStore((s) => s.transferStock);
  const adjustStock = useFinanceStore((s) => s.adjustStock);
  const [form, setForm] = useState({ quantity: mode === 'adjust' ? item.inHand : '', branch: '', notes: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const isTransfer = mode === 'transfer';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isTransfer) await transferStock({ itemId: item.id, quantity: Number(form.quantity), branch: form.branch, notes: form.notes });
      else await adjustStock({ itemId: item.id, quantity: Number(form.quantity), reason: form.reason });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isTransfer ? `Transfer ${item.name} to a branch` : `Adjust ${item.name} stock`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button form="stock-form" disabled={busy} className={buttonClass.primary}>
            {isTransfer ? 'Record transfer' : 'Save adjustment'}
          </button>
        </>
      }
    >
      <form id="stock-form" onSubmit={submit} className="space-y-3">
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Currently in hand: <strong>{formatNumber(item.inHand)} {item.unit}</strong>
        </p>
        {isTransfer ? (
          <>
            <Field label={`Quantity to send (${item.unit})`}>
              <input type="number" required min="0" max={item.inHand} step="any" className={inputClass} value={form.quantity} onChange={set('quantity')} />
            </Field>
            <Field label="Destination branch">
              <input required className={inputClass} placeholder="Sugarloop Bakery Branch - DHA 2" value={form.branch} onChange={set('branch')} />
            </Field>
            <Field label="Notes">
              <input className={inputClass} value={form.notes} onChange={set('notes')} />
            </Field>
          </>
        ) : (
          <>
            <Field label={`Actual quantity in hand (${item.unit})`}>
              <input type="number" required min="0" step="any" className={inputClass} value={form.quantity} onChange={set('quantity')} />
            </Field>
            <Field label="Reason (required, kept in the stock log)">
              <input required className={inputClass} placeholder="e.g. Monthly physical count, spoilage" value={form.reason} onChange={set('reason')} />
            </Field>
          </>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}

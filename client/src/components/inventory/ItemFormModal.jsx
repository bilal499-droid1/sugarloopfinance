import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client';
import { useFinanceStore } from '../../store/useFinanceStore';
import Modal from '../common/Modal';
import Field, { inputClass, buttonClass } from '../common/Field';

export default function ItemFormModal({ item, onClose }) {
  const saveItem = useFinanceStore((s) => s.saveItem);
  const [units, setUnits] = useState(['kg']);
  const [form, setForm] = useState(item ?? { name: '', unit: 'kg', reorderLevel: 0, openingStock: 0, notes: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  useEffect(() => {
    api.get('/items/units').then((res) => setUnits(res.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveItem({ ...form, reorderLevel: Number(form.reorderLevel) || 0, openingStock: Number(form.openingStock) || 0 });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={item ? `Edit ${item.name}` : 'Add catalog item'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button form="item-form" disabled={busy} className={buttonClass.primary}>
            Save item
          </button>
        </>
      }
    >
      <form id="item-form" onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Item name" className="col-span-2">
          <input required className={inputClass} value={form.name} onChange={set('name')} placeholder="e.g. Flour (Maida)" />
        </Field>
        <Field label="Unit">
          <select className={inputClass} value={form.unit} onChange={set('unit')}>
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Reorder level (low-stock alert)">
          <input type="number" min="0" step="any" className={inputClass} value={form.reorderLevel} onChange={set('reorderLevel')} />
        </Field>
        {!item && (
          <Field label="Opening stock in hand" className="col-span-2">
            <input type="number" min="0" step="any" className={inputClass} value={form.openingStock} onChange={set('openingStock')} />
          </Field>
        )}
        <Field label="Notes" className="col-span-2">
          <input className={inputClass} value={form.notes ?? ''} onChange={set('notes')} />
        </Field>
        {error && <p className="col-span-2 text-sm text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}

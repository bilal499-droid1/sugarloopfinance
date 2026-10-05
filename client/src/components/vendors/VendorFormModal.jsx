import { useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { errorMessage } from '../../api/client';
import { CATEGORIES, CATEGORY_KEYS } from '../../utils/categories';
import Modal from '../common/Modal';
import Field, { inputClass, buttonClass } from '../common/Field';

const nextCode = (vendors) => {
  const numbers = vendors.map((v) => Number(v.code.match(/(\d+)$/)?.[1])).filter(Boolean);
  return `VND-${Math.max(1000, ...numbers) + 1}`;
};

export default function VendorFormModal({ vendor, onClose }) {
  const vendors = useFinanceStore((s) => s.vendors);
  const saveVendor = useFinanceStore((s) => s.saveVendor);
  const [form, setForm] = useState(
    vendor ?? { name: '', code: nextCode(vendors), defaultCategory: 'RAW_PROCUREMENT', contactName: '', phone: '', email: '', address: '', active: true }
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveVendor(form);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={vendor ? `Edit ${vendor.name}` : 'Add vendor'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button form="vendor-form" disabled={busy} className={buttonClass.primary}>
            Save vendor
          </button>
        </>
      }
    >
      <form id="vendor-form" onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Vendor name" className="col-span-2">
          <input required className={inputClass} value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Vendor code">
          <input required className={inputClass} value={form.code} onChange={set('code')} />
        </Field>
        <Field label="Default category">
          <select className={inputClass} value={form.defaultCategory} onChange={set('defaultCategory')}>
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {CATEGORIES[key].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contact person">
          <input className={inputClass} value={form.contactName ?? ''} onChange={set('contactName')} />
        </Field>
        <Field label="Phone">
          <input className={inputClass} value={form.phone ?? ''} onChange={set('phone')} />
        </Field>
        <Field label="Email" className="col-span-2">
          <input type="email" className={inputClass} value={form.email ?? ''} onChange={set('email')} />
        </Field>
        <Field label="Address" className="col-span-2">
          <textarea rows={2} className={inputClass} value={form.address ?? ''} onChange={set('address')} />
        </Field>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active !== false} onChange={set('active')} />
          Active (inactive vendors are hidden when entering new invoices)
        </label>
        {error && <p className="col-span-2 text-sm text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}

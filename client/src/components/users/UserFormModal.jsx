import { useState } from 'react';
import { errorMessage } from '../../api/client';
import { ROLE_LABELS } from '../../utils/permissions';
import Modal from '../common/Modal';
import Field, { inputClass, buttonClass } from '../common/Field';

const ROLE_HELP = {
  ADMIN: 'Everything, including managing users and deleting records.',
  MANAGER: 'Edit, verify and pay invoices; manage vendors, items and stock.',
  STAFF: 'Enter invoices and record branch transfers; view everything. Cannot edit or delete.',
};

export default function UserFormModal({ user, onSave, onClose }) {
  const [form, setForm] = useState(user ? { ...user, password: '' } : { name: '', email: '', role: 'STAFF', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { name, email, role, password } = form;
      await onSave({ id: user?.id, name, email, role, ...(password && { password }) });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={user ? `Edit ${user.name}` : 'Add user'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button form="user-form" disabled={busy} className={buttonClass.primary}>
            Save user
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input required className={inputClass} value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email">
          <input type="email" required className={inputClass} value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Role">
          <select className={inputClass} value={form.role} onChange={set('role')}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">{ROLE_HELP[form.role]}</span>
        </Field>
        <Field label={user ? 'New password (leave blank to keep)' : 'Password (min 8 characters)'}>
          <input type="password" minLength={8} required={!user} autoComplete="new-password" className={inputClass} value={form.password} onChange={set('password')} />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}

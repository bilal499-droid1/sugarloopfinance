import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useSalesStore } from '../useSalesStore';
import { useCan } from '../../utils/permissions';
import { errorMessage } from '../../api/client';
import { formatCurrency } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import Field, { inputClass, buttonClass } from '../../components/common/Field';
import Modal from '../../components/common/Modal';
import ConfirmButton from '../../components/common/ConfirmButton';

function CustomerModal({ customer, onClose }) {
  const { saveCustomer } = useSalesStore();
  const [form, setForm] = useState({ name: customer?.name ?? '', phone: customer?.phone ?? '', address: customer?.address ?? '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required');
    setBusy(true);
    setError('');
    try {
      await saveCustomer({ ...form, ...(customer && { id: customer.id }) });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={customer ? 'Edit Customer' : 'Add Customer'} onClose={onClose}>
      <div className="space-y-3 p-4">
        <Field label="Name *"><input autoFocus className={inputClass} value={form.name} onChange={set('name')} /></Field>
        <Field label="Phone"><input className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Address"><input className={inputClass} value={form.address} onChange={set('address')} /></Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>Cancel</button>
          <button type="button" onClick={save} disabled={busy} className={buttonClass.primary}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function CustomersPage() {
  const { customers, fetchSales, deleteCustomer } = useSalesStore();
  const can = useCan();
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { fetchSales(); }, [fetchSales]);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Outlets and customers who receive sales invoices."
        actions={
          can('manageVendors') && (
            <button onClick={() => setModal({ type: 'add' })} className={`${buttonClass.primary} inline-flex items-center gap-1.5`}>
              <Plus className="h-4 w-4" /> Add customer
            </button>
          )
        }
      />
      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2 text-right">Total Sales</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{c.code}</td>
                <td className="px-4 py-2 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-2 text-slate-600">{c.phone || '—'}</td>
                <td className="px-4 py-2 text-slate-600">{c.address || '—'}</td>
                <td className="px-4 py-2 text-right font-medium">{formatCurrency(c.totalSales)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {can('manageVendors') && (
                    <>
                      <button onClick={() => setModal({ type: 'edit', customer: c })} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><Pencil className="h-4 w-4" /></button>
                      <ConfirmButton
                        onConfirm={() => deleteCustomer(c.id).catch((err) => setError(errorMessage(err)))}
                        title="Delete this customer?"
                        message={`${c.name} will be removed.`}
                        className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </ConfirmButton>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!customers.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No customers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <CustomerModal customer={modal.customer} onClose={() => setModal(null)} />
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { useEmployeeStore } from '../useEmployeeStore';
import PageHeader from '../../components/common/PageHeader';
import { useCan } from '../../utils/permissions';

const blank = () => ({ name: '', designation: '', department: '', basicSalary: '' });

export default function EmployeesPage() {
  const { employees, loading, error, fetchEmployees, createEmployee, updateEmployee, deleteEmployee } = useEmployeeStore();
  const can = useCan();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => { fetchEmployees(); }, []);

  const openCreate = () => { setForm(blank()); setEditId(null); setFormError(null); setShowForm(true); };

  const openEdit = (emp) => {
    setForm({ name: emp.name, designation: emp.designation, department: emp.department, basicSalary: emp.basicSalary });
    setEditId(emp.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, basicSalary: Number(form.basicSalary) || 0 };
      editId ? await updateEmployee(editId, payload) : await createEmployee(payload);
      setShowForm(false);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this employee?')) return;
    await deleteEmployee(id);
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
      />
    </div>
  );

  return (
    <>
      <PageHeader title="Employees" subtitle="Manage employee records." />

      <div className="flex justify-end">
        {can('manageUsers') && (
          <button onClick={openCreate} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{editId ? 'Edit Employee' : 'New Employee'}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('name', 'Full Name *', 'text', 'e.g. Ali Hassan')}
            {field('designation', 'Designation', 'text', 'e.g. Manager')}
            {field('department', 'Department', 'text', 'e.g. Operations')}
            {field('basicSalary', 'Basic Salary (PKR)', 'number', '0')}
          </div>
          {formError && <p className="text-xs text-rose-600">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">Cancel</button>
          </div>
        </form>
      )}

      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

      {!loading && employees.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No employees yet. Add one to get started.
        </p>
      )}

      {employees.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Designation</th>
                <th className="px-4 py-3 text-left font-medium">Department</th>
                <th className="px-4 py-3 text-right font-medium">Basic Salary</th>
                {can('manageUsers') && <th className="px-4 py-3 text-center font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{emp.employeeId}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{emp.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{emp.designation || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{emp.department || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-800 dark:text-slate-200">
                    {emp.basicSalary > 0 ? `PKR ${emp.basicSalary.toLocaleString()}` : '—'}
                  </td>
                  {can('manageUsers') && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(emp)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(emp.id)} className="text-rose-500 hover:text-rose-700 dark:text-rose-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

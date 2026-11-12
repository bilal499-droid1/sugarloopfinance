import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useEmployeeStore } from '../useEmployeeStore';
import { usePayrollStore } from '../usePayrollStore';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/format';

const thisMonth = () => new Date().toISOString().slice(0, 7);
const newLine = () => ({ id: Date.now() + Math.random(), name: '', amount: '' });

function LineTable({ title, rows, onChange, onAdd, onRemove, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className={`flex items-center justify-between rounded-t-xl px-4 py-2 ${colors[color]}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-70">
          <Plus className="h-3.5 w-3.5" /> Add Row
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">No items — click Add Row.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2 px-4 py-2">
              <input
                type="text"
                placeholder="Name (e.g. House Rent)"
                value={row.name}
                onChange={(e) => onChange(row.id, 'name', e.target.value)}
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <input
                type="number"
                min="0"
                placeholder="Amount"
                value={row.amount}
                onChange={(e) => onChange(row.id, 'amount', e.target.value)}
                className="w-28 rounded border border-slate-300 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <button type="button" onClick={() => onRemove(row.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700">
        Total: {formatCurrency(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0))}
      </div>
    </div>
  );
}

export default function PayrollEntryPage() {
  const { employees, fetchEmployees } = useEmployeeStore();
  const { createRecord } = usePayrollStore();

  const [empId, setEmpId] = useState('');
  const [month, setMonth] = useState(thisMonth());
  const [basicSalary, setBasicSalary] = useState('');
  const [allowances, setAllowances] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => { fetchEmployees(); }, []);

  const selectedEmp = employees.find((e) => e.id === empId);

  useEffect(() => {
    if (selectedEmp) setBasicSalary(selectedEmp.basicSalary ?? '');
  }, [empId]);

  const makeUpdater = (setter) => (id, field, val) =>
    setter((prev) => prev.map((r) => r.id === id ? { ...r, [field]: val } : r));

  const sumOf = (rows) => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const gross = (Number(basicSalary) || 0) + sumOf(allowances) + sumOf(bonuses);
  const net = gross - sumOf(deductions);

  const toLines = (rows) =>
    rows.filter((r) => r.name.trim() && Number(r.amount) > 0)
        .map((r) => ({ name: r.name.trim(), amount: Number(r.amount) }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    if (!empId) { setError('Please select an employee.'); return; }
    if (!month) { setError('Please select a month.'); return; }
    setSaving(true);
    try {
      const record = await createRecord({
        employeeId: empId,
        month,
        basicSalary: Number(basicSalary) || 0,
        allowances: toLines(allowances),
        bonuses: toLines(bonuses),
        deductions: toLines(deductions),
        paymentDate: paymentDate || undefined,
        paymentStatus,
      });
      setSaved(record);
      setEmpId(''); setMonth(thisMonth()); setBasicSalary('');
      setAllowances([]); setBonuses([]); setDeductions([]);
      setPaymentDate(''); setPaymentStatus('pending');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Payroll Entry" subtitle="Record monthly salary for an employee." />

      <form onSubmit={handleSave} className="space-y-5">
        {/* Employee + Month */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Employee *</label>
              <select
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="">— Select Employee —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.employeeId} — {emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Month *</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Basic Salary (PKR)</label>
              <input type="number" min="0" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
          </div>
          {selectedEmp && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Designation: <strong className="text-slate-700 dark:text-slate-200">{selectedEmp.designation || '—'}</strong></span>
              <span>Department: <strong className="text-slate-700 dark:text-slate-200">{selectedEmp.department || '—'}</strong></span>
            </div>
          )}
        </div>

        {/* Allowances / Bonuses / Deductions */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <LineTable title="Allowances" rows={allowances} color="indigo"
            onAdd={() => setAllowances((p) => [...p, newLine()])}
            onRemove={(id) => setAllowances((p) => p.filter((r) => r.id !== id))}
            onChange={makeUpdater(setAllowances)} />
          <LineTable title="Bonuses" rows={bonuses} color="emerald"
            onAdd={() => setBonuses((p) => [...p, newLine()])}
            onRemove={(id) => setBonuses((p) => p.filter((r) => r.id !== id))}
            onChange={makeUpdater(setBonuses)} />
          <LineTable title="Deductions" rows={deductions} color="rose"
            onAdd={() => setDeductions((p) => [...p, newLine()])}
            onRemove={(id) => setDeductions((p) => p.filter((r) => r.id !== id))}
            onChange={makeUpdater(setDeductions)} />
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">Basic</div>
              <div className="text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(Number(basicSalary) || 0)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">+ Allowances & Bonuses</div>
              <div className="text-lg font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">{formatCurrency(sumOf(allowances) + sumOf(bonuses))}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">Gross Salary</div>
              <div className="text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(gross)}</div>
            </div>
            <div className="rounded-lg bg-green-50 py-2 text-center dark:bg-green-900/20">
              <div className="text-xs text-green-600 dark:text-green-400">Net Take-Home</div>
              <div className="text-xl font-bold tabular-nums text-green-700 dark:text-green-300">{formatCurrency(net)}</div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Payment Date</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Payment Status</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

        {saved && (
          <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            Payroll saved for <strong>{saved.employeeName}</strong> — {saved.month}. Net: <strong>{formatCurrency(saved.netSalary)}</strong>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Payroll'}
          </button>
        </div>
      </form>
    </>
  );
}

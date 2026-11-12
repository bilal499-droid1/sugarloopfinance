import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { usePayrollStore } from '../usePayrollStore';
import { useEmployeeStore } from '../useEmployeeStore';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/format';
import { useCan } from '../../utils/permissions';

const thisMonth = () => new Date().toISOString().slice(0, 7);

const StatusBadge = ({ status }) =>
  status === 'paid' ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Paid</span>
  ) : (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Pending</span>
  );

export default function PayrollBrowsePage() {
  const { records, loading, error, fetchRecords, updateRecord, deleteRecord } = usePayrollStore();
  const { employees, fetchEmployees } = useEmployeeStore();
  const can = useCan();

  const [month, setMonth] = useState(thisMonth());
  const [department, setDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchRecords({ month });
  }, []);

  const handleSearch = () =>
    fetchRecords({ month, ...(department && { department }), ...(statusFilter && { status: statusFilter }) });

  const handleDelete = async (id) => {
    if (!confirm('Delete this payroll record?')) return;
    await deleteRecord(id);
  };

  const handleMarkPaid = async (rec) => {
    await updateRecord(rec.id, { paymentStatus: 'paid', paymentDate: new Date().toISOString().slice(0, 10) });
  };

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();

  const totalNet = records.reduce((s, r) => s + (r.netSalary || 0), 0);
  const totalGross = records.reduce((s, r) => s + (r.grossSalary || 0), 0);

  return (
    <>
      <PageHeader title="Payroll Browse" subtitle="View and manage payroll records." />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
            <option value="">All</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <button onClick={handleSearch}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
          Search
        </button>
      </div>

      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

      {!loading && records.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No payroll records found for this period.
        </p>
      )}

      {records.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Dept</th>
                  <th className="px-4 py-3 text-left font-medium">Month</th>
                  <th className="px-4 py-3 text-right font-medium">Basic</th>
                  <th className="px-4 py-3 text-right font-medium">Gross</th>
                  <th className="px-4 py-3 text-right font-medium">Deductions</th>
                  <th className="px-4 py-3 text-right font-medium">Net Pay</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Paid On</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {records.map((rec) => {
                  const totalDed = rec.deductions?.reduce((s, d) => s + d.amount, 0) || 0;
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{rec.employeeName}</div>
                        <div className="text-xs text-slate-400">{rec.designation || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rec.department || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rec.month}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(rec.basicSalary)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(rec.grossSalary)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400">{totalDed > 0 ? `−${formatCurrency(totalDed)}` : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700 dark:text-green-400">{formatCurrency(rec.netSalary)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={rec.paymentStatus} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {rec.paymentDate ? new Date(rec.paymentDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {rec.paymentStatus === 'pending' && (
                            <button onClick={() => handleMarkPaid(rec)}
                              className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50">
                              Mark Paid
                            </button>
                          )}
                          {can('manageUsers') && (
                            <button onClick={() => handleDelete(rec.id)} className="text-rose-500 hover:text-rose-700 dark:text-rose-400">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right text-xs">Total Gross</td>
                  <td colSpan={1} className="px-4 py-2 text-right tabular-nums">{formatCurrency(totalGross)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-green-700 dark:text-green-400">{formatCurrency(totalNet)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}

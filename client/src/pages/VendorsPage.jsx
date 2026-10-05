import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { errorMessage } from '../api/client';
import { useCan } from '../utils/permissions';
import { formatCurrency } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import CategoryBadge from '../components/common/CategoryBadge';
import ConfirmButton from '../components/common/ConfirmButton';
import { buttonClass } from '../components/common/Field';
import VendorFormModal from '../components/vendors/VendorFormModal';

export default function VendorsPage() {
  const vendors = useFinanceStore((s) => s.vendors);
  const deleteVendor = useFinanceStore((s) => s.deleteVendor);
  const can = useCan();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // vendor, or {} for new
  const [error, setError] = useState('');

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return vendors.filter((v) => !q || `${v.name} ${v.code} ${v.contactName ?? ''}`.toLowerCase().includes(q));
  }, [vendors, query]);

  const totals = vendors.reduce(
    (t, v) => ({ billed: t.billed + v.totalBilled, paid: t.paid + v.totalPaid, pending: t.pending + v.pendingBalance }),
    { billed: 0, paid: 0, pending: 0 }
  );

  return (
    <>
      <PageHeader
        title="Vendors"
        subtitle={`${vendors.length} vendors · ${formatCurrency(totals.pending)} outstanding`}
        actions={
          can('manageVendors') && (
            <button onClick={() => setEditing({})} className={`${buttonClass.primary} inline-flex items-center gap-1.5`}>
              <Plus className="h-4 w-4" /> Add vendor
            </button>
          )
        }
      />

      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-2 left-2 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vendors" className="w-full rounded-md border border-slate-300 py-1.5 pr-3 pl-8 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Vendor</th>
                <th className="px-4 py-2">Default category</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2 text-right">Billed</th>
                <th className="px-4 py-2 text-right">Paid</th>
                <th className="px-4 py-2 text-right">Outstanding</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className={`border-t border-slate-100 hover:bg-slate-50 ${v.active === false ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2">
                    <Link to={`/vendors/${v.id}`} className="font-medium text-indigo-700 hover:underline">
                      {v.name}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {v.code}
                      {v.active === false && ' · inactive'}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <CategoryBadge category={v.defaultCategory} />
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {v.contactName || '—'}
                    {v.phone && <div className="text-xs text-slate-400">{v.phone}</div>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(v.totalBilled)}</td>
                  <td className="px-4 py-2 text-right text-emerald-700 tabular-nums">{formatCurrency(v.totalPaid)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${v.pendingBalance > 0 ? 'font-medium text-amber-700' : 'text-slate-400'}`}>
                    {formatCurrency(v.pendingBalance)}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {can('manageVendors') && (
                      <button onClick={() => setEditing(v)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Edit ${v.name}`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {can('deleteVendor') && (
                      <ConfirmButton onConfirm={() => deleteVendor(v.id).catch((err) => setError(errorMessage(err)))} title="Delete this vendor?" message={`${v.name} will be removed from the vendor list.`} className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                        Delete
                      </ConfirmButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && <VendorFormModal vendor={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </>
  );
}

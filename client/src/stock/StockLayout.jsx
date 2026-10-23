
import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, BarChart2, Croissant, FilePen, FileSearch, PackageMinus, PackagePlus, Printer, RefreshCw, Undo2, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { ROLE_LABELS } from '../utils/permissions';
import { formatDate } from '../utils/format';
import { useReturnsStore } from './useReturnsStore';

export const BASE = '/stock-preview';

// Row 1 of the old POS "Stock" screen, in the same order and groups.
const GROUPS = [
  [
    { to: 'purchase', label: 'Purchase', icon: PackagePlus },
    { to: 'edit-purchase', label: 'Edit Purchase', icon: FilePen },
  ],
  [
    { to: 'purchase-return', label: 'Purchase Return', icon: PackageMinus },
    { to: 'edit-return', label: 'Edit Pur Return', icon: Undo2 },
  ],
  [
    { to: 'print-purchase', label: 'Print Purchase', icon: Printer },
    { to: 'print-vendor', label: 'Print Purchase Vendor', icon: Users },
    { to: 'purchase-search', label: 'Purchase Search', icon: FileSearch },
  ],
  // Row 3 (row 2, Print Transfer, is left out on purpose).
  [{ to: 'stock-refresh', label: 'Stock Refresh', icon: RefreshCw }],
  [{ to: 'consumption', label: 'Consumption', icon: BarChart2 }],
];

// Stand-alone shell for the stock preview pages (own URL, not in the main menu yet).
export default function StockLayout() {
  const user = useAuthStore((s) => s.user);
  const error = useFinanceStore((s) => s.error);
  const lastRemoteChange = useFinanceStore((s) => s.lastRemoteChange);
  const fetchReturns = useReturnsStore((s) => s.fetchReturns);

  // Load returns, and reload when someone else changes one.
  useEffect(() => {
    if (!lastRemoteChange || lastRemoteChange.area === 'returns') fetchReturns().catch(() => {});
  }, [lastRemoteChange, fetchReturns]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Croissant className="h-7 w-7 text-amber-600" />
            <div>
              <div className="leading-tight font-semibold text-slate-900">Sugarloop · Stock</div>
              <div className="text-xs text-slate-500">
                {user?.name} ({ROLE_LABELS[user?.role]}) · {formatDate(new Date())}
              </div>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
          {GROUPS.map((group, g) => (
            <div key={g} className={`flex shrink-0 gap-1 ${g ? 'border-l border-slate-200 pl-1' : ''}`}>
              {group.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={`${BASE}/${to}`}
                  className={({ isActive }) =>
                    `flex w-24 shrink-0 flex-col items-center gap-1 rounded-md px-2 py-2 text-center text-xs font-medium ${
                      isActive ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 print:max-w-none print:p-0">
        {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
        <Outlet />
      </main>
    </div>
  );
}

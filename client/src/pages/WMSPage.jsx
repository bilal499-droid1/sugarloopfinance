import { NavLink, Outlet } from 'react-router-dom';
import { BarChart2, FilePen, FileSearch, PackageMinus, Pencil, Printer, RefreshCw, ShoppingBag, TrendingDown, UserPlus } from 'lucide-react';

const GROUPS = [
  [{ to: 'stock-refresh', label: 'Stock Refresh', icon: RefreshCw }],
  [{ to: 'consumption', label: 'Consumption', icon: BarChart2 }],
  [
    { to: 'sale', label: 'Transfer Out', icon: ShoppingBag },
    { to: 'edit-sale', label: 'Edit Transfer', icon: FilePen },
  ],
  [
    { to: 'print-sale', label: 'Print Sale', icon: Printer },
    { to: 'sale-search', label: 'Sale Search', icon: FileSearch },
  ],
  [{ to: 'customers', label: 'Customers', icon: UserPlus }],
  [
    { to: 'saleout', label: 'Sale Out', icon: TrendingDown },
    { to: 'saleout-search', label: 'SO Browse', icon: FileSearch },
  ],
  [{ to: 'edit-price', label: 'Edit Price', icon: Pencil }],
];

export default function WMSPage() {
  return (
    <div className="space-y-6">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
        {GROUPS.map((group, g) => (
          <div key={g} className={`flex shrink-0 gap-1 ${g ? 'border-l border-slate-200 pl-1 dark:border-slate-700' : ''}`}>
            {group.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex w-24 shrink-0 flex-col items-center gap-1 rounded-md px-2 py-2 text-center text-xs font-medium ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
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

      <Outlet />
    </div>
  );
}

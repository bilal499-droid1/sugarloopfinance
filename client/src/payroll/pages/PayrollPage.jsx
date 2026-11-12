import { NavLink, Outlet } from 'react-router-dom';
import { Users, FilePlus, FileSearch } from 'lucide-react';

const TABS = [
  { to: 'employees', label: 'Employees', icon: Users },
  { to: 'entry', label: 'Payroll Entry', icon: FilePlus },
  { to: 'browse', label: 'Browse', icon: FileSearch },
];

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex w-28 shrink-0 flex-col items-center gap-1 rounded-md px-2 py-2 text-center text-xs font-medium ${
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
      </nav>
      <Outlet />
    </div>
  );
}

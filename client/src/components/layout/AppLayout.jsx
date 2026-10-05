import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Croissant, LayoutDashboard, FilePlus2, Building2, Boxes, Landmark, Users, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useCan, ROLE_LABELS } from '../../utils/permissions';
import VerificationDrawer from '../inspector/VerificationDrawer';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/invoices/new', label: 'New Invoice', icon: FilePlus2, permission: 'createInvoice' },
  { to: '/vendors', label: 'Vendors', icon: Building2 },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/liabilities', label: 'Liabilities', icon: Landmark },
  { to: '/users', label: 'Users', icon: Users, permission: 'manageUsers' },
];

const Brand = () => (
  <div className="flex items-center gap-2">
    <Croissant className="h-7 w-7 text-amber-600" />
    <div>
      <div className="leading-tight font-semibold text-slate-900">Sugarloop</div>
      <div className="text-xs text-slate-500">Finance &amp; Billing</div>
    </div>
  </div>
);

// Sidebar on large screens; on phones and tablets a top bar with a slide-in menu.
export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const error = useFinanceStore((s) => s.error);
  const can = useCan();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.filter((n) => !n.permission || can(n.permission)).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMenuOpen(false)} // closes the mobile menu after navigating
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="px-2 text-sm font-medium text-slate-900">{user?.name}</div>
        <div className="truncate px-2 text-xs text-slate-500">
          {ROLE_LABELS[user?.role]} · {user?.email}
        </div>
        <button onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
        <Brand />
        <button onClick={() => setMenuOpen(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile / tablet slide-in menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="flex h-full w-64 max-w-[80%] flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <Brand />
              <button onClick={() => setMenuOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-200 px-4 py-4">
          <Brand />
        </div>
        {sidebar}
      </aside>

      <main className="min-w-0 flex-1 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
        <Outlet />
      </main>

      <VerificationDrawer />
    </div>
  );
}

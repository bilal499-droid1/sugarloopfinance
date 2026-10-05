import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useFinanceStore } from './store/useFinanceStore';
import { useCan } from './utils/permissions';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewInvoicePage from './pages/NewInvoicePage';
import InvoicePrintPage from './pages/InvoicePrintPage';
import VendorsPage from './pages/VendorsPage';
import VendorDetailPage from './pages/VendorDetailPage';
import InventoryPage from './pages/InventoryPage';
import LiabilitiesPage from './pages/LiabilitiesPage';
import UsersPage from './pages/UsersPage';

const RequirePermission = ({ permission, children }) => (useCan()(permission) ? children : <Navigate to="/" replace />);

export default function App() {
  const status = useAuthStore((s) => s.status);
  const restore = useAuthStore((s) => s.restore);
  const fetchAll = useFinanceStore((s) => s.fetchAll);
  const startLive = useFinanceStore((s) => s.startLive);
  const stopLive = useFinanceStore((s) => s.stopLive);

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (status !== 'signedIn') return;
    fetchAll();
    startLive();
    return stopLive;
  }, [status, fetchAll, startLive, stopLive]);

  if (status === 'checking') return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  if (status === 'signedOut') return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/invoices/:id/print" element={<InvoicePrintPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="invoices/new"
            element={
              <RequirePermission permission="createInvoice">
                <NewInvoicePage />
              </RequirePermission>
            }
          />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="vendors/:id" element={<VendorDetailPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="liabilities" element={<LiabilitiesPage />} />
          <Route
            path="users"
            element={
              <RequirePermission permission="manageUsers">
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

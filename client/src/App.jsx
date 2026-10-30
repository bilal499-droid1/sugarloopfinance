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
import LedgerPeriodsPage from './pages/LedgerPeriodsPage';
import StockLayout, { BASE as STOCK_BASE } from './stock/StockLayout';
import PurchasePage from './stock/pages/PurchasePage';
import EditPurchasePage from './stock/pages/EditPurchasePage';
import PurchaseReturnPage from './stock/pages/PurchaseReturnPage';
import EditReturnPage from './stock/pages/EditReturnPage';
import PrintPurchasePage from './stock/pages/PrintPurchasePage';
import PurchaseSearchPage from './stock/pages/PurchaseSearchPage';
import StockRefreshPage from './stock/pages/StockRefreshPage';
import ConsumptionPage from './stock/pages/ConsumptionPage';
import SalePage from './stock/pages/SalePage';
import EditSalePage from './stock/pages/EditSalePage';
import PrintSalePage from './stock/pages/PrintSalePage';
import SaleSearchPage from './stock/pages/SaleSearchPage';
import CustomersPage from './stock/pages/CustomersPage';

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
        {/* Stock module preview: own URL, not in the main menu until it's finalised. */}
        <Route path={STOCK_BASE} element={<StockLayout />}>
          <Route index element={<Navigate to="purchase" replace />} />
          <Route path="purchase" element={<PurchasePage />} />
          <Route path="edit-purchase" element={<EditPurchasePage />} />
          <Route path="purchase-return" element={<PurchaseReturnPage />} />
          <Route path="edit-return" element={<EditReturnPage />} />
          <Route path="print-purchase" element={<PrintPurchasePage />} />
          <Route path="purchase-search" element={<PurchaseSearchPage />} />
          <Route path="stock-refresh" element={<StockRefreshPage />} />
          <Route path="consumption" element={<ConsumptionPage />} />
          <Route path="sale" element={<SalePage />} />
          <Route path="edit-sale" element={<EditSalePage />} />
          <Route path="print-sale" element={<PrintSalePage />} />
          <Route path="sale-search" element={<SaleSearchPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="*" element={<Navigate to="purchase" replace />} />
        </Route>
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
          <Route
            path="ledger-periods"
            element={
              <RequirePermission permission="managePeriods">
                <LedgerPeriodsPage />
              </RequirePermission>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

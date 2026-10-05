import { Link } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import { useCan } from '../utils/permissions';
import PageHeader from '../components/common/PageHeader';
import { buttonClass } from '../components/common/Field';
import SummaryDashboard from '../components/dashboard/SummaryDashboard';
import LowStockPanel from '../components/dashboard/LowStockPanel';
import VendorSelector from '../components/vendors/VendorSelector';
import DateRangeFilter from '../components/filters/DateRangeFilter';
import CategoryFilter from '../components/filters/CategoryFilter';
import UploadDropzone from '../components/upload/UploadDropzone';
import LedgerTable from '../components/ledger/LedgerTable';

export default function DashboardPage() {
  const can = useCan();

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Upload, verify and track vendor bills"
        actions={
          can('createInvoice') && (
            <Link to="/invoices/new" className={`${buttonClass.primary} inline-flex items-center gap-1.5`}>
              <FilePlus2 className="h-4 w-4" /> New invoice
            </Link>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <VendorSelector />
        <DateRangeFilter />
      </div>
      <SummaryDashboard />
      <LowStockPanel />
      <CategoryFilter />
      <div className="grid gap-6 2xl:grid-cols-[380px_1fr]">
        <UploadDropzone />
        <LedgerTable />
      </div>
    </>
  );
}

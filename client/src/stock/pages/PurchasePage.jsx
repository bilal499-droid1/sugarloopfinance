import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Printer } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import PurchaseForm, { blankPurchase } from '../components/PurchaseForm';

// Purchase: enter a vendor bill (date, vendor, products one by one).
export default function PurchasePage() {
  const [saved, setSaved] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [next, setNext] = useState(blankPurchase);

  // Keep the date for the next bill (several bills are usually entered for one day).
  const onSaved = (record) => {
    setSaved(record);
    setNext(blankPurchase(record.receiptDate.slice(0, 10)));
    setFormKey((k) => k + 1);
  };

  return (
    <>
      <PageHeader title="Purchase" subtitle="Enter a vendor bill: date, vendor name, then each product." />

      {saved && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          <span>
            Bill {saved.invoiceNumber && <strong>{saved.invoiceNumber}</strong>} saved for {saved.vendorName} — {formatCurrency(saved.amount, saved.currency)}
            {saved.verified ? ' (verified, added to stock)' : ' (awaiting verification)'}
          </span>
          <Link to={`/invoices/${saved.id}/print`} target="_blank" className="ml-auto inline-flex items-center gap-1 font-medium underline">
            <Printer className="h-4 w-4" /> Print
          </Link>
        </div>
      )}

      <PurchaseForm key={formKey} initial={next} onSaved={onSaved} />
    </>
  );
}

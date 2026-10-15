import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import ReturnForm, { blankReturn } from '../components/ReturnForm';

// Purchase Return: goods sent back to a vendor (damaged, expired, wrong item…).
export default function PurchaseReturnPage() {
  const [saved, setSaved] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [next, setNext] = useState(blankReturn);

  const onSaved = (ret) => {
    setSaved(ret);
    setNext(blankReturn(ret.returnDate.slice(0, 10)));
    setFormKey((k) => k + 1);
  };

  return (
    <>
      <PageHeader title="Purchase Return" subtitle="Goods sent back to a vendor. Saving takes them out of warehouse stock." />

      {saved && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          Return <strong>{saved.returnNo}</strong> saved for {saved.vendorName} — {formatCurrency(saved.amount, saved.currency)}
          {saved.invoiceNumber && ` (against bill ${saved.invoiceNumber})`}
        </p>
      )}

      <ReturnForm key={formKey} initial={next} onSaved={onSaved} />
    </>
  );
}

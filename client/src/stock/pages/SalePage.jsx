import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { useSalesStore } from '../useSalesStore';
import PageHeader from '../../components/common/PageHeader';
import SaleForm, { blankSale } from '../components/SaleForm';

export default function SalePage() {
  const fetchSales = useSalesStore((s) => s.fetchSales);
  const [saved, setSaved] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [next, setNext] = useState(blankSale);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const onSaved = (record) => {
    setSaved(record);
    setNext(blankSale(record.saleDate.slice(0, 10)));
    setFormKey((k) => k + 1);
  };

  return (
    <>
      <PageHeader title="Sale" subtitle="Enter a sale: date, customer, then each product sold." />

      {saved && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          <span>
            Invoice <strong>{saved.saleInvoiceNo}</strong> saved for {saved.customerName} — {formatCurrency(saved.amount)} · stock updated.
          </span>
        </div>
      )}

      <SaleForm key={formKey} initial={next} onSaved={onSaved} />
    </>
  );
}

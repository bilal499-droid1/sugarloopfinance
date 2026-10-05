import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, Croissant } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { CATEGORIES } from '../utils/categories';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';

// Print-friendly purchase invoice. Opens in its own tab; use the browser's print / Save as PDF.
export default function InvoicePrintPage() {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/records/${id}`)
      .then(async ({ data }) => {
        setRecord(data);
        setVendor((await api.get(`/vendors/${data.vendorId}`)).data);
      })
      .catch((err) => setError(errorMessage(err, 'Invoice not found')));
  }, [id]);

  if (error) return <p className="p-8 text-rose-600">{error}</p>;
  if (!record) return <p className="p-8 text-slate-500">Loading…</p>;

  const money = (v) => formatCurrency(v, record.currency);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end print:hidden">
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 bg-white p-10 text-sm text-slate-800 shadow print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b border-slate-300 pb-4">
          <div className="flex items-center gap-2">
            <Croissant className="h-8 w-8 text-amber-600" />
            <div>
              <div className="text-lg font-semibold">Sugarloop</div>
              <div className="text-xs text-slate-500">Central Warehouse &amp; Kitchen</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold tracking-wide">PURCHASE INVOICE</div>
            {record.invoiceNumber && <div className="font-medium">Invoice No: {record.invoiceNumber}</div>}
            <div className="text-xs text-slate-500">Status: {record.status}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase">Vendor</div>
            <div className="font-medium">{record.vendorName}</div>
            {vendor && (
              <div className="text-slate-600">
                {vendor.code}
                {vendor.contactName && <div>{vendor.contactName}</div>}
                {vendor.phone && <div>{vendor.phone}</div>}
                {vendor.address && <div>{vendor.address}</div>}
              </div>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            <dt className="text-slate-500">Receipt date</dt>
            <dd>{formatDate(record.receiptDate)}</dd>
            <dt className="text-slate-500">Vendor bill #</dt>
            <dd>{record.invoiceNumber || '—'}</dd>
            <dt className="text-slate-500">Category</dt>
            <dd>{CATEGORIES[record.category]?.label}</dd>
            <dt className="text-slate-500">Entered by</dt>
            <dd>{record.createdBy || '—'}</dd>
            <dt className="text-slate-500">Verified by</dt>
            <dd>{record.verified ? `${record.verifiedBy}, ${formatDate(record.verifiedAt)}` : 'Not verified'}</dd>
          </dl>
        </section>

        {(record.originLocation || record.destinationLocation) && (
          <p>
            <span className="text-slate-500">Route:</span> {record.originLocation || '—'} → {record.destinationLocation || '—'}
          </p>
        )}

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-slate-300 text-left text-xs text-slate-500 uppercase">
              <th className="py-2">#</th>
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {record.items.map((line, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="py-2">{i + 1}</td>
                <td className="py-2">{line.itemName}</td>
                <td className="py-2 text-right">
                  {formatNumber(line.quantity)} {line.unit}
                </td>
                <td className="py-2 text-right">{money(line.unitPrice)}</td>
                <td className="py-2 text-right">{money(line.amount)}</td>
              </tr>
            ))}
            {!record.items.length && (
              <tr className="border-b border-slate-200">
                <td className="py-2" colSpan={4}>
                  {CATEGORIES[record.category]?.label} expense
                </td>
                <td className="py-2 text-right">{money(record.amount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-3 text-right font-semibold">
                Grand total
              </td>
              <td className="pt-3 text-right font-semibold">{money(record.amount)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="text-right text-slate-500">
                Paid
              </td>
              <td className="text-right">{money(record.amountPaid)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="text-right text-slate-500">
                Balance due
              </td>
              <td className="text-right font-medium">{money(record.balance)}</td>
            </tr>
          </tfoot>
        </table>

        {record.payments.length > 0 && (
          <section>
            <div className="mb-1 text-xs font-medium text-slate-500 uppercase">Payments</div>
            {record.payments.map((p) => (
              <div key={p._id}>
                {formatDate(p.date)} · {p.method} · {money(p.amount)}
                {p.reference && ` · ${p.reference}`}
              </div>
            ))}
          </section>
        )}

        {record.notes && (
          <section>
            <div className="mb-1 text-xs font-medium text-slate-500 uppercase">Notes</div>
            <p className="whitespace-pre-wrap">{record.notes}</p>
          </section>
        )}

        <footer className="grid grid-cols-2 gap-12 pt-12 text-xs text-slate-500">
          <div className="border-t border-slate-400 pt-1">Received by</div>
          <div className="border-t border-slate-400 pt-1">Approved by</div>
        </footer>
      </article>
    </div>
  );
}

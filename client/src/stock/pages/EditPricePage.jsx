import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useItemPricesStore } from '../useItemPricesStore';
import { SALEOUT_CATALOG, ALL_ITEMS } from '../catalog/saleOutCatalog';
import { NP_CATALOG, NP_ALL_ITEMS } from '../catalog/nonPerishableCatalog';
import PageHeader from '../../components/common/PageHeader';

function Tabs({ active, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
      {[
        { key: 'perishable', label: 'Perishable' },
        { key: 'nonperishable', label: 'Non-Perishable' },
      ].map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-lg px-5 py-1.5 text-sm font-medium transition-colors ${
            active === t.key
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function PriceTable({ type, catalog, allItems }) {
  const storePricesMap = useItemPricesStore((s) => s.prices);
  const fetchPrices = useItemPricesStore((s) => s.fetchPrices);
  const updatePrices = useItemPricesStore((s) => s.updatePrices);

  const [localPrices, setLocalPrices] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Load from store / catalog on mount and when store updates
  useEffect(() => { fetchPrices(type); }, [type]);
  useEffect(() => {
    setLocalPrices(
      Object.fromEntries(
        allItems.map((it) => {
          const sp = storePricesMap[`${type}:${it.name}`];
          return [it.name, sp !== undefined ? sp : it.price];
        })
      )
    );
  }, [storePricesMap, type]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updatePrices(type, localPrices);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save prices.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Prices saved successfully.
        </div>
      )}
      {error && <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-xs font-semibold uppercase text-slate-600">
              <th className="w-10 px-3 py-2 text-center border-r border-slate-200">#</th>
              <th className="px-3 py-2 text-left border-r border-slate-200">Category</th>
              <th className="px-3 py-2 text-left">Item Name</th>
              <th className="w-36 px-3 py-2 text-right">Price (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((cat) =>
              cat.items.map((item, idx) => (
                <tr key={item.name} className={`border-t border-slate-100 ${cat.colorClass}`}>
                  <td className="px-3 py-1.5 text-center text-slate-400 text-xs border-r border-slate-200">
                    {idx + 1}
                  </td>
                  {idx === 0 ? (
                    <td
                      rowSpan={cat.items.length}
                      className={`px-3 py-1.5 font-semibold text-center align-middle border-r border-slate-200 ${cat.headerClass}`}
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
                    >
                      {cat.category}
                    </td>
                  ) : null}
                  <td className="px-3 py-1.5">{item.name}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      min="0"
                      value={localPrices[item.name] ?? item.price}
                      onChange={(e) =>
                        setLocalPrices((prev) => ({ ...prev, [item.name]: e.target.value === '' ? '' : Number(e.target.value) }))
                      }
                      className="w-28 rounded border border-slate-300 px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Prices'}
        </button>
      </div>
    </div>
  );
}

export default function EditPricePage() {
  const [activeTab, setActiveTab] = useState('perishable');

  return (
    <>
      <PageHeader title="Edit Prices" subtitle="Set the prices used in Sale Out dispatch sheets." />
      <Tabs active={activeTab} onChange={setActiveTab} />
      {activeTab === 'perishable' ? (
        <PriceTable type="perishable" catalog={SALEOUT_CATALOG} allItems={ALL_ITEMS} />
      ) : (
        <PriceTable type="nonperishable" catalog={NP_CATALOG} allItems={NP_ALL_ITEMS} />
      )}
    </>
  );
}

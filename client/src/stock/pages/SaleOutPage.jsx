import { useState } from 'react';
import { SALEOUT_CATALOG, ALL_ITEMS } from '../catalog/saleOutCatalog';
import DispatchSheetForm from '../components/DispatchSheetForm';
import NonPerishablePage from './NonPerishablePage';

const today = () => new Date().toISOString().slice(0, 10);

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

export default function SaleOutPage() {
  const [activeTab, setActiveTab] = useState('perishable');
  const [saleDate, setSaleDate] = useState(today());
  const [branch, setBranch] = useState('');

  return (
    <>
      <Tabs active={activeTab} onChange={setActiveTab} />
      {activeTab === 'perishable' ? (
        <DispatchSheetForm
          catalog={SALEOUT_CATALOG}
          allItems={ALL_ITEMS}
          type="perishable"
          saleDate={saleDate}
          onSaleDateChange={setSaleDate}
          branch={branch}
          onBranchChange={setBranch}
        />
      ) : (
        <NonPerishablePage
          saleDate={saleDate}
          onSaleDateChange={setSaleDate}
          branch={branch}
          onBranchChange={setBranch}
        />
      )}
    </>
  );
}

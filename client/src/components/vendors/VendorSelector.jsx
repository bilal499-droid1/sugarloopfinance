import { Building2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';

export default function VendorSelector() {
  const vendors = useFinanceStore((s) => s.vendors);
  const selectedVendorId = useFinanceStore((s) => s.selectedVendorId);
  const setSelectedVendor = useFinanceStore((s) => s.setSelectedVendor);

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <Building2 className="h-4 w-4" />
      <select
        value={selectedVendorId}
        onChange={(e) => setSelectedVendor(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
      >
        <option value="ALL">All vendors</option>
        {vendors.map((v) => (
          <option key={v.id} value={v.id}>
            {v.code} — {v.name}
          </option>
        ))}
      </select>
    </label>
  );
}

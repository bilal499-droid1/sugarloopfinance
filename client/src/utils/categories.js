import { Car, Fuel, Wrench, Wheat, Layers } from 'lucide-react';

// Sugarloop's 5 core expense categories. `fields` are category-specific details
// kept on older bills (no longer shown in the bill panel).
export const CATEGORIES = {
  INDRIVE_LOGISTICS: {
    label: 'InDrive Logistics',
    icon: Car,
    badge: 'bg-sky-100 text-sky-700',
    hasRoute: true,
    fields: [
      { key: 'rideId', label: 'Ride ID' },
      { key: 'driverName', label: 'Driver Name' },
    ],
  },
  FUEL_TRANSIT: {
    label: 'Fuel Transit',
    icon: Fuel,
    badge: 'bg-orange-100 text-orange-700',
    hasRoute: true,
    fields: [
      { key: 'stationName', label: 'Station Name' },
      { key: 'litersPumped', label: 'Liters Pumped', type: 'number' },
      { key: 'vehicleReg', label: 'Vehicle Reg #' },
    ],
  },
  WAREHOUSE_REPAIRS: {
    label: 'Warehouse Repairs',
    icon: Wrench,
    badge: 'bg-violet-100 text-violet-700',
    fields: [
      { key: 'contractor', label: 'Contractor / Vendor' },
      { key: 'itemDescription', label: 'Item Description' },
      { key: 'laborCost', label: 'Labor Cost', type: 'number' },
    ],
  },
  RAW_PROCUREMENT: {
    label: 'Raw Procurement',
    icon: Wheat,
    badge: 'bg-lime-100 text-lime-700',
    fields: [
      { key: 'supplierName', label: 'Supplier Name' },
    ],
  },
  MISC_OPERATIONS: {
    label: 'Misc Operations',
    icon: Layers,
    badge: 'bg-slate-200 text-slate-700',
    fields: [{ key: 'customTag', label: 'Custom Tag' }],
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

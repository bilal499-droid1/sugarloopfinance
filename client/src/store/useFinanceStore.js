import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import api, { CLIENT_ID } from '../api/client';
import { connectLive } from '../api/live';
import { toDateInput } from '../utils/format';

const replaceById = (list, doc) => list.map((x) => (x.id === doc.id ? doc : x));

const FLASH_MS = 5000;
let stopLive = null;
let refreshTimer = null;

export const useFinanceStore = create((set, get) => ({
  vendors: [],
  records: [],
  items: [],
  loading: false,
  error: null,

  // Global filters
  selectedVendorId: 'ALL',
  selectedCategory: 'ALL',
  dateRange: { from: '', to: '' },
  inspectedRecordId: null,

  // Live updates: connection state, the last change made by someone else,
  // and bills to highlight briefly because they just arrived.
  live: 'off', // off | connecting | live | offline
  lastRemoteChange: null,
  flashIds: [],

  setSelectedVendor: (selectedVendorId) => set({ selectedVendorId }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setDateRange: (dateRange) => set({ dateRange }),
  openInspector: (inspectedRecordId) => set({ inspectedRecordId }),
  closeInspector: () => set({ inspectedRecordId: null }),

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [vendors, records, items] = await Promise.all([api.get('/vendors'), api.get('/records'), api.get('/items')]);
      set({ vendors: vendors.data, records: records.data, items: items.data });
    } catch {
      set({ error: 'Could not reach the API. Is the server running?' });
    } finally {
      set({ loading: false });
    }
  },

  // Quiet full refresh (no loading state) used by live updates; new bills are highlighted.
  refreshAll: async () => {
    const [vendors, records, items] = await Promise.all([api.get('/vendors'), api.get('/records'), api.get('/items')]);
    const known = new Set(get().records.map((r) => r.id));
    set({ vendors: vendors.data, records: records.data, items: items.data });
    get()._flash(records.data.filter((r) => !known.has(r.id)).map((r) => r.id));
  },

  _flash: (ids) => {
    if (!ids.length) return;
    set({ flashIds: [...get().flashIds, ...ids] });
    setTimeout(() => set({ flashIds: get().flashIds.filter((id) => !ids.includes(id)) }), FLASH_MS);
  },

  startLive: () => {
    if (stopLive) return;
    stopLive = connectLive({
      onStatus: (live) => set({ live }),
      onReconnect: () => get().refreshAll().catch(() => {}),
      onChange: (change) => {
        if (change.clientId === CLIENT_ID) return; // this tab already has its own change
        set({ lastRemoteChange: change });
        // Several changes in a row (e.g. save + payment) trigger one refresh.
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => get().refreshAll().catch(() => {}), 300);
      },
    });
  },

  stopLive: () => {
    stopLive?.();
    stopLive = null;
  },

  // Totals and stock are derived on the server, so refresh them after changes.
  refreshDerived: async () => {
    const [vendors, items] = await Promise.all([api.get('/vendors'), api.get('/items')]);
    set({ vendors: vendors.data, items: items.data });
  },

  // ---- Records ----
  _applyRecord: (record) => {
    const exists = get().records.some((r) => r.id === record.id);
    set({ records: exists ? replaceById(get().records, record) : [record, ...get().records] });
    if (!exists) get()._flash([record.id]);
    get().refreshDerived();
    return record;
  },

  // With a receipt file, the bill fields go as JSON in a `data` field of a multipart upload.
  createRecord: async (payload, file) => {
    let body = payload;
    if (file) {
      body = new FormData();
      body.append('data', JSON.stringify(payload));
      body.append('image', file);
    }
    return get()._applyRecord((await api.post('/records', body)).data);
  },
  updateRecord: async (id, changes) => get()._applyRecord((await api.patch(`/records/${id}`, changes)).data),
  attachReceipt: async (id, file) => {
    const form = new FormData();
    form.append('image', file);
    return get()._applyRecord((await api.post(`/records/${id}/image`, form)).data);
  },
  // `changes` are unsaved edits from the inspector, saved in the same request.
  setRecordStatus: async (id, status, payment, changes) =>
    get()._applyRecord((await api.post(`/records/${id}/status`, { status, payment, changes })).data),
  addPayment: async (id, payment) => get()._applyRecord((await api.post(`/records/${id}/payments`, payment)).data),
  deletePayment: async (id, paymentId) =>
    get()._applyRecord((await api.delete(`/records/${id}/payments/${paymentId}`)).data),

  deleteRecord: async (id) => {
    await api.delete(`/records/${id}`);
    set({ records: get().records.filter((r) => r.id !== id), inspectedRecordId: null });
    get().refreshDerived();
  },

  // ---- Vendors ----
  saveVendor: async (vendor) => {
    const { data } = vendor.id ? await api.patch(`/vendors/${vendor.id}`, vendor) : await api.post('/vendors', vendor);
    const exists = get().vendors.some((v) => v.id === data.id);
    set({ vendors: exists ? replaceById(get().vendors, data) : [...get().vendors, data] });
    if (vendor.id) set({ records: get().records.map((r) => (r.vendorId === data.id ? { ...r, vendorName: data.name } : r)) });
    return data;
  },

  deleteVendor: async (id) => {
    await api.delete(`/vendors/${id}`);
    set({ vendors: get().vendors.filter((v) => v.id !== id) });
  },

  // ---- Items & stock ----
  saveItem: async (item) => {
    const { data } = item.id ? await api.patch(`/items/${item.id}`, item) : await api.post('/items', item);
    const exists = get().items.some((i) => i.id === data.id);
    set({ items: exists ? replaceById(get().items, data) : [...get().items, data] });
    return data;
  },

  deleteItem: async (id) => {
    await api.delete(`/items/${id}`);
    set({ items: get().items.filter((i) => i.id !== id) });
  },

  transferStock: async (transfer) => {
    const { data } = await api.post('/stock/transfers', transfer);
    get().refreshDerived();
    return data;
  },

  adjustStock: async (adjustment) => {
    const { data } = await api.post('/stock/adjust', adjustment);
    get().refreshDerived();
    return data;
  },
}));

// Apply the global vendor / category / date filters (or explicit overrides).
export const filterRecords = (records, { vendorId = 'ALL', category = 'ALL', from = '', to = '' }) =>
  records.filter((r) => {
    const date = toDateInput(r.receiptDate);
    return (
      (vendorId === 'ALL' || r.vendorId === vendorId) &&
      (category === 'ALL' || r.category === category) &&
      (!from || date >= from) &&
      (!to || date <= to)
    );
  });

export const useVisibleRecords = (overrides = {}) =>
  useFinanceStore(
    useShallow((s) =>
      filterRecords(s.records, {
        vendorId: s.selectedVendorId,
        category: s.selectedCategory,
        ...s.dateRange,
        ...overrides,
      })
    )
  );

// The last price this vendor charged for an item before a given date (for live price checks).
export const findPreviousPrice = (records, { vendorId, itemId, beforeDate, excludeId }) => {
  let best = null;
  for (const r of records) {
    if (r.id === excludeId || r.vendorId !== vendorId || r.status === 'FLAGGED') continue;
    if (beforeDate && toDateInput(r.receiptDate) > beforeDate) continue;
    const line = r.items?.find((l) => l.itemId === itemId);
    if (line && (!best || new Date(r.receiptDate) > new Date(best.date))) best = { price: line.unitPrice, date: r.receiptDate };
  }
  return best?.price;
};

import { create } from 'zustand';
import api from '../api/client';
import { useFinanceStore } from '../store/useFinanceStore';

const replaceById = (list, doc) => list.map((x) => (x.id === doc.id ? doc : x));

// Purchase returns for the stock preview module. Kept apart from the main
// finance store so the preview can be dropped or merged without touching it.
export const useReturnsStore = create((set, get) => ({
  returns: [],
  loaded: false,

  fetchReturns: async () => {
    const { data } = await api.get('/returns');
    set({ returns: data, loaded: true });
  },

  // A return changes stock, so refresh item quantities too.
  _apply: (ret) => {
    const exists = get().returns.some((r) => r.id === ret.id);
    set({ returns: exists ? replaceById(get().returns, ret) : [ret, ...get().returns] });
    useFinanceStore.getState().refreshDerived();
    return ret;
  },

  createReturn: async (payload) => get()._apply((await api.post('/returns', payload)).data),
  updateReturn: async (id, payload) => get()._apply((await api.patch(`/returns/${id}`, payload)).data),
  deleteReturn: async (id) => {
    await api.delete(`/returns/${id}`);
    set({ returns: get().returns.filter((r) => r.id !== id) });
    useFinanceStore.getState().refreshDerived();
  },
}));

// Quantity of each item already returned against a bill, optionally ignoring one return.
export const returnedOnBill = (returns, recordId, excludeId) => {
  const totals = new Map();
  for (const r of returns) {
    if (r.recordId !== recordId || r.id === excludeId) continue;
    for (const line of r.items) totals.set(line.itemId, (totals.get(line.itemId) ?? 0) + line.quantity);
  }
  return totals;
};

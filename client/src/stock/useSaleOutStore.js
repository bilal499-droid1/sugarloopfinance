import { create } from 'zustand';
import api from '../api/client';

export const useSaleOutStore = create((set, get) => ({
  records: [],
  loading: false,
  error: null,

  fetchRecords: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/saleout', { params });
      set({ records: data });
    } catch {
      set({ error: 'Could not load Sale Out records.' });
    } finally {
      set({ loading: false });
    }
  },

  createRecord: async (payload) => {
    const { data } = await api.post('/saleout', payload);
    set({ records: [data, ...get().records] });
    return data;
  },

  updateRecord: async (id, payload) => {
    const { data } = await api.patch(`/saleout/${id}`, payload);
    set({ records: get().records.map((r) => (r.id === id ? data : r)) });
    return data;
  },

  deleteRecord: async (id) => {
    await api.delete(`/saleout/${id}`);
    set({ records: get().records.filter((r) => r.id !== id) });
  },
}));

import { create } from 'zustand';
import api from '../api/client';

const replaceById = (list, doc) => list.map((x) => (x.id === doc.id ? doc : x));

export const useSalesStore = create((set, get) => ({
  sales: [],
  customers: [],
  loading: false,
  error: null,

  fetchSales: async () => {
    set({ loading: true, error: null });
    try {
      const [sales, customers] = await Promise.all([api.get('/sales'), api.get('/customers')]);
      set({ sales: sales.data, customers: customers.data });
    } catch {
      set({ error: 'Could not load sales data.' });
    } finally {
      set({ loading: false });
    }
  },

  _applySale: (sale) => {
    const exists = get().sales.some((s) => s.id === sale.id);
    set({ sales: exists ? replaceById(get().sales, sale) : [sale, ...get().sales] });
    return sale;
  },

  createSale: async (payload) => get()._applySale((await api.post('/sales', payload)).data),
  updateSale: async (id, changes) => get()._applySale((await api.patch(`/sales/${id}`, changes)).data),
  deleteSale: async (id) => {
    await api.delete(`/sales/${id}`);
    set({ sales: get().sales.filter((s) => s.id !== id) });
  },

  saveCustomer: async (customer) => {
    const { data } = customer.id
      ? await api.patch(`/customers/${customer.id}`, customer)
      : await api.post('/customers', customer);
    const exists = get().customers.some((c) => c.id === data.id);
    set({ customers: exists ? replaceById(get().customers, data) : [...get().customers, data] });
    return data;
  },

  deleteCustomer: async (id) => {
    await api.delete(`/customers/${id}`);
    set({ customers: get().customers.filter((c) => c.id !== id) });
  },
}));

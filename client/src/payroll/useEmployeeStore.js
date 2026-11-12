import { create } from 'zustand';
import api from '../api/client';

export const useEmployeeStore = create((set, get) => ({
  employees: [],
  loading: false,
  error: null,

  fetchEmployees: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/employees');
      set({ employees: data });
    } catch {
      set({ error: 'Could not load employees.' });
    } finally {
      set({ loading: false });
    }
  },

  createEmployee: async (payload) => {
    const { data } = await api.post('/employees', payload);
    set({ employees: [...get().employees, data] });
    return data;
  },

  updateEmployee: async (id, payload) => {
    const { data } = await api.patch(`/employees/${id}`, payload);
    set({ employees: get().employees.map((e) => (e.id === id ? data : e)) });
    return data;
  },

  deleteEmployee: async (id) => {
    await api.delete(`/employees/${id}`);
    set({ employees: get().employees.filter((e) => e.id !== id) });
  },
}));

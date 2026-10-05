import { create } from 'zustand';
import api, { tokenStorage, setUnauthorizedHandler } from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  status: 'checking', // checking | signedIn | signedOut

  restore: async () => {
    if (!tokenStorage.get()) return set({ status: 'signedOut' });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, status: 'signedIn' });
    } catch {
      tokenStorage.set(null);
      set({ user: null, status: 'signedOut' });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokenStorage.set(data.token);
    set({ user: data.user, status: 'signedIn' });
  },

  logout: () => {
    tokenStorage.set(null);
    set({ user: null, status: 'signedOut' });
  },
}));

setUnauthorizedHandler(() => useAuthStore.getState().logout());

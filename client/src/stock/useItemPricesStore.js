import { create } from 'zustand';
import api from '../api/client';

// prices map: `${type}:${itemName}` -> price number
export const useItemPricesStore = create((set, get) => ({
  prices: {},
  loaded: { perishable: false, nonperishable: false },

  fetchPrices: async (type) => {
    if (get().loaded[type]) return;
    try {
      const { data } = await api.get('/item-prices', { params: { type } });
      const map = {};
      data.forEach(({ itemName, price }) => { map[`${type}:${itemName}`] = price; });
      set((s) => ({
        prices: { ...s.prices, ...map },
        loaded: { ...s.loaded, [type]: true },
      }));
    } catch {}
  },

  getPrice: (type, itemName, fallback) => {
    const val = get().prices[`${type}:${itemName}`];
    return val !== undefined ? val : fallback;
  },

  updatePrices: async (type, priceMap) => {
    const prices = Object.entries(priceMap).map(([itemName, price]) => ({ itemName, price: Number(price) }));
    const { data } = await api.put('/item-prices', { type, prices });
    const map = {};
    data.forEach(({ itemName, price }) => { map[`${type}:${itemName}`] = price; });
    set((s) => ({
      prices: { ...s.prices, ...map },
      loaded: { ...s.loaded, [type]: true },
    }));
  },
}));

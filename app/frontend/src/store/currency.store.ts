import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CurrencyCode } from '../lib/currency';

interface CurrencyStore {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: 'USD',
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'currency-storage',
    }
  )
);

import { useCurrencyStore } from '../store/currency.store';
import { formatCurrency as formatCurrencyUtil } from '../lib/currency';

export const useCurrency = () => {
  const { currency, setCurrency } = useCurrencyStore();

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, currency);
  };

  return {
    currency,
    setCurrency,
    formatCurrency,
  };
};

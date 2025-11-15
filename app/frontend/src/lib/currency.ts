/**
 * Currency utilities and formatting
 */

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

export const getCurrencySymbol = (code: CurrencyCode): string => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === code);
  return currency?.symbol || '$';
};

export const formatCurrency = (amount: number, currencyCode: CurrencyCode = 'USD'): string => {
  const symbol = getCurrencySymbol(currencyCode);

  // Format number with proper decimals
  const formattedAmount = amount.toFixed(2);

  // Add thousand separators
  const parts = formattedAmount.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${symbol}${parts.join('.')}`;
};

export const parseCurrencyInput = (input: string): number => {
  // Remove all non-numeric characters except dot and minus
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Simplified exchange rates (in real app, fetch from API)
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  THB: 35.5,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CNY: 7.24,
  AUD: 1.53,
  CAD: 1.36,
  SGD: 1.35,
  INR: 83.2,
};

export const convertCurrency = (
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number => {
  if (fromCurrency === toCurrency) return amount;

  // Convert to USD first, then to target currency
  const usdAmount = amount / EXCHANGE_RATES[fromCurrency];
  const converted = usdAmount * EXCHANGE_RATES[toCurrency];

  return Math.round(converted * 100) / 100;
};

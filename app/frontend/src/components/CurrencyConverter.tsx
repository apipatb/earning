import { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, TrendingUp, TrendingDown, ArrowRightLeft, Globe } from 'lucide-react';
import { notify } from '../store/notification.store';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Rate to USD
}

// Mock exchange rates (in production, fetch from API)
const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 149.50 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.36 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.52 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', rate: 0.88 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', rate: 7.24 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 83.12 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 4.97 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', rate: 17.08 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 18.76 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 1.34 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', rate: 7.82 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', rate: 10.87 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', rate: 10.95 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', rate: 6.88 },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', rate: 3.98 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', rate: 35.21 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', rate: 56.32 },
];

interface ConversionHistory {
  id: string;
  from: string;
  to: string;
  amount: number;
  result: number;
  rate: number;
  timestamp: string;
}

export default function CurrencyConverter() {
  const [amount, setAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('EUR');
  const [result, setResult] = useState<number>(0);
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [favorites, setFavorites] = useState<string[]>(['USD', 'EUR', 'GBP']);

  useEffect(() => {
    loadHistory();
    loadFavorites();
  }, []);

  useEffect(() => {
    convert();
  }, [amount, fromCurrency, toCurrency]);

  const loadHistory = () => {
    const stored = localStorage.getItem('currency_history');
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  };

  const loadFavorites = () => {
    const stored = localStorage.getItem('currency_favorites');
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  };

  const convert = () => {
    const fromRate = CURRENCIES.find(c => c.code === fromCurrency)?.rate || 1;
    const toRate = CURRENCIES.find(c => c.code === toCurrency)?.rate || 1;

    // Convert through USD as base
    const usdAmount = amount / fromRate;
    const converted = usdAmount * toRate;

    setResult(converted);
  };

  const saveConversion = () => {
    const fromRate = CURRENCIES.find(c => c.code === fromCurrency)?.rate || 1;
    const toRate = CURRENCIES.find(c => c.code === toCurrency)?.rate || 1;
    const rate = toRate / fromRate;

    const conversion: ConversionHistory = {
      id: `conv-${Date.now()}`,
      from: fromCurrency,
      to: toCurrency,
      amount,
      result,
      rate,
      timestamp: new Date().toISOString(),
    };

    const updated = [conversion, ...history].slice(0, 20); // Keep last 20
    localStorage.setItem('currency_history', JSON.stringify(updated));
    setHistory(updated);
    notify.success('Saved', 'Conversion saved to history');
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const toggleFavorite = (code: string) => {
    let updated: string[];
    if (favorites.includes(code)) {
      updated = favorites.filter(c => c !== code);
    } else {
      updated = [...favorites, code];
    }
    setFavorites(updated);
    localStorage.setItem('currency_favorites', JSON.stringify(updated));
  };

  const clearHistory = () => {
    if (confirm('Clear all conversion history?')) {
      localStorage.removeItem('currency_history');
      setHistory([]);
      notify.success('Cleared', 'Conversion history cleared');
    }
  };

  const getCurrency = (code: string) => CURRENCIES.find(c => c.code === code);

  const formatCurrency = (value: number, code: string) => {
    const currency = getCurrency(code);
    return `${currency?.symbol}${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const popularPairs = [
    { from: 'USD', to: 'EUR' },
    { from: 'USD', to: 'GBP' },
    { from: 'EUR', to: 'USD' },
    { from: 'GBP', to: 'USD' },
    { from: 'USD', to: 'JPY' },
    { from: 'USD', to: 'CAD' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Currency Converter</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Convert between 20+ currencies for international clients
            </p>
          </div>
        </div>
      </div>

      {/* Converter */}
      <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* From Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From
            </label>
            <div className="space-y-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold"
                placeholder="0.00"
                step="0.01"
              />
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex items-end justify-center pb-6">
            <button
              onClick={swapCurrencies}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>
          </div>

          {/* To Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To
            </label>
            <div className="space-y-2">
              <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-lg font-bold">
                {result.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Rate Info */}
        <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Exchange Rate:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              1 {fromCurrency} = {(result / amount).toFixed(4)} {toCurrency}
            </span>
          </div>
        </div>

        <button
          onClick={saveConversion}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save to History
        </button>
      </div>

      {/* Popular Pairs */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Quick Convert
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {popularPairs.map((pair, index) => {
            const fromRate = getCurrency(pair.from)?.rate || 1;
            const toRate = getCurrency(pair.to)?.rate || 1;
            const rate = toRate / fromRate;

            return (
              <button
                key={index}
                onClick={() => {
                  setFromCurrency(pair.from);
                  setToCurrency(pair.to);
                }}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {pair.from} → {pair.to}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  1 {pair.from} = {rate.toFixed(4)} {pair.to}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Currency List with Favorites */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          All Currencies
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
          {CURRENCIES.map(currency => {
            const isFavorite = favorites.includes(currency.code);
            const rateToUSD = 1 / currency.rate;

            return (
              <div
                key={currency.code}
                className={`p-3 border rounded-lg transition-colors ${
                  isFavorite
                    ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {currency.code}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {currency.symbol}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {currency.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      1 USD = {currency.rate.toFixed(4)} {currency.code}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(currency.code)}
                    className={`p-1 rounded transition-colors ${
                      isFavorite
                        ? 'text-yellow-500 hover:text-yellow-600'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversion History */}
      {history.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Recent Conversions
            </h3>
            <button
              onClick={clearHistory}
              className="text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Clear History
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((conv) => (
              <div
                key={conv.id}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(conv.amount, conv.from)} → {formatCurrency(conv.result, conv.to)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Rate: 1 {conv.from} = {conv.rate.toFixed(4)} {conv.to}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Currency Converter Tips
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Exchange rates are indicative and may vary from actual bank rates</li>
          <li>For real transactions, check with your payment provider</li>
          <li>Save frequently used currency pairs to favorites</li>
          <li>Consider currency fluctuation when pricing international projects</li>
          <li>Factor in payment processing fees for cross-border transactions</li>
        </ul>
      </div>
    </div>
  );
}

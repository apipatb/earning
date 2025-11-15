import { useState, useEffect } from 'react';
import { Calculator, TrendingDown, AlertCircle, Lightbulb, DollarSign } from 'lucide-react';
import { calculateTax, taxConfigs, getTaxSavingsRecommendations, TaxCalculationResult } from '../lib/tax';
import { earningsAPI } from '../lib/api';
import { useCurrencyStore } from '../store/currency.store';
import { notify } from '../store/notification.store';

export default function TaxCalculator() {
  const { currencySymbol } = useCurrencyStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  const [formData, setFormData] = useState({
    totalIncome: 0,
    businessExpenses: 0,
    otherDeductions: 0,
    country: 'US',
    isSelfEmployed: true,
  });

  const [autoFillPeriod, setAutoFillPeriod] = useState<'year' | 'month' | 'custom'>('year');

  useEffect(() => {
    if (autoFillPeriod !== 'custom') {
      loadEarningsData();
    }
  }, [autoFillPeriod]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      const period = autoFillPeriod === 'year' ? 'all' : 'month';
      const data = await earningsAPI.getEarnings(period);

      const totalEarnings = data.reduce((sum: number, earning: any) => sum + parseFloat(earning.amount), 0);

      setFormData({
        ...formData,
        totalIncome: autoFillPeriod === 'month' ? totalEarnings * 12 : totalEarnings,
      });

      notify.success('Income Loaded', `Loaded ${currencySymbol}${totalEarnings.toFixed(2)} from your earnings`);
    } catch (error) {
      console.error('Failed to load earnings:', error);
      notify.error('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    if (formData.totalIncome <= 0) {
      notify.warning('Invalid Input', 'Please enter a valid total income');
      return;
    }

    const calculationResult = calculateTax(formData);
    setResult(calculationResult);
    notify.success('Tax Calculated', 'Your tax estimate has been calculated');
  };

  const handleReset = () => {
    setFormData({
      totalIncome: 0,
      businessExpenses: 0,
      otherDeductions: 0,
      country: 'US',
      isSelfEmployed: true,
    });
    setResult(null);
  };

  const recommendations = result ? getTaxSavingsRecommendations(result) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tax Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Estimate your tax liability and get recommendations to minimize your tax burden
        </p>
      </div>

      {/* Quick Load */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">Quick Fill from Earnings</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Load your income directly from tracked earnings
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setAutoFillPeriod('year')}
                className={`px-3 py-1 text-xs rounded ${
                  autoFillPeriod === 'year'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-blue-200 dark:border-blue-800'
                }`}
              >
                This Year
              </button>
              <button
                onClick={() => setAutoFillPeriod('month')}
                className={`px-3 py-1 text-xs rounded ${
                  autoFillPeriod === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-blue-200 dark:border-blue-800'
                }`}
              >
                This Month (×12)
              </button>
              <button
                onClick={() => setAutoFillPeriod('custom')}
                className={`px-3 py-1 text-xs rounded ${
                  autoFillPeriod === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-blue-200 dark:border-blue-800'
                }`}
              >
                Manual Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tax Calculation</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Income Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country / Region
              </label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(taxConfigs).map(([code, config]) => (
                  <option key={code} value={code}>
                    {config.country} ({config.year})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Annual Income *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">{currencySymbol}</span>
                <input
                  type="number"
                  value={formData.totalIncome || ''}
                  onChange={(e) => setFormData({ ...formData, totalIncome: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your total income before any deductions
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="selfEmployed"
                checked={formData.isSelfEmployed}
                onChange={(e) => setFormData({ ...formData, isSelfEmployed: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="selfEmployed" className="text-sm text-gray-700 dark:text-gray-300">
                I am self-employed / freelancer
              </label>
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Deductions</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Expenses
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">{currencySymbol}</span>
                <input
                  type="number"
                  value={formData.businessExpenses || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, businessExpenses: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Equipment, software, home office, etc.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Other Deductions
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">{currencySymbol}</span>
                <input
                  type="number"
                  value={formData.otherDeductions || ''}
                  onChange={(e) => setFormData({ ...formData, otherDeductions: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Retirement, health insurance, etc.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Standard deduction for {taxConfigs[formData.country].country}:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {currencySymbol}
                  {taxConfigs[formData.country].standardDeduction.toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Reset
          </button>
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Tax
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <DollarSign className="h-4 w-4" />
                <span>Total Tax</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currencySymbol}
                {result.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <TrendingDown className="h-4 w-4" />
                <span>Effective Rate</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.effectiveTaxRate.toFixed(2)}%
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <DollarSign className="h-4 w-4" />
                <span>Take Home</span>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {currencySymbol}
                {result.takeHomePay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <Calculator className="h-4 w-4" />
                <span>Quarterly Est.</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currencySymbol}
                {(result.totalTax / 4).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tax Breakdown</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Income</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {currencySymbol}{result.totalIncome.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Business Expenses</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  -{currencySymbol}{result.businessExpenses.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Standard Deduction</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  -{currencySymbol}{result.standardDeduction.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Other Deductions</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  -{currencySymbol}{result.otherDeductions.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm font-semibold">
                <span className="text-gray-900 dark:text-white">Taxable Income</span>
                <span className="text-gray-900 dark:text-white">
                  {currencySymbol}{result.taxableIncome.toLocaleString()}
                </span>
              </div>

              {result.breakdown.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Tax Bracket:</p>
                  <div className="space-y-2">
                    {result.breakdown.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded"
                      >
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.bracket} @ {item.rate}%
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {currencySymbol}{item.tax.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Income Tax</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {currencySymbol}{result.incomeTax.toLocaleString()}
                  </span>
                </div>
                {result.selfEmploymentTax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Self-Employment Tax</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currencySymbol}{result.selfEmploymentTax.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold">
                  <span className="text-gray-900 dark:text-white">Total Tax</span>
                  <span className="text-gray-900 dark:text-white">
                    {currencySymbol}{result.totalTax.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                    Tax Savings Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-amber-700 dark:text-amber-300">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

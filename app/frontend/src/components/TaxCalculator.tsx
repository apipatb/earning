import { useState, useEffect, ChangeEvent } from 'react';
import { Calculator, DollarSign, FileText, TrendingDown, AlertCircle, Download, Save } from 'lucide-react';

// Type definitions
type Period = 'month' | 'quarter' | 'year';
type FilingStatus = 'single' | 'married' | 'head';
type StateCode = 'CA' | 'NY' | 'TX' | 'FL' | 'Other';

// Tax-related interfaces
interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

interface TaxDeductions {
  standard: boolean;
  business: number;
  home_office: number;
  health_insurance: number;
  retirement: number;
  other: number;
}

interface TaxEstimate {
  grossIncome: number;
  deductions: number;
  taxableIncome: number;
  federalTax: number;
  stateTax: number;
  selfEmploymentTax: number;
  totalTax: number;
  effectiveRate: number;
  netIncome: number;
  quarterlyPayment: number;
}

interface SavedTaxEstimate extends TaxEstimate {
  id: string;
  date: string;
  period: Period;
  filingStatus: FilingStatus;
  state: StateCode;
}

interface Earning {
  date: string;
  amount: number;
  description?: string;
  category?: string;
}

// Standard deduction mapping
type StandardDeductionMap = Record<FilingStatus, number>;

// Tax bracket mapping
type TaxBracketMap = Record<FilingStatus, TaxBracket[]>;

export default function TaxCalculator() {
  const [period, setPeriod] = useState<Period>('year');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [state, setState] = useState<StateCode>('CA');
  const [customIncome, setCustomIncome] = useState<number | null>(null);
  const [deductions, setDeductions] = useState<TaxDeductions>({
    standard: true,
    business: 0,
    home_office: 0,
    health_insurance: 0,
    retirement: 0,
    other: 0,
  });
  const [estimate, setEstimate] = useState<TaxEstimate | null>(null);
  const [savedEstimates, setSavedEstimates] = useState<SavedTaxEstimate[]>([]);

  useEffect(() => {
    calculateTax();
    loadSavedEstimates();
  }, [period, filingStatus, state, deductions, customIncome]);

  const loadSavedEstimates = (): void => {
    const saved = localStorage.getItem('tax_estimates');
    if (saved) {
      const parsedEstimates: SavedTaxEstimate[] = JSON.parse(saved) as SavedTaxEstimate[];
      setSavedEstimates(parsedEstimates);
    }
  };

  const calculateTax = (): void => {
    const earningsData = localStorage.getItem('earnings') || '[]';
    const earnings: Earning[] = JSON.parse(earningsData) as Earning[];

    // Calculate gross income based on period
    let grossIncome = customIncome !== null ? customIncome : 0;

    if (customIncome === null) {
      const now = new Date();
      let startDate: Date;

      if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        grossIncome = earnings
          .filter((e: Earning) => new Date(e.date) >= startDate)
          .reduce((sum: number, e: Earning) => sum + e.amount, 0);
      } else if (period === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        grossIncome = earnings
          .filter((e: Earning) => new Date(e.date) >= startDate)
          .reduce((sum: number, e: Earning) => sum + e.amount, 0);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
        grossIncome = earnings
          .filter((e: Earning) => new Date(e.date) >= startDate)
          .reduce((sum: number, e: Earning) => sum + e.amount, 0);
      }
    }

    // Calculate deductions
    let totalDeductions = 0;
    if (deductions.standard) {
      totalDeductions = getStandardDeduction(filingStatus);
    }
    totalDeductions += deductions.business + deductions.home_office +
                      deductions.health_insurance + deductions.retirement + deductions.other;

    const taxableIncome = Math.max(0, grossIncome - totalDeductions);

    // Calculate federal tax using 2024 brackets
    const federalTax = calculateFederalTax(taxableIncome, filingStatus);

    // Calculate state tax (simplified - CA example)
    const stateTax = calculateStateTax(taxableIncome, state);

    // Calculate self-employment tax (15.3% on 92.35% of net earnings)
    const selfEmploymentTax = grossIncome * 0.9235 * 0.153;

    const totalTax = federalTax + stateTax + selfEmploymentTax;
    const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;
    const netIncome = grossIncome - totalTax;
    const quarterlyPayment = totalTax / 4;

    setEstimate({
      grossIncome,
      deductions: totalDeductions,
      taxableIncome,
      federalTax,
      stateTax,
      selfEmploymentTax,
      totalTax,
      effectiveRate,
      netIncome,
      quarterlyPayment,
    });
  };

  const getStandardDeduction = (status: FilingStatus): number => {
    const deductions: StandardDeductionMap = {
      single: 14600,
      married: 29200,
      head: 21900,
    };
    return deductions[status];
  };

  const calculateFederalTax = (income: number, status: FilingStatus): number => {
    const brackets2024: TaxBracketMap = {
      single: [
        { min: 0, max: 11600, rate: 0.10 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 100525, rate: 0.22 },
        { min: 100525, max: 191950, rate: 0.24 },
        { min: 191950, max: 243725, rate: 0.32 },
        { min: 243725, max: 609350, rate: 0.35 },
        { min: 609350, max: Infinity, rate: 0.37 },
      ],
      married: [
        { min: 0, max: 23200, rate: 0.10 },
        { min: 23200, max: 94300, rate: 0.12 },
        { min: 94300, max: 201050, rate: 0.22 },
        { min: 201050, max: 383900, rate: 0.24 },
        { min: 383900, max: 487450, rate: 0.32 },
        { min: 487450, max: 731200, rate: 0.35 },
        { min: 731200, max: Infinity, rate: 0.37 },
      ],
      head: [
        { min: 0, max: 16550, rate: 0.10 },
        { min: 16550, max: 63100, rate: 0.12 },
        { min: 63100, max: 100500, rate: 0.22 },
        { min: 100500, max: 191950, rate: 0.24 },
        { min: 191950, max: 243700, rate: 0.32 },
        { min: 243700, max: 609350, rate: 0.35 },
        { min: 609350, max: Infinity, rate: 0.37 },
      ],
    };

    const brackets = brackets2024[status];
    let tax = 0;
    let previousMax = 0;

    for (const bracket of brackets) {
      if (income > bracket.min) {
        const taxableInBracket = Math.min(income, bracket.max) - bracket.min;
        tax += taxableInBracket * bracket.rate;
      }
    }

    return tax;
  };

  const calculateStateTax = (income: number, state: StateCode): number => {
    // Simplified CA tax rates
    if (state === 'CA') {
      if (income <= 10412) return income * 0.01;
      if (income <= 24684) return 104.12 + (income - 10412) * 0.02;
      if (income <= 38959) return 389.56 + (income - 24684) * 0.04;
      if (income <= 54081) return 960.56 + (income - 38959) * 0.06;
      if (income <= 68350) return 1867.88 + (income - 54081) * 0.08;
      if (income <= 349137) return 3009.40 + (income - 68350) * 0.093;
      if (income <= 418961) return 29122.54 + (income - 349137) * 0.103;
      if (income <= 698271) return 36313.61 + (income - 418961) * 0.113;
      return 67872.61 + (income - 698271) * 0.123;
    }
    // Other states would go here
    return income * 0.05; // Default 5% for other states
  };

  const saveEstimate = (): void => {
    if (!estimate) return;

    const newEstimate: SavedTaxEstimate = {
      id: `estimate-${Date.now()}`,
      date: new Date().toISOString(),
      period,
      filingStatus,
      state,
      ...estimate,
    };

    const updated: SavedTaxEstimate[] = [newEstimate, ...savedEstimates];
    localStorage.setItem('tax_estimates', JSON.stringify(updated));
    setSavedEstimates(updated);
    notify.success('Saved', 'Tax estimate saved successfully');
  };

  const exportToPDF = (): void => {
    // This would integrate with a PDF library
    notify.info('Export', 'PDF export feature coming soon');
  };

  const notify = {
    success: (title: string, message: string): void => {
      // Use existing notification system
      console.log(title, message);
    },
    info: (title: string, message: string): void => {
      console.log(title, message);
    },
  };

  if (!estimate) return null;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tax Calculator</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Estimate your tax liability
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveEstimate}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={exportToPDF}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Period
          </label>
          <select
            value={period}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setPeriod(e.target.value as Period)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filing Status
          </label>
          <select
            value={filingStatus}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilingStatus(e.target.value as FilingStatus)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="single">Single</option>
            <option value="married">Married Filing Jointly</option>
            <option value="head">Head of Household</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            State
          </label>
          <select
            value={state}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setState(e.target.value as StateCode)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="CA">California</option>
            <option value="NY">New York</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Custom Income
          </label>
          <input
            type="number"
            step="0.01"
            value={customIncome || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomIncome(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Auto-calculated"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Main Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Gross Income</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            ${estimate.grossIncome.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">Total Tax</span>
          </div>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
            ${estimate.totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Net Income</span>
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            ${estimate.netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Effective Rate</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {estimate.effectiveRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Tax Breakdown</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Federal Tax</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${estimate.federalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">State Tax ({state})</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${estimate.stateTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Self-Employment Tax</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${estimate.selfEmploymentTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm font-semibold">
            <span className="text-gray-900 dark:text-white">Total Tax</span>
            <span className="text-gray-900 dark:text-white">
              ${estimate.totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Quarterly Payment */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              Estimated Quarterly Payment
            </h4>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">
              ${estimate.quarterlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              This is your estimated quarterly tax payment for self-employment.
              Deadlines: April 15, June 15, September 15, January 15.
            </p>
          </div>
        </div>
      </div>

      {/* Deductions */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Deductions</h3>

        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={deductions.standard}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDeductions({ ...deductions, standard: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Use Standard Deduction (${getStandardDeduction(filingStatus).toLocaleString()})
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Expenses
            </label>
            <input
              type="number"
              step="0.01"
              value={deductions.business}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDeductions({ ...deductions, business: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Home Office
            </label>
            <input
              type="number"
              step="0.01"
              value={deductions.home_office}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDeductions({ ...deductions, home_office: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Health Insurance
            </label>
            <input
              type="number"
              step="0.01"
              value={deductions.health_insurance}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDeductions({ ...deductions, health_insurance: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Retirement Contributions
            </label>
            <input
              type="number"
              step="0.01"
              value={deductions.retirement}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDeductions({ ...deductions, retirement: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Total Deductions</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${estimate.deductions.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
          Disclaimer
        </h4>
        <p className="text-xs text-blue-800 dark:text-blue-300">
          This is an estimate only. Actual tax liability may vary. Consult with a tax professional
          for accurate calculations and personalized advice. Tax laws and rates change regularly.
        </p>
      </div>
    </div>
  );
}

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface TaxConfig {
  country: string;
  year: number;
  brackets: TaxBracket[];
  standardDeduction: number;
  selfEmploymentTaxRate: number;
}

// Tax configurations for different countries
export const taxConfigs: Record<string, TaxConfig> = {
  US: {
    country: 'United States',
    year: 2024,
    brackets: [
      { min: 0, max: 11600, rate: 10 },
      { min: 11600, max: 47150, rate: 12 },
      { min: 47150, max: 100525, rate: 22 },
      { min: 100525, max: 191950, rate: 24 },
      { min: 191950, max: 243725, rate: 32 },
      { min: 243725, max: 609350, rate: 35 },
      { min: 609350, max: null, rate: 37 },
    ],
    standardDeduction: 14600,
    selfEmploymentTaxRate: 15.3,
  },
  UK: {
    country: 'United Kingdom',
    year: 2024,
    brackets: [
      { min: 0, max: 12570, rate: 0 },
      { min: 12570, max: 50270, rate: 20 },
      { min: 50270, max: 125140, rate: 40 },
      { min: 125140, max: null, rate: 45 },
    ],
    standardDeduction: 0,
    selfEmploymentTaxRate: 9,
  },
  CA: {
    country: 'Canada',
    year: 2024,
    brackets: [
      { min: 0, max: 55867, rate: 15 },
      { min: 55867, max: 111733, rate: 20.5 },
      { min: 111733, max: 173205, rate: 26 },
      { min: 173205, max: 246752, rate: 29 },
      { min: 246752, max: null, rate: 33 },
    ],
    standardDeduction: 15705,
    selfEmploymentTaxRate: 5.95,
  },
  AU: {
    country: 'Australia',
    year: 2024,
    brackets: [
      { min: 0, max: 18200, rate: 0 },
      { min: 18200, max: 45000, rate: 19 },
      { min: 45000, max: 120000, rate: 32.5 },
      { min: 120000, max: 180000, rate: 37 },
      { min: 180000, max: null, rate: 45 },
    ],
    standardDeduction: 0,
    selfEmploymentTaxRate: 0,
  },
};

export interface TaxCalculationInput {
  totalIncome: number;
  businessExpenses: number;
  otherDeductions: number;
  country: string;
  isSelfEmployed: boolean;
}

export interface TaxCalculationResult {
  totalIncome: number;
  businessExpenses: number;
  otherDeductions: number;
  standardDeduction: number;
  taxableIncome: number;
  incomeTax: number;
  selfEmploymentTax: number;
  totalTax: number;
  effectiveTaxRate: number;
  takeHomePay: number;
  breakdown: {
    bracket: string;
    income: number;
    rate: number;
    tax: number;
  }[];
}

export const calculateTax = (input: TaxCalculationInput): TaxCalculationResult => {
  const config = taxConfigs[input.country] || taxConfigs.US;

  // Calculate adjusted gross income
  const adjustedGrossIncome = input.totalIncome - input.businessExpenses;

  // Calculate taxable income
  const totalDeductions = input.otherDeductions + config.standardDeduction;
  const taxableIncome = Math.max(0, adjustedGrossIncome - totalDeductions);

  // Calculate income tax using brackets
  let incomeTax = 0;
  const breakdown: { bracket: string; income: number; rate: number; tax: number }[] = [];

  for (let i = 0; i < config.brackets.length; i++) {
    const bracket = config.brackets[i];
    const bracketMax = bracket.max || Infinity;

    if (taxableIncome > bracket.min) {
      const incomeInBracket = Math.min(taxableIncome, bracketMax) - bracket.min;
      const taxInBracket = incomeInBracket * (bracket.rate / 100);

      incomeTax += taxInBracket;

      if (incomeInBracket > 0) {
        breakdown.push({
          bracket: bracket.max
            ? `${formatCurrency(bracket.min)} - ${formatCurrency(bracket.max)}`
            : `${formatCurrency(bracket.min)}+`,
          income: incomeInBracket,
          rate: bracket.rate,
          tax: taxInBracket,
        });
      }

      if (taxableIncome <= bracketMax) break;
    }
  }

  // Calculate self-employment tax
  const selfEmploymentTax = input.isSelfEmployed
    ? adjustedGrossIncome * (config.selfEmploymentTaxRate / 100)
    : 0;

  const totalTax = incomeTax + selfEmploymentTax;
  const effectiveTaxRate = input.totalIncome > 0 ? (totalTax / input.totalIncome) * 100 : 0;
  const takeHomePay = input.totalIncome - totalTax;

  return {
    totalIncome: input.totalIncome,
    businessExpenses: input.businessExpenses,
    otherDeductions: input.otherDeductions,
    standardDeduction: config.standardDeduction,
    taxableIncome,
    incomeTax,
    selfEmploymentTax,
    totalTax,
    effectiveTaxRate,
    takeHomePay,
    breakdown,
  };
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getQuarterlyTaxEstimate = (annualIncome: number, country: string): number => {
  const estimate = calculateTax({
    totalIncome: annualIncome,
    businessExpenses: 0,
    otherDeductions: 0,
    country,
    isSelfEmployed: true,
  });

  return estimate.totalTax / 4;
};

export const getTaxSavingsRecommendations = (result: TaxCalculationResult): string[] => {
  const recommendations: string[] = [];

  if (result.businessExpenses < result.totalIncome * 0.1) {
    recommendations.push(
      'Consider tracking more business expenses - many freelancers miss deductible expenses like home office, equipment, and software.'
    );
  }

  if (result.otherDeductions === 0) {
    recommendations.push(
      'Look into additional deductions like retirement contributions (IRA/401k), health insurance premiums, and charitable donations.'
    );
  }

  if (result.totalIncome > 50000 && result.businessExpenses < 5000) {
    recommendations.push(
      'At your income level, consider investing in tax-deductible business assets or retirement accounts to reduce your tax burden.'
    );
  }

  if (result.selfEmploymentTax > 0) {
    recommendations.push(
      'Self-employment tax is calculated on your net income. Maximizing business expenses can reduce both income tax and self-employment tax.'
    );
  }

  return recommendations;
};

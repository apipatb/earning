import { create } from 'zustand';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface IncomeStatement {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  taxLiability: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenueBreakdown: {
    earnings: number;
    sales: number;
    invoices: number;
  };
  expenseBreakdown: {
    byCategory: Record<string, number>;
    total: number;
  };
}

interface CashFlowAnalysis {
  period: {
    startDate: Date;
    endDate: Date;
  };
  operatingCashFlow: number;
  cashInflows: {
    earnings: number;
    sales: number;
    invoices: number;
    total: number;
  };
  cashOutflows: {
    expenses: number;
    taxPayments: number;
    total: number;
  };
  netCashFlow: number;
  cashFlowTrend: Array<{
    date: string;
    amount: number;
  }>;
}

interface TaxReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalTaxLiability: number;
  taxByCategory: Array<{
    categoryName: string;
    percentage: number;
    baseAmount: number;
    taxAmount: number;
  }>;
  deductibleExpenses: number;
  taxableIncome: number;
  quarterlyBreakdown?: Array<{
    quarter: string;
    taxLiability: number;
  }>;
}

interface FinancialMetrics {
  profitMargin: number;
  roi: number;
  cashFlow: number;
  debtRatio: number;
  assetTurnover: number;
}

interface ProfitAndLoss {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    earnings: number;
    sales: number;
    invoices: number;
    total: number;
  };
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: {
    byCategory: Record<string, number>;
    total: number;
  };
  operatingIncome: number;
  taxes: number;
  netIncome: number;
  profitMargin: number;
}

interface TaxCategory {
  id: string;
  userId: string;
  name: string;
  percentage: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface FinancialStore {
  // State
  incomeStatement: IncomeStatement | null;
  cashFlow: CashFlowAnalysis | null;
  taxReport: TaxReport | null;
  metrics: FinancialMetrics | null;
  profitAndLoss: ProfitAndLoss | null;
  taxCategories: TaxCategory[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchIncomeStatement: (periodType: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchCashFlow: (periodType: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchTaxReport: (periodType: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchMetrics: (periodType: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchProfitAndLoss: (periodType: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchTaxCategories: () => Promise<void>;
  createTaxCategory: (name: string, percentage: number, description?: string) => Promise<void>;
  clearError: () => void;
}

export const useFinancialStore = create<FinancialStore>((set, get) => ({
  // Initial State
  incomeStatement: null,
  cashFlow: null,
  taxReport: null,
  metrics: null,
  profitAndLoss: null,
  taxCategories: [],
  loading: false,
  error: null,

  // Fetch Income Statement
  fetchIncomeStatement: async (periodType, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('periodType', periodType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/financial/statement?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      set({
        incomeStatement: response.data.data,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch income statement',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch Cash Flow Analysis
  fetchCashFlow: async (periodType, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('periodType', periodType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/financial/cash-flow?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      set({
        cashFlow: response.data.data,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch cash flow',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch Tax Report
  fetchTaxReport: async (periodType, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('periodType', periodType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/financial/tax-report?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      set({
        taxReport: response.data.data,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tax report',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch Financial Metrics
  fetchMetrics: async (periodType, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('periodType', periodType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/financial/metrics?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      set({
        metrics: response.data.data,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch Profit & Loss Statement
  fetchProfitAndLoss: async (periodType, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('periodType', periodType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/financial/p-and-l?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      set({
        profitAndLoss: response.data.data,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch P&L statement',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch Tax Categories
  fetchTaxCategories: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/financial/tax-categories`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      set({
        taxCategories: response.data.data,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tax categories',
        loading: false,
      });
      throw error;
    }
  },

  // Create Tax Category
  createTaxCategory: async (name, percentage, description) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/financial/tax-categories`,
        {
          name,
          percentage,
          description,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Refresh tax categories list
      await get().fetchTaxCategories();

      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create tax category',
        loading: false,
      });
      throw error;
    }
  },

  // Clear Error
  clearError: () => {
    set({ error: null });
  },
}));

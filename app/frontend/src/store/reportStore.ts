import { create } from 'zustand';

export type ReportType = 'EARNINGS' | 'SALES' | 'EXPENSES' | 'FINANCIAL';
export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gte' | 'lte' | 'between';
  value: any;
}

export interface ReportSorting {
  field: string;
  order: 'asc' | 'desc';
}

export interface ReportConfig {
  name: string;
  description?: string;
  reportType: ReportType;
  columns: string[];
  filters: Record<string, any>;
  sorting: ReportSorting;
  isPublic: boolean;
}

export interface Report extends ReportConfig {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  schedules?: ReportSchedule[];
  data?: ReportData;
}

export interface ReportSchedule {
  id: string;
  reportId: string;
  frequency: ReportFrequency;
  nextRunAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportData {
  headers: string[];
  rows: any[];
  metadata: {
    totalRows: number;
    generatedAt: string;
    reportType: string;
  };
}

interface ReportStore {
  // State
  currentReport: Report | null;
  reportConfig: Partial<ReportConfig>;
  previewData: ReportData | null;
  isLoading: boolean;
  error: string | null;

  // Available columns for each report type
  availableColumns: {
    EARNINGS: string[];
    SALES: string[];
    EXPENSES: string[];
    FINANCIAL: string[];
  };

  // Actions
  setCurrentReport: (report: Report | null) => void;
  updateReportConfig: (config: Partial<ReportConfig>) => void;
  setReportType: (type: ReportType) => void;
  addColumn: (column: string) => void;
  removeColumn: (column: string) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  addFilter: (field: string, value: any) => void;
  removeFilter: (field: string) => void;
  updateFilter: (field: string, value: any) => void;
  setSorting: (sorting: ReportSorting) => void;
  setPreviewData: (data: ReportData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetConfig: () => void;
}

const defaultColumns = {
  EARNINGS: ['date', 'platform', 'platformCategory', 'hours', 'amount', 'notes'],
  SALES: ['saleDate', 'product', 'productCategory', 'quantity', 'unitPrice', 'totalAmount', 'customer', 'status'],
  EXPENSES: ['expenseDate', 'category', 'description', 'amount', 'vendor', 'isTaxDeductible'],
  FINANCIAL: ['metric', 'value', 'period'],
};

const initialConfig: Partial<ReportConfig> = {
  name: '',
  description: '',
  reportType: 'EARNINGS',
  columns: [],
  filters: {},
  sorting: {
    field: 'date',
    order: 'desc',
  },
  isPublic: false,
};

export const useReportStore = create<ReportStore>((set, get) => ({
  // Initial state
  currentReport: null,
  reportConfig: initialConfig,
  previewData: null,
  isLoading: false,
  error: null,

  availableColumns: defaultColumns,

  // Actions
  setCurrentReport: (report) => set({ currentReport: report }),

  updateReportConfig: (config) =>
    set((state) => ({
      reportConfig: { ...state.reportConfig, ...config },
    })),

  setReportType: (type) =>
    set((state) => ({
      reportConfig: {
        ...state.reportConfig,
        reportType: type,
        columns: [], // Reset columns when changing type
        filters: {}, // Reset filters when changing type
        sorting: {
          field: type === 'EARNINGS' ? 'date' : type === 'SALES' ? 'saleDate' : type === 'EXPENSES' ? 'expenseDate' : 'metric',
          order: 'desc',
        },
      },
    })),

  addColumn: (column) =>
    set((state) => {
      const columns = state.reportConfig.columns || [];
      if (!columns.includes(column)) {
        return {
          reportConfig: {
            ...state.reportConfig,
            columns: [...columns, column],
          },
        };
      }
      return state;
    }),

  removeColumn: (column) =>
    set((state) => ({
      reportConfig: {
        ...state.reportConfig,
        columns: (state.reportConfig.columns || []).filter((c) => c !== column),
      },
    })),

  reorderColumns: (fromIndex, toIndex) =>
    set((state) => {
      const columns = [...(state.reportConfig.columns || [])];
      const [removed] = columns.splice(fromIndex, 1);
      columns.splice(toIndex, 0, removed);
      return {
        reportConfig: {
          ...state.reportConfig,
          columns,
        },
      };
    }),

  addFilter: (field, value) =>
    set((state) => ({
      reportConfig: {
        ...state.reportConfig,
        filters: {
          ...(state.reportConfig.filters || {}),
          [field]: value,
        },
      },
    })),

  removeFilter: (field) =>
    set((state) => {
      const filters = { ...(state.reportConfig.filters || {}) };
      delete filters[field];
      return {
        reportConfig: {
          ...state.reportConfig,
          filters,
        },
      };
    }),

  updateFilter: (field, value) =>
    set((state) => ({
      reportConfig: {
        ...state.reportConfig,
        filters: {
          ...(state.reportConfig.filters || {}),
          [field]: value,
        },
      },
    })),

  setSorting: (sorting) =>
    set((state) => ({
      reportConfig: {
        ...state.reportConfig,
        sorting,
      },
    })),

  setPreviewData: (data) => set({ previewData: data }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  resetConfig: () =>
    set({
      reportConfig: initialConfig,
      previewData: null,
      error: null,
    }),
}));

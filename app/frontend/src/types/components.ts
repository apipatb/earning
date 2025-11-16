/**
 * Common component prop types
 * Replaces 'any' types across components
 */

import { ReactNode, CSSProperties } from 'react';

/**
 * Chart data types
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface LineChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }>;
}

export interface BarChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
  }>;
}

export interface PieChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }>;
}

/**
 * Widget and layout types
 */
export interface Widget {
  id: string;
  title: string;
  enabled: boolean;
}

export interface DashboardStats {
  total_earnings: number;
  total_hours: number;
  avg_hourly_rate: number;
  by_platform?: Array<{
    platform: {
      id: string;
      name: string;
      color?: string;
    };
    earnings: number;
    percentage: number;
  }>;
}

/**
 * Time tracking types
 */
export interface TimerTask {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  isRunning: boolean;
}

export interface TimeEntry {
  date: string;
  taskName: string;
  duration: number; // in hours
  hourlyRate: number;
  totalEarnings: number;
}

/**
 * Report and analytics types
 */
export interface ReportConfig {
  type: 'sales' | 'revenue' | 'expenses' | 'earnings' | 'custom';
  period: 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
  filters?: Record<string, any>;
}

export interface ReportData {
  title: string;
  generatedAt: Date;
  period: string;
  chartData: ChartDataPoint[];
  summary: {
    total: number;
    average: number;
    max: number;
    min: number;
  };
}

/**
 * Budget and financial types
 */
export interface BudgetItem {
  id: string;
  category: string;
  plannedAmount: number;
  spentAmount: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: 'active' | 'completed' | 'cancelled';
  progressPercentage: number;
}

/**
 * Notification types
 */
export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

/**
 * Filter and search types
 */
export interface FilterOption {
  label: string;
  value: string | number | boolean;
  selected?: boolean;
}

export interface SearchResult {
  id: string;
  type: 'earning' | 'expense' | 'invoice' | 'product' | 'customer';
  title: string;
  description?: string;
  amount?: number;
  date?: string;
}

/**
 * Icon and menu types
 */
export interface MenuItemConfig {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  separator?: boolean;
}

/**
 * Form types
 */
export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormState<T> {
  values: T;
  errors: FormFieldError[];
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Table/list types
 */
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  renderCell?: (value: T[keyof T], row: T) => ReactNode;
}

export interface PaginationState {
  total: number;
  limit: number;
  offset: number;
  currentPage: number;
  totalPages: number;
}

/**
 * API response wrapper for components
 */
export interface ApiDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Common component props
 */
export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  id?: string;
  ariaLabel?: string;
  testId?: string;
}

export interface ButtonProps extends BaseComponentProps {
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel';
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

export interface SelectProps extends BaseComponentProps {
  options: Array<{ label: string; value: string | number }>;
  value?: string | number;
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  error?: string;
  multiple?: boolean;
  clearable?: boolean;
}

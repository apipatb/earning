/**
 * API Response types for consistent response structure
 */

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  timestamp: Date;
  success: boolean;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  success: false;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  timestamp: Date;
  success: boolean;
}

export interface ApiError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Filter types for common query parameters
 */
export interface BaseFilter {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateFilter extends BaseFilter {
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface SearchFilter extends DateFilter {
  search?: string;
  status?: string;
}

/**
 * Pagination types
 */
export interface Pagination<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryOptions {
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Request handler return types
 */
export type RequestHandler<T = unknown> = (req: any, res: any) => Promise<void> | void;

/**
 * Database result types
 */
export interface DatabaseResult<T> {
  data: T | null;
  error: string | null;
}

export interface DatabaseListResult<T> {
  data: T[];
  total: number;
  error: string | null;
}

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Common utility types
 */
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;
export type AsyncResult<T> = Promise<[Error, null] | [null, T]>;

/**
 * Transform types for response formatting
 */
export type Transformer<T, U> = (input: T) => U;
export type AsyncTransformer<T, U> = (input: T) => Promise<U>;

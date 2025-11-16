/**
 * Custom React hooks for common patterns
 * Centralizes reusable logic to reduce code duplication
 */

// Core data hooks
export { useAsync } from './useAsync';
export { useFetch } from './useFetch';
export { useForm } from './useForm';

// Pagination and sorting
export { usePagination } from './usePagination';
export { useSort, useMultiSort } from './useSort';
export { useFilter } from './useFilter';

// Search and infinite scroll
export { useSearch } from './useSearch';
export { useInfiniteScroll, useInfiniteScrollPagination } from './useInfiniteScroll';

// Storage and utilities
export { useLocalStorage } from './useLocalStorage';
export { useDebounce } from './useDebounce';
export { useCurrency } from './useCurrency';

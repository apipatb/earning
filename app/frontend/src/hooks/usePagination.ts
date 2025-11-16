import { useState, useCallback } from 'react';

interface PaginationState {
  limit: number;
  offset: number;
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Hook for managing pagination state
 * Handles limit, offset, and page calculations
 */
export function usePagination(initialLimit = 50) {
  const [pagination, setPagination] = useState<PaginationState>({
    limit: initialLimit,
    offset: 0,
    total: 0,
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const updateTotal = useCallback((total: number) => {
    const totalPages = Math.ceil(total / pagination.limit);
    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

    setPagination((prev) => ({
      ...prev,
      total,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    }));
  }, [pagination.limit, pagination.offset]);

  const goToPage = useCallback((page: number) => {
    const newOffset = (page - 1) * pagination.limit;
    setPagination((prev) => ({
      ...prev,
      offset: newOffset,
      currentPage: page,
    }));
  }, [pagination.limit]);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      goToPage(pagination.currentPage + 1);
    }
  }, [pagination.hasNextPage, pagination.currentPage, goToPage]);

  const previousPage = useCallback(() => {
    if (pagination.hasPreviousPage) {
      goToPage(pagination.currentPage - 1);
    }
  }, [pagination.hasPreviousPage, pagination.currentPage, goToPage]);

  const setLimit = useCallback((limit: number) => {
    setPagination((prev) => ({
      ...prev,
      limit,
      offset: 0,
      currentPage: 1,
    }));
  }, []);

  const reset = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      offset: 0,
      currentPage: 1,
    }));
  }, []);

  return {
    ...pagination,
    updateTotal,
    goToPage,
    nextPage,
    previousPage,
    setLimit,
    reset,
  };
}

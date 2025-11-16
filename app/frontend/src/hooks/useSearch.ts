/**
 * Hook for searching data with API integration
 * Handles debouncing, loading states, and error handling
 */

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { useAsync } from './useAsync';

export interface SearchOptions {
  debounceDelay?: number;
  minChars?: number;
  skip?: boolean;
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
 * Hook for searching items with debouncing and API integration
 * @param searchFn - Function that performs the actual search
 * @param options - Configuration options
 * @returns Search state and functions
 */
export function useSearch<T = SearchResult>(
  searchFn: (query: string) => Promise<T[]>,
  options: SearchOptions = {}
) {
  const { debounceDelay = 300, minChars = 2, skip = false } = options;

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceDelay);

  const {
    data: results = [],
    loading,
    error,
    execute,
  } = useAsync<T[]>(
    () => {
      if (debouncedQuery.length < minChars) {
        return Promise.resolve([]);
      }
      return searchFn(debouncedQuery);
    },
    {
      skip: skip || debouncedQuery.length < minChars,
      dependencies: [debouncedQuery],
    }
  );

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  const hasResults = !loading && results.length > 0;
  const hasSearched = query.length >= minChars;

  return {
    query,
    results,
    loading,
    error,
    hasResults,
    hasSearched,
    handleSearch,
    clearSearch,
    refetch: execute,
  };
}

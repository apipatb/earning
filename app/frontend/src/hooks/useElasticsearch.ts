/**
 * Custom hook for Elasticsearch-powered search
 */

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import {
  globalSearch,
  searchTickets,
  searchMessages,
  searchCustomers,
  searchDocuments,
  getSuggestions,
  SearchOptions,
  SearchResponse,
  GlobalSearchResponse,
  SuggestionOptions,
} from '../lib/search-api';

export interface UseElasticsearchOptions {
  debounceDelay?: number;
  minChars?: number;
  autoSearch?: boolean;
}

export type SearchIndex = 'tickets' | 'messages' | 'customers' | 'documents' | 'global';

/**
 * Hook for Elasticsearch global search
 */
export function useGlobalSearch(options: UseElasticsearchOptions = {}) {
  const { debounceDelay = 300, minChars = 2, autoSearch = true } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceDelay);

  const performSearch = useCallback(
    async (searchQuery: string, from: number = 0, size: number = 20) => {
      if (searchQuery.length < minChars) {
        setResults(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await globalSearch(searchQuery, from, size);
        setResults(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Search failed');
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [minChars]
  );

  // Auto-search when debounced query changes
  useEffect(() => {
    if (autoSearch && debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery, autoSearch, performSearch]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
  }, []);

  return {
    query,
    results,
    loading,
    error,
    hasResults: results !== null && Object.values(results).some((r) => r.total > 0),
    handleSearch,
    clearSearch,
    performSearch,
  };
}

/**
 * Hook for entity-specific search (tickets, messages, customers, documents)
 */
export function useEntitySearch<T = any>(
  index: Exclude<SearchIndex, 'global'>,
  options: UseElasticsearchOptions = {}
) {
  const { debounceDelay = 300, minChars = 1, autoSearch = false } = options;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchOptions>({});
  const [results, setResults] = useState<SearchResponse<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceDelay);

  const performSearch = useCallback(
    async (searchOptions: SearchOptions = {}) => {
      setLoading(true);
      setError(null);

      try {
        let data: SearchResponse<T>;

        const combinedOptions = {
          ...filters,
          ...searchOptions,
          q: searchOptions.q !== undefined ? searchOptions.q : query,
        };

        switch (index) {
          case 'tickets':
            data = await searchTickets(combinedOptions);
            break;
          case 'messages':
            data = await searchMessages(combinedOptions);
            break;
          case 'customers':
            data = await searchCustomers(combinedOptions);
            break;
          case 'documents':
            data = await searchDocuments(combinedOptions);
            break;
          default:
            throw new Error(`Unknown index: ${index}`);
        }

        setResults(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Search failed');
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [index, query, filters]
  );

  // Auto-search when debounced query or filters change
  useEffect(() => {
    if (autoSearch) {
      performSearch();
    }
  }, [debouncedQuery, filters, autoSearch]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const updateFilters = useCallback((newFilters: SearchOptions) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({});
    setResults(null);
    setError(null);
  }, []);

  return {
    query,
    filters,
    results,
    loading,
    error,
    hasResults: results !== null && (results.total ?? 0) > 0,
    handleSearch,
    updateFilters,
    clearFilters,
    clearSearch,
    performSearch,
  };
}

/**
 * Hook for autocomplete suggestions
 */
export function useAutocomplete(index: 'tickets' | 'chat_messages' | 'customers' | 'documents') {
  const [query, setQuery] = useState('');
  const [field, setField] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 200);

  const fetchSuggestions = useCallback(
    async (options: SuggestionOptions) => {
      if (!options.q || options.q.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getSuggestions(options);
        setSuggestions(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to get suggestions');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Auto-fetch when query changes
  useEffect(() => {
    if (debouncedQuery && field) {
      fetchSuggestions({ q: debouncedQuery, field, index });
    }
  }, [debouncedQuery, field, index, fetchSuggestions]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleFieldChange = useCallback((value: string) => {
    setField(value);
  }, []);

  const clearSuggestions = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    query,
    field,
    suggestions,
    loading,
    error,
    handleQueryChange,
    handleFieldChange,
    clearSuggestions,
    fetchSuggestions,
  };
}

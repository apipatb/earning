import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { getErrorMessage } from '../lib/error';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching data from API endpoints
 * Handles loading, error, and data states
 */
export function useFetch<T>(
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    skip?: boolean;
    dependencies?: any[];
  }
) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await api({
        url,
        method: options?.method || 'GET',
        data: options?.body,
      });

      setState({
        data: response.data,
        loading: false,
        error: null,
      });

      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const err = new Error(errorMessage);
      setState({
        data: null,
        loading: false,
        error: err,
      });
      throw err;
    }
  }, [url, options?.method, options?.body]);

  useEffect(() => {
    if (options?.skip) {
      return;
    }

    fetchData();
  }, [fetchData, options?.skip, ...(options?.dependencies || [])]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
    isLoading: state.loading,
    isError: !!state.error,
  };
}

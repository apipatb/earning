/**
 * Tests for useSearch hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useSearch } from '../useSearch';

describe('useSearch Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with empty results', () => {
    const searchFn = jest.fn(() => Promise.resolve([]));
    const { result } = renderHook(() => useSearch(searchFn));

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.hasResults).toBe(false);
    expect(result.current.hasSearched).toBe(false);
  });

  it('should update query on search', async () => {
    const searchFn = jest.fn(() => Promise.resolve([]));
    const { result } = renderHook(() => useSearch(searchFn));

    act(() => {
      result.current.handleSearch('test');
    });

    expect(result.current.query).toBe('test');
  });

  it('should not search with less than minimum characters', async () => {
    const searchFn = jest.fn(() => Promise.resolve([]));
    const { result } = renderHook(() => useSearch(searchFn, { minChars: 3 }));

    act(() => {
      result.current.handleSearch('a');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(searchFn).not.toHaveBeenCalled();
    expect(result.current.hasSearched).toBe(false);
  });

  it('should search with minimum characters met', async () => {
    const mockResults = [
      { id: '1', type: 'earning' as const, title: 'Test' },
    ];
    const searchFn = jest.fn(() => Promise.resolve(mockResults));
    const { result } = renderHook(() => useSearch(searchFn, { minChars: 2 }));

    act(() => {
      result.current.handleSearch('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(mockResults);
    });
  });

  it('should debounce search queries', async () => {
    const searchFn = jest.fn(() => Promise.resolve([]));
    const { result } = renderHook(() => useSearch(searchFn, { debounceDelay: 500 }));

    act(() => {
      result.current.handleSearch('a');
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    act(() => {
      result.current.handleSearch('ab');
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should not be called yet due to debouncing
    expect(searchFn).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should be called once with the final query
    expect(searchFn).toHaveBeenCalledTimes(1);
  });

  it('should return search results', async () => {
    const mockResults = [
      { id: '1', type: 'earning' as const, title: 'Item 1', amount: 100 },
      { id: '2', type: 'expense' as const, title: 'Item 2', amount: 50 },
    ];
    const searchFn = jest.fn(() => Promise.resolve(mockResults));
    const { result } = renderHook(() => useSearch(searchFn));

    act(() => {
      result.current.handleSearch('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(mockResults);
    });

    expect(result.current.hasResults).toBe(true);
  });

  it('should handle search errors', async () => {
    const error = new Error('Search failed');
    const searchFn = jest.fn(() => Promise.reject(error));
    const { result } = renderHook(() => useSearch(searchFn));

    act(() => {
      result.current.handleSearch('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.results).toEqual([]);
  });

  it('should clear search', async () => {
    const searchFn = jest.fn(() => Promise.resolve([]));
    const { result } = renderHook(() => useSearch(searchFn));

    act(() => {
      result.current.handleSearch('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.query).toBe('test');

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
  });

  it('should refetch results', async () => {
    const mockResults = [{ id: '1', type: 'earning' as const, title: 'Test' }];
    const searchFn = jest.fn(() => Promise.resolve(mockResults));
    const { result } = renderHook(() => useSearch(searchFn));

    act(() => {
      result.current.handleSearch('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(searchFn).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(searchFn).toHaveBeenCalledTimes(2);
    });
  });

  it('should respect skip option', async () => {
    const searchFn = jest.fn(() => Promise.resolve([]));
    const { result } = renderHook(() => useSearch(searchFn, { skip: true }));

    act(() => {
      result.current.handleSearch('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(searchFn).not.toHaveBeenCalled();
  });

  it('should indicate search status', () => {
    const searchFn = jest.fn(() => Promise.resolve([]));
    const { result } = renderHook(() => useSearch(searchFn, { minChars: 2 }));

    expect(result.current.hasSearched).toBe(false);

    act(() => {
      result.current.handleSearch('te');
    });

    expect(result.current.hasSearched).toBe(true);
  });
});

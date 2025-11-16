/**
 * Tests for useInfiniteScroll and useInfiniteScrollPagination hooks
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useInfiniteScrollPagination } from '../useInfiniteScroll';

describe('useInfiniteScrollPagination Hook', () => {
  const mockFetchFn = jest.fn();

  beforeEach(() => {
    mockFetchFn.mockClear();
  });

  it('should initialize with empty items', async () => {
    mockFetchFn.mockResolvedValue({ items: [], total: 0 });
    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.items).toEqual([]);
    });
  });

  it('should load initial items on mount', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];
    mockFetchFn.mockResolvedValue({ items: mockItems, total: 50 });

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.items).toEqual(mockItems);
    });

    expect(mockFetchFn).toHaveBeenCalledWith(0, 20);
  });

  it('should load more items', async () => {
    const firstBatch = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];
    const secondBatch = [
      { id: '3', name: 'Item 3' },
      { id: '4', name: 'Item 4' },
    ];

    mockFetchFn
      .mockResolvedValueOnce({ items: firstBatch, total: 50 })
      .mockResolvedValueOnce({ items: secondBatch, total: 50 });

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(4);
    });

    expect(result.current.items).toEqual([...firstBatch, ...secondBatch]);
  });

  it('should set hasMore to false when at end', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];
    mockFetchFn.mockResolvedValue({ items: mockItems, total: 2 });

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });
  });

  it('should calculate items remaining correctly', async () => {
    const mockItems = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
    }));
    mockFetchFn.mockResolvedValue({ items: mockItems, total: 50 });

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.itemsRemaining).toBe(30);
    });
  });

  it('should handle load more errors', async () => {
    const initialItems = [{ id: '1', name: 'Item 1' }];
    mockFetchFn
      .mockResolvedValueOnce({ items: initialItems, total: 50 })
      .mockRejectedValueOnce(new Error('Load more failed'));

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.hasMore).toBe(false);
  });

  it('should not load more when already loading', async () => {
    mockFetchFn.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve({ items: [], total: 0 }), 100)
        )
    );

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    // Attempt to load more while loading
    act(() => {
      result.current.loadMore();
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(mockFetchFn).toHaveBeenCalledTimes(2); // Initial + one loadMore
    });
  });

  it('should reset pagination state', async () => {
    const mockItems = [{ id: '1', name: 'Item 1' }];
    mockFetchFn.mockResolvedValue({ items: mockItems, total: 50 });

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.offset).toBe(0);
    expect(result.current.total).toBe(0);
    expect(result.current.hasMore).toBe(true);
  });

  it('should refresh items', async () => {
    const firstLoad = [{ id: '1', name: 'Item 1' }];
    const secondLoad = [{ id: '2', name: 'Item 2' }];

    mockFetchFn
      .mockResolvedValueOnce({ items: firstLoad, total: 50 })
      .mockResolvedValueOnce({ items: secondLoad, total: 50 });

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.items).toEqual(firstLoad);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.items).toEqual(secondLoad);
    });

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
  });

  it('should track items loaded', async () => {
    const mockItems = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
    }));
    mockFetchFn.mockResolvedValue({ items: mockItems, total: 100 });

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.itemsLoaded).toBe(20);
    });
  });

  it('should handle page size changes', async () => {
    const mockItems = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
    }));
    mockFetchFn.mockResolvedValue({ items: mockItems, total: 100 });

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(10, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(10);
    });

    expect(mockFetchFn).toHaveBeenCalledWith(0, 10);
  });

  it('should set loading state correctly', async () => {
    mockFetchFn.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve({ items: [], total: 0 }), 100)
        )
    );

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle errors on initial load', async () => {
    mockFetchFn.mockRejectedValue(new Error('Initial load failed'));

    const { result } = renderHook(() =>
      useInfiniteScrollPagination(20, mockFetchFn)
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.hasMore).toBe(false);
    expect(result.current.items).toEqual([]);
  });
});

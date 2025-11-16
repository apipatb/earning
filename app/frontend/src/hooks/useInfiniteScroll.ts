/**
 * Hook for infinite scroll/load-more functionality
 * Handles pagination and fetching more items as user scrolls
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface InfiniteScrollOptions {
  threshold?: number; // Percentage of item visibility to trigger load
  onLoadMore: () => Promise<void>;
}

/**
 * Hook for implementing infinite scroll using Intersection Observer
 * @param containerRef - Reference to scrollable container
 * @param options - Configuration options
 * @returns Loading and error states
 */
export function useInfiniteScroll(
  containerRef: React.RefObject<HTMLDivElement>,
  options: InfiniteScrollOptions
) {
  const { threshold = 0.1, onLoadMore } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const observerTargetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!observerTargetRef.current) return;

    const handleIntersection = async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting && hasMore && !isLoading) {
        setIsLoading(true);
        setError(null);

        try {
          await onLoadMore();
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setHasMore(false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    const observer = new IntersectionObserver(handleIntersection, {
      root: containerRef.current,
      rootMargin: '100px', // Load before completely visible
      threshold: Math.max(0, Math.min(1, threshold)),
    });

    observer.observe(observerTargetRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, threshold, onLoadMore, containerRef]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setHasMore(true);
  }, []);

  return {
    observerTargetRef,
    isLoading,
    error,
    hasMore,
    setHasMore,
    reset,
  };
}

/**
 * Hook for managing infinite scroll pagination
 * Handles offset-based pagination with load-more
 * @param initialOffset - Initial offset
 * @param pageSize - Number of items per page
 * @param fetchFn - Function to fetch items
 * @returns Pagination state and functions
 */
export function useInfiniteScrollPagination<T>(
  pageSize: number = 20,
  fetchFn: (offset: number, limit: number) => Promise<{ items: T[]; total: number }>
) {
  const [items, setItems] = useState<T[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFn(offset, pageSize);
      setItems(prev => [...prev, ...response.items]);
      setTotal(response.total);
      setOffset(prev => prev + pageSize);

      // Check if there are more items
      if (offset + pageSize >= response.total) {
        setHasMore(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more items'));
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [offset, pageSize, isLoading, hasMore, fetchFn]);

  const reset = useCallback(() => {
    setItems([]);
    setOffset(0);
    setTotal(0);
    setIsLoading(false);
    setError(null);
    setHasMore(true);
  }, []);

  const refresh = useCallback(async () => {
    reset();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFn(0, pageSize);
      setItems(response.items);
      setTotal(response.total);
      setOffset(pageSize);

      if (pageSize >= response.total) {
        setHasMore(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load items'));
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, fetchFn]);

  useEffect(() => {
    refresh();
  }, []); // Load initial data on mount

  return {
    items,
    offset,
    total,
    isLoading,
    error,
    hasMore,
    loadMore,
    reset,
    refresh,
    itemsLoaded: items.length,
    itemsRemaining: Math.max(0, total - items.length),
  };
}

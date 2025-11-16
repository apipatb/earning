/**
 * Hook for managing sorting logic in tables and lists
 * Supports multi-column sorting with direction toggle
 */

import { useState, useCallback, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export interface MultiSortConfig {
  columns: Array<{
    key: string;
    direction: SortDirection;
  }>;
}

/**
 * Hook for managing single-column sorting
 * @param initialKey - Initial sort column key
 * @param initialDirection - Initial sort direction
 * @param onSortChange - Callback when sort changes
 * @returns Sort state and functions
 */
export function useSort(
  initialKey: string | null = null,
  initialDirection: SortDirection = null,
  onSortChange?: (config: SortConfig) => void
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: initialKey,
    direction: initialDirection,
  });

  const handleSort = useCallback(
    (key: string) => {
      let direction: SortDirection = 'asc';

      // Toggle direction if clicking the same column
      if (sortConfig.key === key) {
        if (sortConfig.direction === 'asc') {
          direction = 'desc';
        } else if (sortConfig.direction === 'desc') {
          direction = null;
        }
      }

      const newConfig = {
        key: direction === null ? null : key,
        direction,
      };

      setSortConfig(newConfig);
      onSortChange?.(newConfig);
    },
    [sortConfig, onSortChange]
  );

  const resetSort = useCallback(() => {
    const newConfig = { key: null, direction: null };
    setSortConfig(newConfig);
    onSortChange?.(newConfig);
  }, [onSortChange]);

  const getSortIndicator = useCallback(
    (key: string) => {
      if (sortConfig.key !== key) return null;
      return sortConfig.direction;
    },
    [sortConfig]
  );

  const isSortedBy = useCallback(
    (key: string) => sortConfig.key === key,
    [sortConfig]
  );

  return {
    sortConfig,
    handleSort,
    resetSort,
    getSortIndicator,
    isSortedBy,
  };
}

/**
 * Hook for managing multi-column sorting
 * @param initialSorts - Initial sort configuration
 * @param maxColumns - Maximum number of columns to sort by
 * @param onSortChange - Callback when sort changes
 * @returns Sort state and functions
 */
export function useMultiSort(
  initialSorts: Array<{ key: string; direction: SortDirection }> = [],
  maxColumns = 3,
  onSortChange?: (configs: Array<{ key: string; direction: SortDirection }>) => void
) {
  const [sorts, setSorts] = useState(
    initialSorts.filter(s => s.direction !== null).slice(0, maxColumns)
  );

  const handleSort = useCallback(
    (key: string) => {
      setSorts(prevSorts => {
        const existingIndex = prevSorts.findIndex(s => s.key === key);
        let newSorts = [...prevSorts];

        if (existingIndex !== -1) {
          const currentDirection = newSorts[existingIndex].direction;
          if (currentDirection === 'asc') {
            newSorts[existingIndex].direction = 'desc';
          } else if (currentDirection === 'desc') {
            newSorts = newSorts.filter((_, i) => i !== existingIndex);
          }
        } else {
          if (newSorts.length >= maxColumns) {
            newSorts = newSorts.slice(1);
          }
          newSorts.push({ key, direction: 'asc' });
        }

        onSortChange?.(newSorts);
        return newSorts;
      });
    },
    [maxColumns, onSortChange]
  );

  const resetSort = useCallback(() => {
    setSorts([]);
    onSortChange?.([]);
  }, [onSortChange]);

  const removeSortColumn = useCallback(
    (key: string) => {
      setSorts(prevSorts => {
        const newSorts = prevSorts.filter(s => s.key !== key);
        onSortChange?.(newSorts);
        return newSorts;
      });
    },
    [onSortChange]
  );

  const getSortIndicator = useCallback(
    (key: string) => {
      const sort = sorts.find(s => s.key === key);
      return sort?.direction ?? null;
    },
    [sorts]
  );

  const isSortedBy = useCallback(
    (key: string) => sorts.some(s => s.key === key),
    [sorts]
  );

  const sortIndex = useCallback(
    (key: string) => {
      const index = sorts.findIndex(s => s.key === key);
      return index !== -1 ? index : null;
    },
    [sorts]
  );

  return {
    sorts,
    handleSort,
    resetSort,
    removeSortColumn,
    getSortIndicator,
    isSortedBy,
    sortIndex,
  };
}

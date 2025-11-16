/**
 * Hook for managing complex filtering logic
 * Handles multiple filters, combining conditions, and reset functionality
 */

import { useState, useCallback, useMemo } from 'react';

export interface FilterOption {
  label: string;
  value: string | number | boolean;
  selected?: boolean;
}

export interface FilterConfig {
  [key: string]: FilterOption[];
}

export interface ActiveFilters {
  [key: string]: string | number | boolean | (string | number | boolean)[];
}

/**
 * Hook for managing complex filters with multiple conditions
 * @param initialFilters - Initial filter configuration
 * @param onFilterChange - Callback when filters change
 * @returns Filter state and functions
 */
export function useFilter(
  initialFilters: FilterConfig = {},
  onFilterChange?: (filters: ActiveFilters) => void
) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  const handleFilterChange = useCallback(
    (filterKey: string, value: string | number | boolean | (string | number | boolean)[]) => {
      setActiveFilters(prev => {
        const updated = { ...prev };

        if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
          delete updated[filterKey];
        } else {
          updated[filterKey] = value;
        }

        onFilterChange?.(updated);
        return updated;
      });
    },
    [onFilterChange]
  );

  const addFilter = useCallback(
    (filterKey: string, value: string | number | boolean) => {
      setActiveFilters(prev => {
        const updated = { ...prev };
        const current = updated[filterKey];

        if (Array.isArray(current)) {
          if (!current.includes(value)) {
            updated[filterKey] = [...current, value];
          }
        } else {
          updated[filterKey] = value;
        }

        onFilterChange?.(updated);
        return updated;
      });
    },
    [onFilterChange]
  );

  const removeFilter = useCallback(
    (filterKey: string, value?: string | number | boolean) => {
      setActiveFilters(prev => {
        const updated = { ...prev };
        const current = updated[filterKey];

        if (value !== undefined && Array.isArray(current)) {
          updated[filterKey] = current.filter(v => v !== value);
          if (updated[filterKey].length === 0) {
            delete updated[filterKey];
          }
        } else {
          delete updated[filterKey];
        }

        onFilterChange?.(updated);
        return updated;
      });
    },
    [onFilterChange]
  );

  const toggleFilter = useCallback(
    (filterKey: string, value: string | number | boolean) => {
      setActiveFilters(prev => {
        const updated = { ...prev };
        const current = updated[filterKey];

        if (Array.isArray(current)) {
          if (current.includes(value)) {
            updated[filterKey] = current.filter(v => v !== value);
            if (updated[filterKey].length === 0) {
              delete updated[filterKey];
            }
          } else {
            updated[filterKey] = [...current, value];
          }
        } else if (current === value) {
          delete updated[filterKey];
        } else {
          updated[filterKey] = value;
        }

        onFilterChange?.(updated);
        return updated;
      });
    },
    [onFilterChange]
  );

  const resetFilters = useCallback(() => {
    setActiveFilters({});
    onFilterChange?.({});
  }, [onFilterChange]);

  const hasActiveFilters = useMemo(
    () => Object.keys(activeFilters).length > 0,
    [activeFilters]
  );

  const filterCount = useMemo(() => {
    return Object.values(activeFilters).reduce((acc, value) => {
      if (Array.isArray(value)) {
        return acc + value.length;
      }
      return acc + 1;
    }, 0);
  }, [activeFilters]);

  const isFilterActive = useCallback(
    (filterKey: string, value?: string | number | boolean) => {
      const current = activeFilters[filterKey];

      if (value === undefined) {
        return current !== undefined;
      }

      if (Array.isArray(current)) {
        return current.includes(value);
      }

      return current === value;
    },
    [activeFilters]
  );

  return {
    activeFilters,
    handleFilterChange,
    addFilter,
    removeFilter,
    toggleFilter,
    resetFilters,
    hasActiveFilters,
    filterCount,
    isFilterActive,
  };
}

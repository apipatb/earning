/**
 * Tests for useFilter hook
 */

import { renderHook, act } from '@testing-library/react';
import { useFilter } from '../useFilter';

describe('useFilter Hook', () => {
  it('should initialize with no active filters', () => {
    const { result } = renderHook(() => useFilter());

    expect(result.current.activeFilters).toEqual({});
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filterCount).toBe(0);
  });

  it('should add a filter', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('category', 'electronics');
    });

    expect(result.current.activeFilters.category).toBe('electronics');
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.filterCount).toBe(1);
  });

  it('should add multiple filters', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('category', 'electronics');
      result.current.handleFilterChange('price', 100);
    });

    expect(result.current.activeFilters.category).toBe('electronics');
    expect(result.current.activeFilters.price).toBe(100);
    expect(result.current.filterCount).toBe(2);
  });

  it('should add a filter with array values', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('tags', ['tag1', 'tag2']);
    });

    expect(result.current.activeFilters.tags).toEqual(['tag1', 'tag2']);
    expect(result.current.filterCount).toBe(2);
  });

  it('should add a single value to array filter', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.addFilter('tags', 'tag1');
    });

    expect(result.current.activeFilters.tags).toEqual(['tag1']);

    act(() => {
      result.current.addFilter('tags', 'tag2');
    });

    expect(result.current.activeFilters.tags).toEqual(['tag1', 'tag2']);
  });

  it('should not add duplicate values to array filter', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.addFilter('tags', 'tag1');
      result.current.addFilter('tags', 'tag1');
    });

    expect(result.current.activeFilters.tags).toEqual(['tag1']);
  });

  it('should remove a filter', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('category', 'electronics');
    });

    expect(result.current.activeFilters.category).toBe('electronics');

    act(() => {
      result.current.removeFilter('category');
    });

    expect(result.current.activeFilters.category).toBeUndefined();
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('should remove specific value from array filter', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('tags', ['tag1', 'tag2', 'tag3']);
    });

    expect(result.current.filterCount).toBe(3);

    act(() => {
      result.current.removeFilter('tags', 'tag2');
    });

    expect(result.current.activeFilters.tags).toEqual(['tag1', 'tag3']);
    expect(result.current.filterCount).toBe(2);
  });

  it('should toggle filter value', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.toggleFilter('category', 'electronics');
    });

    expect(result.current.activeFilters.category).toBe('electronics');

    act(() => {
      result.current.toggleFilter('category', 'electronics');
    });

    expect(result.current.activeFilters.category).toBeUndefined();
  });

  it('should toggle array filter value', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('tags', ['tag1']);
    });

    act(() => {
      result.current.toggleFilter('tags', 'tag2');
    });

    expect(result.current.activeFilters.tags).toEqual(['tag1', 'tag2']);

    act(() => {
      result.current.toggleFilter('tags', 'tag2');
    });

    expect(result.current.activeFilters.tags).toEqual(['tag1']);
  });

  it('should reset all filters', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('category', 'electronics');
      result.current.handleFilterChange('price', 100);
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.activeFilters).toEqual({});
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('should check if filter is active', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('category', 'electronics');
    });

    expect(result.current.isFilterActive('category')).toBe(true);
    expect(result.current.isFilterActive('category', 'electronics')).toBe(true);
    expect(result.current.isFilterActive('category', 'books')).toBe(false);
    expect(result.current.isFilterActive('price')).toBe(false);
  });

  it('should check array filter values', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('tags', ['tag1', 'tag2']);
    });

    expect(result.current.isFilterActive('tags')).toBe(true);
    expect(result.current.isFilterActive('tags', 'tag1')).toBe(true);
    expect(result.current.isFilterActive('tags', 'tag2')).toBe(true);
    expect(result.current.isFilterActive('tags', 'tag3')).toBe(false);
  });

  it('should call onFilterChange callback', () => {
    const onFilterChange = jest.fn();
    const { result } = renderHook(() => useFilter({}, onFilterChange));

    act(() => {
      result.current.handleFilterChange('category', 'electronics');
    });

    expect(onFilterChange).toHaveBeenCalledWith({ category: 'electronics' });
  });

  it('should remove empty array filters', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('tags', ['tag1']);
    });

    act(() => {
      result.current.removeFilter('tags', 'tag1');
    });

    expect(result.current.activeFilters.tags).toBeUndefined();
  });

  it('should handle null and undefined values', () => {
    const { result } = renderHook(() => useFilter());

    act(() => {
      result.current.handleFilterChange('category', 'electronics');
    });

    act(() => {
      result.current.handleFilterChange('category', null);
    });

    expect(result.current.activeFilters.category).toBeUndefined();

    act(() => {
      result.current.handleFilterChange('category', 'books');
    });

    act(() => {
      result.current.handleFilterChange('category', undefined);
    });

    expect(result.current.activeFilters.category).toBeUndefined();
  });
});

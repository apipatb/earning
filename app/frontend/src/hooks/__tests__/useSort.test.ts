/**
 * Tests for useSort and useMultiSort hooks
 */

import { renderHook, act } from '@testing-library/react';
import { useSort, useMultiSort } from '../useSort';

describe('useSort Hook', () => {
  it('should initialize with no sort', () => {
    const { result } = renderHook(() => useSort());

    expect(result.current.sortConfig.key).toBeNull();
    expect(result.current.sortConfig.direction).toBeNull();
  });

  it('should initialize with initial sort', () => {
    const { result } = renderHook(() => useSort('name', 'asc'));

    expect(result.current.sortConfig.key).toBe('name');
    expect(result.current.sortConfig.direction).toBe('asc');
  });

  it('should set sort ascending on first click', () => {
    const { result } = renderHook(() => useSort());

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sortConfig.key).toBe('name');
    expect(result.current.sortConfig.direction).toBe('asc');
  });

  it('should toggle to descending on second click', () => {
    const { result } = renderHook(() => useSort());

    act(() => {
      result.current.handleSort('name');
    });

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sortConfig.key).toBe('name');
    expect(result.current.sortConfig.direction).toBe('desc');
  });

  it('should clear sort on third click', () => {
    const { result } = renderHook(() => useSort());

    act(() => {
      result.current.handleSort('name');
    });

    act(() => {
      result.current.handleSort('name');
    });

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sortConfig.key).toBeNull();
    expect(result.current.sortConfig.direction).toBeNull();
  });

  it('should switch sort column', () => {
    const { result } = renderHook(() => useSort());

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sortConfig.key).toBe('name');
    expect(result.current.sortConfig.direction).toBe('asc');

    act(() => {
      result.current.handleSort('email');
    });

    expect(result.current.sortConfig.key).toBe('email');
    expect(result.current.sortConfig.direction).toBe('asc');
  });

  it('should reset sort', () => {
    const { result } = renderHook(() => useSort());

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sortConfig.key).toBe('name');

    act(() => {
      result.current.resetSort();
    });

    expect(result.current.sortConfig.key).toBeNull();
    expect(result.current.sortConfig.direction).toBeNull();
  });

  it('should get sort indicator for a column', () => {
    const { result } = renderHook(() => useSort());

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.getSortIndicator('name')).toBe('asc');
    expect(result.current.getSortIndicator('email')).toBeNull();

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.getSortIndicator('name')).toBe('desc');
  });

  it('should check if column is sorted', () => {
    const { result } = renderHook(() => useSort());

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.isSortedBy('name')).toBe(true);
    expect(result.current.isSortedBy('email')).toBe(false);
  });

  it('should call onSortChange callback', () => {
    const onSortChange = jest.fn();
    const { result } = renderHook(() => useSort(null, null, onSortChange));

    act(() => {
      result.current.handleSort('name');
    });

    expect(onSortChange).toHaveBeenCalledWith({
      key: 'name',
      direction: 'asc',
    });
  });
});

describe('useMultiSort Hook', () => {
  it('should initialize with no sorts', () => {
    const { result } = renderHook(() => useMultiSort());

    expect(result.current.sorts).toEqual([]);
  });

  it('should initialize with initial sorts', () => {
    const { result } = renderHook(() =>
      useMultiSort([
        { key: 'name', direction: 'asc' },
        { key: 'email', direction: 'desc' },
      ])
    );

    expect(result.current.sorts).toHaveLength(2);
    expect(result.current.sorts[0].key).toBe('name');
    expect(result.current.sorts[1].key).toBe('email');
  });

  it('should add a sort column', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sorts).toHaveLength(1);
    expect(result.current.sorts[0].key).toBe('name');
    expect(result.current.sorts[0].direction).toBe('asc');
  });

  it('should add multiple sort columns', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('name');
      result.current.handleSort('email');
    });

    expect(result.current.sorts).toHaveLength(2);
    expect(result.current.sorts[0].key).toBe('name');
    expect(result.current.sorts[1].key).toBe('email');
  });

  it('should respect max columns limit', () => {
    const { result } = renderHook(() => useMultiSort([], 2));

    act(() => {
      result.current.handleSort('name');
      result.current.handleSort('email');
      result.current.handleSort('age');
    });

    expect(result.current.sorts).toHaveLength(2);
    expect(result.current.sorts[0].key).toBe('email');
    expect(result.current.sorts[1].key).toBe('age');
  });

  it('should toggle direction of existing sort', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sorts[0].direction).toBe('asc');

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sorts[0].direction).toBe('desc');
  });

  it('should remove sort when toggling third time', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('name');
      result.current.handleSort('name');
      result.current.handleSort('name');
    });

    expect(result.current.sorts).toHaveLength(0);
  });

  it('should remove specific sort column', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('name');
      result.current.handleSort('email');
    });

    expect(result.current.sorts).toHaveLength(2);

    act(() => {
      result.current.removeSortColumn('name');
    });

    expect(result.current.sorts).toHaveLength(1);
    expect(result.current.sorts[0].key).toBe('email');
  });

  it('should reset all sorts', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('name');
      result.current.handleSort('email');
    });

    expect(result.current.sorts).toHaveLength(2);

    act(() => {
      result.current.resetSort();
    });

    expect(result.current.sorts).toEqual([]);
  });

  it('should get sort indicator', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.getSortIndicator('name')).toBe('asc');
    expect(result.current.getSortIndicator('email')).toBeNull();
  });

  it('should check if sorted by', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('name');
      result.current.handleSort('email');
    });

    expect(result.current.isSortedBy('name')).toBe(true);
    expect(result.current.isSortedBy('email')).toBe(true);
    expect(result.current.isSortedBy('age')).toBe(false);
  });

  it('should get sort index', () => {
    const { result } = renderHook(() => useMultiSort());

    act(() => {
      result.current.handleSort('name');
      result.current.handleSort('email');
      result.current.handleSort('age');
    });

    expect(result.current.sortIndex('name')).toBe(0);
    expect(result.current.sortIndex('email')).toBe(1);
    expect(result.current.sortIndex('age')).toBe(2);
    expect(result.current.sortIndex('phone')).toBeNull();
  });

  it('should call onSortChange callback', () => {
    const onSortChange = jest.fn();
    const { result } = renderHook(() => useMultiSort([], 3, onSortChange));

    act(() => {
      result.current.handleSort('name');
    });

    expect(onSortChange).toHaveBeenCalledWith([
      { key: 'name', direction: 'asc' },
    ]);
  });
});

/**
 * Tests for usePagination hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination Hook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    expect(result.current.limit).toBe(10);
    expect(result.current.offset).toBe(0);
    expect(result.current.total).toBe(100);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(10);
  });

  it('should navigate to next page', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.offset).toBe(10);
    expect(result.current.currentPage).toBe(2);
  });

  it('should navigate to previous page', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    // First go to next page
    act(() => {
      result.current.nextPage();
    });

    // Then go back
    act(() => {
      result.current.previousPage();
    });

    expect(result.current.offset).toBe(0);
    expect(result.current.currentPage).toBe(1);
  });

  it('should not go to previous page when on first page', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.offset).toBe(0);
  });

  it('should not go to next page when on last page', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    // Go to last page (page 10)
    act(() => {
      result.current.goToPage(10);
    });

    // Try to go to next page
    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(10);
  });

  it('should go to specific page', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.currentPage).toBe(5);
    expect(result.current.offset).toBe(40);
  });

  it('should set limit and reset to page 1', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.currentPage).toBe(5);

    act(() => {
      result.current.setLimit(20);
    });

    expect(result.current.limit).toBe(20);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.offset).toBe(0);
    expect(result.current.totalPages).toBe(5);
  });

  it('should reset pagination', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    act(() => {
      result.current.goToPage(5);
      result.current.setLimit(20);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(10);
  });

  it('should update total and calculate totalPages', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    expect(result.current.totalPages).toBe(10);

    act(() => {
      result.current.updateTotal(150);
    });

    expect(result.current.total).toBe(150);
    expect(result.current.totalPages).toBe(15);
  });

  it('should indicate if has next page', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.goToPage(10);
    });

    expect(result.current.hasNextPage).toBe(false);
  });

  it('should indicate if has previous page', () => {
    const { result } = renderHook(() => usePagination({ total: 100, limit: 10 }));

    expect(result.current.hasPreviousPage).toBe(false);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.hasPreviousPage).toBe(true);
  });
});

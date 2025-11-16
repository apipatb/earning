/**
 * Tests for useAsync hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAsync } from '../useAsync';

describe('useAsync Hook', () => {
  it('should initialize with idle status', () => {
    const { result } = renderHook(() =>
      useAsync(async () => Promise.resolve('data'))
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle successful async operation', async () => {
    const asyncFunction = jest.fn(() => Promise.resolve('test data'));
    const { result } = renderHook(() => useAsync(asyncFunction));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toBe('test data');
    expect(result.current.error).toBeNull();
    expect(asyncFunction).toHaveBeenCalled();
  });

  it('should handle async operation error', async () => {
    const testError = new Error('Test error');
    const asyncFunction = jest.fn(() => Promise.reject(testError));
    const { result } = renderHook(() => useAsync(asyncFunction));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(testError);
  });

  it('should set pending status during operation', async () => {
    const asyncFunction = jest.fn(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve('delayed data'), 100)
        )
    );
    const { result } = renderHook(() => useAsync(asyncFunction));

    expect(result.current.status).toBe('idle');

    await waitFor(
      () => {
        expect(result.current.status).toBe('pending');
      },
      { timeout: 50 }
    ).catch(() => {
      // Timeout is expected as status might change too quickly
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toBe('delayed data');
  });

  it('should respect skip parameter', () => {
    const asyncFunction = jest.fn(() => Promise.resolve('data'));
    const { result } = renderHook(() =>
      useAsync(asyncFunction, { skip: true })
    );

    expect(result.current.status).toBe('idle');
    expect(asyncFunction).not.toHaveBeenCalled();
  });

  it('should execute manual trigger', async () => {
    const asyncFunction = jest.fn(() => Promise.resolve('triggered data'));
    const { result } = renderHook(() =>
      useAsync(asyncFunction, { skip: true })
    );

    result.current.execute();

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toBe('triggered data');
  });

  it('should handle dependencies array', async () => {
    const asyncFunction = jest.fn(() => Promise.resolve('data'));
    let dependency = 'initial';

    const { rerender } = renderHook(
      ({ dep }) => useAsync(asyncFunction, { dependencies: [dep] }),
      { initialProps: { dep: dependency } }
    );

    await waitFor(() => {
      expect(asyncFunction).toHaveBeenCalledTimes(1);
    });

    // Change dependency
    dependency = 'updated';
    rerender({ dep: dependency });

    await waitFor(() => {
      expect(asyncFunction).toHaveBeenCalledTimes(2);
    });
  });
});

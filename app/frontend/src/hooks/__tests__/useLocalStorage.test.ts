/**
 * Tests for useLocalStorage hook
 */

import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with default value', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default-value')
    );

    expect(result.current[0]).toBe('default-value');
  });

  it('should retrieve existing value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'));

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default-value')
    );

    expect(result.current[0]).toBe('stored-value');
  });

  it('should set value in localStorage', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'initial-value')
    );

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });

  it('should handle object values', () => {
    const initialObject = { name: 'John', age: 30 };
    const { result } = renderHook(() =>
      useLocalStorage('user-key', initialObject)
    );

    const newObject = { name: 'Jane', age: 25 };

    act(() => {
      result.current[1](newObject);
    });

    expect(result.current[0]).toEqual(newObject);
    expect(JSON.parse(localStorage.getItem('user-key') || '{}')).toEqual(
      newObject
    );
  });

  it('should handle array values', () => {
    const initialArray = [1, 2, 3];
    const { result } = renderHook(() =>
      useLocalStorage('array-key', initialArray)
    );

    const newArray = [4, 5, 6];

    act(() => {
      result.current[1](newArray);
    });

    expect(result.current[0]).toEqual(newArray);
    expect(JSON.parse(localStorage.getItem('array-key') || '[]')).toEqual(
      newArray
    );
  });

  it('should handle null values', () => {
    const { result } = renderHook(() =>
      useLocalStorage('null-key', 'initial')
    );

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
    expect(localStorage.getItem('null-key')).toBe(JSON.stringify(null));
  });

  it('should remove item when value is undefined', () => {
    localStorage.setItem('test-key', JSON.stringify('value'));

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default')
    );

    act(() => {
      result.current[1](undefined);
    });

    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('should handle storage event from other tabs', () => {
    const { result } = renderHook(() =>
      useLocalStorage('sync-key', 'initial')
    );

    expect(result.current[0]).toBe('initial');

    // Simulate storage event from another tab
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'sync-key',
        newValue: JSON.stringify('updated-from-other-tab'),
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe('updated-from-other-tab');
  });

  it('should ignore storage events for other keys', () => {
    const { result } = renderHook(() =>
      useLocalStorage('my-key', 'initial')
    );

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'other-key',
        newValue: JSON.stringify('other-value'),
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe('initial');
  });

  it('should handle malformed JSON gracefully', () => {
    localStorage.setItem('bad-json-key', 'not valid json');

    const { result } = renderHook(() =>
      useLocalStorage('bad-json-key', 'fallback')
    );

    expect(result.current[0]).toBe('fallback');
  });
});

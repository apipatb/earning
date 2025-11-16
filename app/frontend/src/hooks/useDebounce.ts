import { useState, useEffect } from 'react';

/**
 * Hook for debouncing values
 * Useful for search inputs and other rapid-change values
 */
export function useDebounce<T>(value: T, delayMs = 500) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    // Clean up the timeout if value changes before delay expires
    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}

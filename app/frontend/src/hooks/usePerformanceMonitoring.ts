import { useEffect, useRef, useState } from 'react';
import { recordComponentMetrics, markStart, markEnd } from '../lib/performance';

/**
 * React hook for tracking component render times and performance
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   usePerformanceMonitoring('MyComponent');
 *   return <div>Content</div>;
 * }
 * ```
 */
export function usePerformanceMonitoring(componentName: string): void {
  const renderStartRef = useRef<number>(0);
  const componentNameRef = useRef(componentName);

  // Mark component render start
  useEffect(() => {
    renderStartRef.current = performance.now();
    markStart(`${componentNameRef.current}-render`);
  }, []);

  // Measure component render time on mount/update
  useEffect(() => {
    const renderTime = markEnd(`${componentNameRef.current}-render`);
    if (renderTime > 0) {
      recordComponentMetrics(componentNameRef.current, renderTime);
    }
  });
}

/**
 * Hook for tracking async operation performance
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { measureAsync } = useAsyncPerformance();
 *
 *   const handleClick = async () => {
 *     const result = await measureAsync(
 *       'fetchUserData',
 *       () => fetch('/api/user').then(r => r.json())
 *     );
 *   };
 *
 *   return <button onClick={handleClick}>Fetch</button>;
 * }
 * ```
 */
export function useAsyncPerformance() {
  const measureAsync = async <T,>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    markStart(operationName);
    try {
      const result = await operation();
      const duration = markEnd(operationName);
      recordComponentMetrics(`async-${operationName}`, duration);
      return result;
    } catch (error) {
      recordComponentMetrics(`async-${operationName}-error`, 0);
      throw error;
    }
  };

  return { measureAsync };
}

/**
 * Hook for tracking API request performance
 * Call this to measure the time between request start and completion
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { trackApiCall } = useApiPerformance();
 *
 *   useEffect(() => {
 *     trackApiCall('/api/earnings', async () => {
 *       const response = await fetch('/api/earnings');
 *       return response.json();
 *     });
 *   }, []);
 * }
 * ```
 */
export function useApiPerformance() {
  const trackApiCall = async <T,>(
    endpoint: string,
    apiFn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await apiFn();
      const duration = performance.now() - startTime;
      recordComponentMetrics(`api-${endpoint}`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      recordComponentMetrics(`api-${endpoint}-error`, duration);
      throw error;
    }
  };

  return { trackApiCall };
}

/**
 * Hook for tracking memory usage
 * Useful for identifying memory leaks
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useMemoryMonitoring('MyComponent');
 * }
 * ```
 */
export function useMemoryMonitoring(componentName: string): void {
  useEffect(() => {
    if (!('memory' in performance)) {
      return;
    }

    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    return () => {
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const delta = finalMemory - initialMemory;

      if (Math.abs(delta) > 1000000) { // Log if change is > 1MB
        recordComponentMetrics(
          `memory-${componentName}`,
          delta
        );
      }
    };
  }, [componentName]);
}

/**
 * Hook for tracking interaction timing
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { measureInteraction } = useInteractionTiming();
 *
 *   const handleClick = () => {
 *     measureInteraction('button-click', () => {
 *       // Your interaction code
 *     });
 *   };
 * }
 * ```
 */
export function useInteractionTiming() {
  const measureInteraction = (
    interactionName: string,
    callback: () => void | Promise<void>
  ): void | Promise<void> => {
    markStart(interactionName);

    const handleResult = (result: void | Promise<void>) => {
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = markEnd(interactionName);
          recordComponentMetrics(`interaction-${interactionName}`, duration);
        });
      } else {
        const duration = markEnd(interactionName);
        recordComponentMetrics(`interaction-${interactionName}`, duration);
      }
    };

    return handleResult(callback());
  };

  return { measureInteraction };
}

/**
 * Hook for tracking lazy loading performance
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const imageRef = useRef<HTMLImageElement>(null);
 *   useLazyLoadMonitoring(imageRef, 'hero-image');
 * }
 * ```
 */
export function useLazyLoadMonitoring(
  ref: React.RefObject<HTMLElement>,
  elementName: string
): void {
  useEffect(() => {
    if (!ref.current || !('IntersectionObserver' in window)) {
      return;
    }

    const element = ref.current;
    markStart(`${elementName}-lazy-load`);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Element is now visible
            const duration = markEnd(`${elementName}-lazy-load`);
            recordComponentMetrics(`lazy-load-${elementName}`, duration);
            observer.unobserve(element);
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [ref, elementName]);
}

/**
 * Hook for tracking page visibility changes
 * Useful for understanding user engagement
 */
export function usePageVisibilityTracking(): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);

      if (!visible) {
        recordComponentMetrics('page-hidden', Date.now());
      } else {
        recordComponentMetrics('page-visible', Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * Hook for tracking list virtualization performance
 * Use when rendering long lists to monitor performance impact
 */
export function useVirtualizationPerformance(
  listName: string,
  itemCount: number
): void {
  useEffect(() => {
    recordComponentMetrics(`${listName}-item-count`, itemCount);
  }, [listName, itemCount]);

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      if (duration > 100) { // Only report if render took >100ms
        recordComponentMetrics(`${listName}-slow-render`, duration);
      }
    };
  }, [listName]);
}

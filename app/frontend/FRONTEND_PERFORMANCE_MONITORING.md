# Frontend Performance Monitoring Guide

This guide explains how to use the frontend performance monitoring system to track Core Web Vitals, API performance, and component render times.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Performance Library](#performance-library)
4. [React Hooks](#react-hooks)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)
7. [Metrics Dashboard](#metrics-dashboard)

## Overview

The frontend performance monitoring system consists of two main components:

1. **Performance Library** (`src/lib/performance.ts`): Core metrics collection
2. **Performance Hooks** (`src/hooks/usePerformanceMonitoring.ts`): React integration

### Tracked Metrics

#### Core Web Vitals
- **LCP (Largest Contentful Paint)**: Time to render the largest content element
  - Good: < 2.5s
  - Needs improvement: 2.5s - 4s
  - Poor: > 4s

- **FID (First Input Delay)**: Time from user interaction to browser processing
  - Good: < 100ms
  - Needs improvement: 100ms - 300ms
  - Poor: > 300ms

- **CLS (Cumulative Layout Shift)**: Visual stability score
  - Good: < 0.1
  - Needs improvement: 0.1 - 0.25
  - Poor: > 0.25

#### Additional Metrics
- **TTFB (Time to First Byte)**: Server response time
- **FCP (First Contentful Paint)**: Time to first visible content
- **DCL (DOMContentLoaded)**: DOM ready time
- **Load**: Window load event time

## Getting Started

### Automatic Initialization

The performance monitoring is automatically initialized in `App.tsx`:

```tsx
import { initializePerformanceMonitoring } from './lib/performance';

function App() {
  useEffect(() => {
    initializePerformanceMonitoring();
  }, []);

  // ...
}
```

This happens automatically on app startup, so you don't need to do anything for basic metrics collection.

## Performance Library

The `src/lib/performance.ts` library provides functions to manually track performance metrics.

### Core Functions

#### Initialize Monitoring
```typescript
import { initializePerformanceMonitoring } from './lib/performance';

// Called automatically in App.tsx
initializePerformanceMonitoring();
```

#### Record API Metrics
```typescript
import { recordApiMetrics } from './lib/performance';

// Track an API call
recordApiMetrics('/api/earnings', 'GET', 145, 200);
```

#### Record Component Metrics
```typescript
import { recordComponentMetrics } from './lib/performance';

// Track a component render
recordComponentMetrics('DashboardWidget', 52);
```

#### Flush Metrics
```typescript
import { flushMetrics } from './lib/performance';

// Manually send metrics to backend
await flushMetrics();
```

#### Custom Marks and Measures
```typescript
import { markStart, markEnd } from './lib/performance';

// Measure code execution time
markStart('data-processing');
// ... do work ...
const duration = markEnd('data-processing');
```

## React Hooks

### usePerformanceMonitoring

Tracks component render times automatically.

**Usage:**
```tsx
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

function MyComponent() {
  usePerformanceMonitoring('MyComponent');

  return <div>Content</div>;
}
```

### useAsyncPerformance

Measures async operations like API calls.

**Usage:**
```tsx
import { useAsyncPerformance } from '../hooks/usePerformanceMonitoring';

function DataFetcher() {
  const { measureAsync } = useAsyncPerformance();

  const handleFetch = async () => {
    const data = await measureAsync(
      'fetchUserData',
      () => fetch('/api/user').then(r => r.json())
    );
  };

  return <button onClick={handleFetch}>Fetch Data</button>;
}
```

### useApiPerformance

Dedicated hook for tracking API request performance.

**Usage:**
```tsx
import { useApiPerformance } from '../hooks/usePerformanceMonitoring';

function Dashboard() {
  const { trackApiCall } = useApiPerformance();

  useEffect(() => {
    trackApiCall('/api/earnings', async () => {
      const response = await fetch('/api/earnings');
      return response.json();
    });
  }, [trackApiCall]);

  return <div>Dashboard</div>;
}
```

### useMemoryMonitoring

Tracks memory usage changes to detect memory leaks.

**Usage:**
```tsx
import { useMemoryMonitoring } from '../hooks/usePerformanceMonitoring';

function HeavyComponent() {
  useMemoryMonitoring('HeavyComponent');

  return <div>Content</div>;
}
```

### useInteractionTiming

Measures user interactions like clicks.

**Usage:**
```tsx
import { useInteractionTiming } from '../hooks/usePerformanceMonitoring';

function Button() {
  const { measureInteraction } = useInteractionTiming();

  const handleClick = () => {
    measureInteraction('button-click', () => {
      // Handle click
    });
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

### useLazyLoadMonitoring

Tracks when elements become visible (lazy loading performance).

**Usage:**
```tsx
import { useLazyLoadMonitoring } from '../hooks/usePerformanceMonitoring';

function LazyImage() {
  const imageRef = useRef<HTMLImageElement>(null);
  useLazyLoadMonitoring(imageRef, 'hero-image');

  return <img ref={imageRef} src="..." />;
}
```

### usePageVisibilityTracking

Tracks when the page becomes visible/hidden.

**Usage:**
```tsx
import { usePageVisibilityTracking } from '../hooks/usePerformanceMonitoring';

function App() {
  const isVisible = usePageVisibilityTracking();

  return <div>Page is {isVisible ? 'visible' : 'hidden'}</div>;
}
```

### useVirtualizationPerformance

Monitors performance of virtualized lists.

**Usage:**
```tsx
import { useVirtualizationPerformance } from '../hooks/usePerformanceMonitoring';

function VirtualizedList({ items }) {
  useVirtualizationPerformance('earnings-list', items.length);

  return (
    <VirtualList items={items}>
      {/* Render items */}
    </VirtualList>
  );
}
```

## Usage Examples

### Example 1: Track API Integration

```tsx
import { useApiPerformance } from '../hooks/usePerformanceMonitoring';

function EarningsPage() {
  const { trackApiCall } = useApiPerformance();
  const [earnings, setEarnings] = useState([]);

  useEffect(() => {
    trackApiCall('/api/earnings', async () => {
      const response = await fetch('/api/earnings');
      const data = await response.json();
      setEarnings(data);
      return data;
    });
  }, [trackApiCall]);

  return (
    <div>
      {earnings.map(e => (
        <div key={e.id}>{e.amount}</div>
      ))}
    </div>
  );
}
```

### Example 2: Complex Data Processing

```tsx
import { useAsyncPerformance } from '../hooks/usePerformanceMonitoring';

function DataProcessor() {
  const { measureAsync } = useAsyncPerformance();

  const processData = async () => {
    const result = await measureAsync(
      'complexDataProcessing',
      async () => {
        const data = await fetch('/api/data').then(r => r.json());
        // Expensive processing
        return data.map(item => ({
          ...item,
          computed: expensiveComputation(item),
        }));
      }
    );
    return result;
  };

  return <button onClick={processData}>Process</button>;
}
```

### Example 3: Lazy Load Optimization

```tsx
import { useLazyLoadMonitoring } from '../hooks/usePerformanceMonitoring';

function ProductGrid({ products }) {
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductCard({ product }) {
  const imageRef = useRef<HTMLImageElement>(null);
  useLazyLoadMonitoring(imageRef, `product-${product.id}`);

  return (
    <div>
      <img ref={imageRef} src={product.image} />
      <h3>{product.name}</h3>
    </div>
  );
}
```

### Example 4: Monitor Large Lists

```tsx
import { useVirtualizationPerformance } from '../hooks/usePerformanceMonitoring';
import { FixedSizeList } from 'react-window';

function LargeList({ items }) {
  useVirtualizationPerformance('large-earnings-list', items.length);

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{items[index].description}</div>
      )}
    </FixedSizeList>
  );
}
```

## Best Practices

### 1. Use Appropriate Hooks

- **usePerformanceMonitoring**: For regular components
- **useAsyncPerformance**: For async operations
- **useApiPerformance**: For API calls
- **useMemoryMonitoring**: For components with potential memory leaks
- **useLazyLoadMonitoring**: For lazy-loaded images/content

### 2. Minimize Overhead

Performance monitoring itself shouldn't impact performance:

```tsx
// Good: Minimal overhead
function Component() {
  usePerformanceMonitoring('Component');
  return <div>Content</div>;
}

// Bad: Re-measuring on every render
function Component() {
  const start = performance.now();
  const duration = performance.now() - start; // Wrong!
  return <div>Content</div>;
}
```

### 3. Track Critical User Paths

Focus on tracking important user interactions and data flows:

```tsx
// Good: Track critical API
const { trackApiCall } = useApiPerformance();
trackApiCall('/api/earnings', fetchEarnings);

// Not necessary: Track every component
function MinorComponent() {
  usePerformanceMonitoring('MinorComponent'); // Overkill
  return <div>Minor content</div>;
}
```

### 4. Batch Metrics Collection

Metrics are automatically batched and sent every 30 seconds or when the batch reaches 10 items. Don't force flushes except on page unload:

```tsx
// Good: Let automatic flushing happen
recordApiMetrics('/api/data', 'GET', 100, 200);

// Bad: Force flush on every metric
recordApiMetrics('/api/data', 'GET', 100, 200);
flushMetrics(); // Unnecessary
```

### 5. Clean Up Properly

Use the hook cleanup to remove event listeners:

```tsx
useEffect(() => {
  const handleEvent = () => {
    measureInteraction('interaction', () => {
      // Handle
    });
  };

  element.addEventListener('click', handleEvent);

  return () => {
    element.removeEventListener('click', handleEvent);
  };
}, []);
```

## Metrics Dashboard

View collected metrics at: `http://localhost:3000/metrics` (when Grafana is running)

### Key Queries

**Request Rate:**
```
rate(http_requests_total[5m])
```

**Component Render Times:**
```
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))
```

**Slow Requests:**
```
rate(slow_requests_total[5m])
```

## Troubleshooting

### Metrics Not Appearing

1. Check browser console for errors
2. Verify `/api/v1/metrics` endpoint is accessible
3. Check network tab for metric POST requests
4. Ensure `initializePerformanceMonitoring()` is called

### High Memory Usage

1. Reduce BATCH_SIZE in performance.ts
2. Reduce FLUSH_INTERVAL
3. Don't track every single component

### Metrics Taking Too Long to Send

1. Increase FLUSH_INTERVAL
2. Reduce BATCH_SIZE
3. Check network connectivity

## Advanced Configuration

To customize metrics collection, edit `src/lib/performance.ts`:

```typescript
// Change batch size
const BATCH_SIZE = 20; // Default: 10

// Change flush interval (in milliseconds)
const FLUSH_INTERVAL = 60000; // Default: 30000 (30s)

// Change API endpoint
const METRICS_API_ENDPOINT = '/api/v2/metrics'; // Default: '/api/v1/metrics'

// Change timeout
const SEND_TIMEOUT = 10000; // Default: 5000 (5s)
```

## References

- [Web.dev Core Web Vitals](https://web.dev/vitals/)
- [PerformanceObserver API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

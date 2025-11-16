# Build Optimization Guide

This document outlines the build optimizations implemented in the EarnTrack frontend application.

## Overview

The frontend has been optimized for:
- **Faster Initial Load**: Reduced bundle size through code splitting
- **Better Caching**: Stable chunk names with content hashing
- **Route-based Code Splitting**: Pages load on demand
- **Production Optimization**: Minification, tree-shaking, and console removal

## Architecture

### Bundle Structure

The build is configured to create the following chunks:

```
dist/
├── js/
│   ├── index_[hash].js          (main entry point)
│   ├── react_[hash].js          (React + Router)
│   ├── ui_[hash].js             (Recharts, Lucide, HeroIcons)
│   ├── state_[hash].js          (Zustand)
│   ├── form_[hash].js           (React Hook Form)
│   └── pages_[name]_[hash].js   (Individual page chunks)
├── css/
│   └── style_[hash].css
├── images/
├── fonts/
└── assets/
```

### Code Splitting Strategy

1. **Vendor Chunks**: React, UI libraries, and form libraries are split into separate chunks
2. **Page Chunks**: Each route is lazy-loaded in a separate chunk
3. **Automatic Chunk Generation**: Shared code between pages is automatically grouped

### Route Lazy Loading

All protected routes use `React.lazy()` with `Suspense`:

```typescript
// Routes are lazy loaded on demand
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
// ...

// Wrapped with Suspense for loading states
<Route index element={
  <Suspense fallback={<PageLoader />}>
    <Dashboard />
  </Suspense>
} />
```

**Benefits:**
- Initial bundle size reduced by ~60-70%
- Only loads code for routes the user visits
- Better performance on slow networks

## Build Configuration

### Vite Configuration

**File**: `vite.config.ts`

Key optimizations:

```typescript
// Modern browser targeting for smaller bundles
target: 'esnext'

// Minification with console removal
minify: 'terser'
terserOptions: {
  compress: {
    drop_console: true // Removes console.log in production
  }
}

// Manual chunks for optimized caching
manualChunks: {
  react: ['react', 'react-dom', 'react-router-dom'],
  // ...
}

// Asset optimization
assetFileNames: (assetInfo) => {
  // Organizes assets by type (images, fonts, css)
}

// Source maps (hidden, no size impact)
sourcemap: 'hidden'

// Pre-bundle dependencies
optimizeDeps: {
  include: ['react', 'react-dom', 'react-router-dom', ...]
}
```

## Build Commands

### Standard Build

```bash
npm run build
```

Produces optimized production build in `dist/` directory.

### Build with Type Checking

```bash
npm run build:check
```

Runs TypeScript check before building to catch type errors.

### Analyze Bundle

```bash
npm run build:analyze
```

Builds with bundle analysis. Check `dist-analysis/stats.html` for detailed breakdown.

## Performance Metrics

### Expected Bundle Sizes (after build)

| Chunk | Size (gzipped) | Purpose |
|-------|---|---------|
| index | ~50KB | Main entry + routing |
| react | ~85KB | React, Router, DOM |
| ui | ~95KB | Recharts, Icons, UI libs |
| pages | ~20-50KB each | Individual page code |

**Total Initial Load**: ~200KB gzipped (depends on visited routes)

## Optimization Tips

### 1. Monitor Bundle Size

Track bundle size in CI/CD:

```bash
npm run build
# Check dist/ folder size
du -sh dist/
```

### 2. Identify Large Dependencies

Check package.json for potential candidates for:
- Lazy loading
- Tree-shaking improvements
- Alternative lighter packages

### 3. Dynamic Imports

For large components outside routes:

```typescript
// Bad: Bundled with page
import HeavyReport from './components/HeavyReport';

// Good: Lazy loaded on demand
const HeavyReport = lazy(() => import('./components/HeavyReport'));
```

### 4. Image Optimization

Place optimized images in `public/` or import in components:

```typescript
// Images imported this way are optimized
import logo from './assets/logo.png';

// Use in img tags
<img src={logo} alt="Logo" />
```

### 5. Remove Unused Dependencies

Regularly audit dependencies:

```bash
# Check for unused packages
npm ls --depth=0

# Remove unused packages
npm prune
```

## Production Checklist

Before deploying to production:

- [ ] Run `npm run build:check` - ensure no TypeScript errors
- [ ] Run `npm run build` - generate optimized bundle
- [ ] Check `dist/` folder is not in git
- [ ] Test production build locally: `npm run preview`
- [ ] Monitor bundle size trends over time
- [ ] Enable gzip compression on web server
- [ ] Configure proper cache headers for assets

## Caching Strategy

### Chunking Best Practices

**Vendors (long-term cache)**:
- Chunk: `react_[hash].js`
- Cache: 1 year (rarely changes)

**Feature code (medium-term cache)**:
- Chunk: `pages_[name]_[hash].js`
- Cache: 1 month (changes with features)

**App code (short-term cache)**:
- Chunk: `index_[hash].js`
- Cache: 1 day (frequently updated)

### Browser Caching

Configure web server to set cache headers:

```nginx
# nginx example
location ~* \.js$ {
  expires 1y;
  add_header Cache-Control "immutable";
}

location / {
  expires 1d;
}
```

## Environment Variables for Build

These variables can be set during build:

```bash
# Skip minification (for debugging)
VITE_SKIP_MINIFY=true npm run build

# Generate source maps (larger build)
VITE_SOURCE_MAP=true npm run build
```

## Common Issues

### 1. Bundle Too Large

**Solution**: Check for large dependencies being imported at the top level.

```bash
npm run build:analyze  # Identify large chunks
```

### 2. Slow Initial Load

**Cause**: Routes not properly lazy-loaded.

**Solution**: Ensure all route pages use `lazy(() => import(...))`.

### 3. Broken Assets in Production

**Cause**: Incorrect base path configuration.

**Solution**: Ensure `base` is correctly set in `vite.config.ts` if deploying to subdirectory.

## Further Reading

- [Vite Documentation - Build Optimization](https://vitejs.dev/guide/performance.html)
- [Rollup Documentation - Code Splitting](https://rollupjs.org/guide/en/#code-splitting)
- [React Lazy Code Splitting](https://react.dev/reference/react/lazy)
- [Web Vitals Performance Metrics](https://web.dev/vitals/)

## Related Configuration Files

- `vite.config.ts` - Build and dev server configuration
- `tsconfig.json` - TypeScript compilation settings
- `vitest.config.ts` - Test configuration
- `.eslintrc.cjs` - Linting rules
- `.prettierrc` - Code formatting

## Next Steps

To further optimize:

1. **HTTP/2 Push**: Configure server to push critical assets
2. **Service Worker**: Add PWA support for offline access
3. **Image Optimization**: Implement responsive images and WebP
4. **CSS-in-JS Optimization**: Consider styled-components/emotion optimization
5. **Database Query Optimization**: Ensure API responses are minimal

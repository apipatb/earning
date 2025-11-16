import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Target modern browsers with tree-shaking
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console statements in production
      },
    },
    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Vendor chunks
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['recharts', '@heroicons/react', 'lucide-react'],
          state: ['zustand'],
          form: ['react-hook-form'],

          // Feature chunks (lazy loaded by route)
          pages: [
            './src/pages/Dashboard',
            './src/pages/Platforms',
            './src/pages/Earnings',
            './src/pages/Expenses',
            './src/pages/Products',
            './src/pages/Sales',
            './src/pages/Inventory',
            './src/pages/Customers',
            './src/pages/Invoices',
            './src/pages/Goals',
            './src/pages/Budget',
            './src/pages/Analytics',
            './src/pages/Reports',
            './src/pages/TaxCalculator',
            './src/pages/TimeTracking',
            './src/pages/RecurringEarnings',
            './src/pages/ClientManagement',
            './src/pages/Settings',
          ],
        },
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk';
          return `js/[name]_${facadeModuleId}_[hash].js`;
        },
        entryFileNames: 'js/[name]_[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg|webp|ico/.test(ext)) {
            return `images/[name]_[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `fonts/[name]_[hash][extname]`;
          }
          if (ext === 'css') {
            return `css/[name]_[hash][extname]`;
          }
          return `assets/[name]_[hash][extname]`;
        },
      },
    },
    // Source maps for production debugging
    sourcemap: 'hidden',
    // Increase chunk size warning
    chunkSizeWarningLimit: 1000,
  },
  // Optimization for dev
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'react-hook-form',
      'axios',
    ],
  },
});

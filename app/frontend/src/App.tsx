import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useAuthStore } from './store/auth.store';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';
import {
  registerServiceWorker,
  setupInstallPrompt,
  setupOfflineDetection,
  onServiceWorkerUpdate,
  updateServiceWorker
} from './lib/pwa-utils';

// Auth pages (loaded eagerly for faster authentication)
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy-loaded protected pages for code splitting and better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Platforms = lazy(() => import('./pages/Platforms'));
const Earnings = lazy(() => import('./pages/Earnings'));
const Goals = lazy(() => import('./pages/Goals'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Reports = lazy(() => import('./pages/Reports'));
const Invoices = lazy(() => import('./pages/Invoices'));
const TaxCalculator = lazy(() => import('./pages/TaxCalculator'));
const RecurringEarnings = lazy(() => import('./pages/RecurringEarnings'));
const TimeTracking = lazy(() => import('./pages/TimeTracking'));
const ClientManagement = lazy(() => import('./pages/ClientManagement'));
const BudgetPlanning = lazy(() => import('./pages/BudgetPlanning'));
const Settings = lazy(() => import('./pages/Settings'));
const Products = lazy(() => import('./pages/Products'));
const Sales = lazy(() => import('./pages/Sales'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerSegmentation = lazy(() => import('./pages/CustomerSegmentation'));
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'));
const Expenses = lazy(() => import('./pages/Expenses'));
const MonitoringDashboard = lazy(() => import('./pages/MonitoringDashboard'));
const LiveChat = lazy(() => import('./pages/LiveChat'));
const NotFound = lazy(() => import('./pages/NotFound'));

/**
 * Loading fallback component shown while pages are being loaded
 */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
  </div>
);

function App() {
  const { token } = useAuthStore();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Initialize PWA features
    initializePWA();
  }, []);

  /**
   * Initialize Progressive Web App features
   */
  const initializePWA = async () => {
    // Register service worker
    const result = await registerServiceWorker();

    if (result.success && result.registration) {
      console.log('[App] Service Worker registered successfully');
      setRegistration(result.registration);

      // Listen for updates
      onServiceWorkerUpdate((reg) => {
        console.log('[App] Service Worker update available');
        setUpdateAvailable(true);
        setRegistration(reg);
      });
    } else {
      console.warn('[App] Service Worker registration failed:', result.error);
    }

    // Setup install prompt handling
    setupInstallPrompt();

    // Setup offline detection
    setupOfflineDetection();
  };

  /**
   * Handle update installation
   */
  const handleUpdate = () => {
    if (registration) {
      updateServiceWorker(registration);
      setUpdateAvailable(false);
    }
  };

  /**
   * Dismiss update notification
   */
  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  return (
    <ErrorBoundary>
      {/* Update Available Notification */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <div>
                <p className="font-semibold">New version available!</p>
                <p className="text-sm text-blue-100">
                  Update now to get the latest features and improvements.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={dismissUpdate}
                className="px-4 py-2 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      <OfflineIndicator
        position="bottom-right"
        showPendingCount={true}
        autoHideWhenOnline={true}
        autoHideDelay={3000}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt
        autoShow={true}
        showDelay={5000}
        dismissalDays={7}
      />

      <BrowserRouter>
        <Routes>
          {/* Public routes - loaded eagerly */}
          <Route
            path="/login"
            element={token ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/register"
            element={token ? <Navigate to="/" /> : <Register />}
          />

          {/* Protected routes - lazy loaded with Suspense */}
          <Route
            path="/"
            element={token ? <Layout /> : <Navigate to="/login" />}
          >
            <Route
              index
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="platforms"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Platforms />
                </Suspense>
              }
            />
            <Route
              path="earnings"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Earnings />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="products"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Products />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="sales"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Sales />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="inventory"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Inventory />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="customers"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Customers />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="customer-segmentation"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <CustomerSegmentation />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="customer-portal"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CustomerPortal />
                </Suspense>
              }
            />
            <Route
              path="expenses"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Expenses />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="monitoring"
              element={
                <Suspense fallback={<PageLoader />}>
                  <MonitoringDashboard />
                </Suspense>
              }
            />
            <Route
              path="live-chat"
              element={
                <Suspense fallback={<PageLoader />}>
                  <LiveChat />
                </Suspense>
              }
            />
            <Route
              path="recurring"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <RecurringEarnings />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="time-tracking"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <TimeTracking />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="clients"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <ClientManagement />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="goals"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Goals />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="budget"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <BudgetPlanning />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="analytics"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Analytics />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="reports"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Reports />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="invoices"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Invoices />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="tax-calculator"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <TaxCalculator />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="settings"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Settings />
                  </Suspense>
                </ErrorBoundary>
              }
            />
          </Route>

          {/* 404 Not Found - Catch all route */}
          <Route
            path="*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotFound />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

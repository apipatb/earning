import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuthStore } from './store/auth.store';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

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
const Expenses = lazy(() => import('./pages/Expenses'));
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

  return (
    <ErrorBoundary>
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
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
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
                <Suspense fallback={<PageLoader />}>
                  <Earnings />
                </Suspense>
              }
            />
            <Route
              path="products"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Products />
                </Suspense>
              }
            />
            <Route
              path="sales"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Sales />
                </Suspense>
              }
            />
            <Route
              path="inventory"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Inventory />
                </Suspense>
              }
            />
            <Route
              path="customers"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Customers />
                </Suspense>
              }
            />
            <Route
              path="expenses"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Expenses />
                </Suspense>
              }
            />
            <Route
              path="recurring"
              element={
                <Suspense fallback={<PageLoader />}>
                  <RecurringEarnings />
                </Suspense>
              }
            />
            <Route
              path="time-tracking"
              element={
                <Suspense fallback={<PageLoader />}>
                  <TimeTracking />
                </Suspense>
              }
            />
            <Route
              path="clients"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ClientManagement />
                </Suspense>
              }
            />
            <Route
              path="goals"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Goals />
                </Suspense>
              }
            />
            <Route
              path="budget"
              element={
                <Suspense fallback={<PageLoader />}>
                  <BudgetPlanning />
                </Suspense>
              }
            />
            <Route
              path="analytics"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Analytics />
                </Suspense>
              }
            />
            <Route
              path="reports"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Reports />
                </Suspense>
              }
            />
            <Route
              path="invoices"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Invoices />
                </Suspense>
              }
            />
            <Route
              path="tax-calculator"
              element={
                <Suspense fallback={<PageLoader />}>
                  <TaxCalculator />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Settings />
                </Suspense>
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

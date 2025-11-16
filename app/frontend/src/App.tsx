import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Platforms from './pages/Platforms';
import Earnings from './pages/Earnings';
import Goals from './pages/Goals';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import TaxCalculator from './pages/TaxCalculator';
import RecurringEarnings from './pages/RecurringEarnings';
import TimeTracking from './pages/TimeTracking';
import ClientManagement from './pages/ClientManagement';
import BudgetPlanning from './pages/BudgetPlanning';
import Settings from './pages/Settings';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const { token } = useAuthStore();

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={token ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/register"
            element={token ? <Navigate to="/" /> : <Register />}
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={token ? <Layout /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard />} />
            <Route path="platforms" element={<Platforms />} />
            <Route path="earnings" element={<Earnings />} />
            <Route path="products" element={<Products />} />
            <Route path="sales" element={<Sales />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="customers" element={<Customers />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="recurring" element={<RecurringEarnings />} />
            <Route path="time-tracking" element={<TimeTracking />} />
            <Route path="clients" element={<ClientManagement />} />
            <Route path="goals" element={<Goals />} />
            <Route path="budget" element={<BudgetPlanning />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="tax-calculator" element={<TaxCalculator />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 Not Found - Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

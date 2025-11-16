import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Layers, DollarSign, Target, BarChart3, FileText, Receipt, Calculator, RepeatIcon, Clock, Users, Wallet, Settings as SettingsIcon, LogOut, Moon, Sun, Languages, Package, ShoppingCart, TrendingDown, Briefcase } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { useCurrencyStore } from '../store/currency.store';
import { useI18nStore } from '../store/i18n.store';
import { SUPPORTED_CURRENCIES } from '../lib/currency';
import NotificationContainer from './NotificationContainer';
import QuickActionsMenu from './QuickActionsMenu';
import GlobalSearch from './GlobalSearch';
import KeyboardShortcutsGuide from './KeyboardShortcutsGuide';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { currency, setCurrency } = useCurrencyStore();
  const { language, setLanguage, t } = useI18nStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-2xl font-bold text-primary dark:text-blue-400">EarnTrack</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:block">{user?.email}</span>

              {/* Global Search */}
              <GlobalSearch />

              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'th')}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">🇬🇧 EN</option>
                <option value="th">🇹🇭 ไทย</option>
              </select>

              {/* Currency Selector */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code}
                  </option>
                ))}
              </select>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Side Navigation */}
        <aside className="w-64 pr-8">
          <nav className="space-y-1">
            <Link
              to="/"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard
            </Link>
            <Link
              to="/platforms"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/platforms')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Layers className="mr-3 h-5 w-5" />
              Platforms
            </Link>
            <Link
              to="/earnings"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/earnings')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <DollarSign className="mr-3 h-5 w-5" />
              Earnings
            </Link>
            <Link
              to="/products"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/products')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Package className="mr-3 h-5 w-5" />
              Products
            </Link>
            <Link
              to="/sales"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/sales')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ShoppingCart className="mr-3 h-5 w-5" />
              Sales
            </Link>
            <Link
              to="/inventory"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/inventory')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Package className="mr-3 h-5 w-5" />
              Inventory
            </Link>
            <Link
              to="/customers"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/customers')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Briefcase className="mr-3 h-5 w-5" />
              Customers
            </Link>
            <Link
              to="/expenses"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/expenses')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <TrendingDown className="mr-3 h-5 w-5" />
              Expenses
            </Link>
            <Link
              to="/recurring"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/recurring')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <RepeatIcon className="mr-3 h-5 w-5" />
              Recurring
            </Link>
            <Link
              to="/time-tracking"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/time-tracking')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Clock className="mr-3 h-5 w-5" />
              Time Tracking
            </Link>
            <Link
              to="/clients"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/clients')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="mr-3 h-5 w-5" />
              Clients
            </Link>
            <Link
              to="/goals"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/goals')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Target className="mr-3 h-5 w-5" />
              Goals
            </Link>
            <Link
              to="/budget"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/budget')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Wallet className="mr-3 h-5 w-5" />
              Budget
            </Link>
            <Link
              to="/analytics"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/analytics')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <BarChart3 className="mr-3 h-5 w-5" />
              Analytics
            </Link>
            <Link
              to="/reports"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/reports')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FileText className="mr-3 h-5 w-5" />
              Reports
            </Link>
            <Link
              to="/invoices"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/invoices')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Receipt className="mr-3 h-5 w-5" />
              Invoices
            </Link>
            <Link
              to="/tax-calculator"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/tax-calculator')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Calculator className="mr-3 h-5 w-5" />
              Tax Calculator
            </Link>
            <Link
              to="/settings"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/settings')
                  ? 'bg-primary text-white dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <SettingsIcon className="mr-3 h-5 w-5" />
              Settings
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {/* Quick Actions Menu */}
      <QuickActionsMenu />

      {/* Keyboard Shortcuts Guide */}
      <KeyboardShortcutsGuide />

      {/* Notification Container */}
      <NotificationContainer />
    </div>
  );
}

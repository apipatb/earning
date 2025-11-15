import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Layers, DollarSign, Target, BarChart3, FileText, LogOut, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { useCurrencyStore } from '../store/currency.store';
import { SUPPORTED_CURRENCIES } from '../lib/currency';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { currency, setCurrency } = useCurrencyStore();

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
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">{user?.email}</span>
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
              <button
                onClick={toggleDarkMode}
                className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
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
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

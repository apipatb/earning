import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Layers, DollarSign, BarChart3, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-2xl font-bold text-primary">EarnTrack</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
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
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard
            </Link>
            <Link
              to="/platforms"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/platforms')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Layers className="mr-3 h-5 w-5" />
              Platforms
            </Link>
            <Link
              to="/earnings"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/earnings')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <DollarSign className="mr-3 h-5 w-5" />
              Earnings
            </Link>
            <Link
              to="/analytics"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive('/analytics')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="mr-3 h-5 w-5" />
              Analytics
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

import { useEffect, useState } from 'react';
import { User, Mail, Phone, Building, MapPin, ShoppingBag, FileText, BarChart3 } from 'lucide-react';
import { notify } from '../store/notification.store';

interface CustomerProfile {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    totalPurchases: number;
    purchaseCount: number;
    lastPurchase: string | null;
  };
  profile: {
    preferences: Record<string, any>;
    subscribedTo: string[];
  };
}

interface CustomerStats {
  totalPurchases: number;
  purchaseCount: number;
  lastPurchase: string | null;
  ticketCount: number;
  openTickets: number;
  invoiceCount: number;
  unpaidInvoices: number;
}

export default function PortalProfile() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  // For demo purposes, using a mock customer ID
  // In production, this would come from authentication/session
  const customerId = 'demo-customer-id';

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // const profileResponse = await fetch(`/api/v1/customer/profile?customerId=${customerId}`);
      // const statsResponse = await fetch(`/api/v1/customer/stats?customerId=${customerId}`);

      // Mock data for demonstration
      setProfile({
        customer: {
          id: customerId,
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          company: 'Acme Corporation',
          totalPurchases: 15750.00,
          purchaseCount: 24,
          lastPurchase: new Date().toISOString(),
        },
        profile: {
          preferences: {},
          subscribedTo: ['invoices', 'tickets'],
        },
      });

      setStats({
        totalPurchases: 15750.00,
        purchaseCount: 24,
        lastPurchase: new Date().toISOString(),
        ticketCount: 12,
        openTickets: 2,
        invoiceCount: 18,
        unpaidInvoices: 1,
      });
    } catch (error) {
      notify.error('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No profile data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {profile.customer.name}!</h2>
        <p className="text-blue-100">Here's your account overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalPurchases.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ShoppingBag className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.openTickets}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.ticketCount} total tickets
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unpaidInvoices}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.invoiceCount} total invoices
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Order Count</p>
              <p className="text-2xl font-bold text-gray-900">{stats.purchaseCount}</p>
              <p className="text-xs text-gray-500 mt-1">
                Avg: ${(stats.totalPurchases / stats.purchaseCount).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ShoppingBag className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Full Name</p>
                <p className="text-base text-gray-900">{profile.customer.name}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Email Address</p>
                <p className="text-base text-gray-900">
                  {profile.customer.email || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Phone className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Phone Number</p>
                <p className="text-base text-gray-900">
                  {profile.customer.phone || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Building className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Company</p>
                <p className="text-base text-gray-900">
                  {profile.customer.company || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3 pb-4 border-b border-gray-100">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">
                  Last purchase made
                </p>
                <p className="text-xs text-gray-500">
                  {stats.lastPurchase
                    ? new Date(stats.lastPurchase).toLocaleDateString()
                    : 'No purchases yet'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 pb-4 border-b border-gray-100">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">
                  {stats.openTickets} support {stats.openTickets === 1 ? 'ticket' : 'tickets'} open
                </p>
                <p className="text-xs text-gray-500">View tickets in the Support tab</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">
                  {stats.unpaidInvoices} unpaid {stats.unpaidInvoices === 1 ? 'invoice' : 'invoices'}
                </p>
                <p className="text-xs text-gray-500">View invoices in the Invoices tab</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

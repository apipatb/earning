import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, DollarSign, Filter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface ReferralListProps {
  affiliateId: string;
}

interface Referral {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  commission: number;
  referredUser: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  subscriptionId: string | null;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
}

const statusConfig = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
  PAID: {
    label: 'Paid',
    icon: DollarSign,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

export default function ReferralList({ affiliateId }: ReferralListProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    loadReferrals();
  }, [affiliateId, statusFilter]);

  const loadReferrals = async () => {
    try {
      const url = new URL('/api/v1/affiliates/referrals', window.location.origin);
      if (statusFilter) {
        url.searchParams.append('status', statusFilter);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReferrals(data.referrals);
        calculateStats(data.referrals);
      }
    } catch (error) {
      console.error('Failed to load referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (referralsList: Referral[]) => {
    const stats = {
      total: referralsList.length,
      pending: referralsList.filter((r) => r.status === 'PENDING').length,
      approved: referralsList.filter((r) => r.status === 'APPROVED').length,
      rejected: referralsList.filter((r) => r.status === 'REJECTED').length,
      paid: referralsList.filter((r) => r.status === 'PAID').length,
      totalCommission: referralsList.reduce((sum, r) => sum + r.commission, 0),
    };
    setStats(stats);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading referrals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.pending}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.approved}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.paid}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Commission</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${stats.totalCommission.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">Filters</span>
            {statusFilter && (
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-xs">
                {statusFilter}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-5 w-5 text-gray-400 transition-transform ${
              showFilters ? 'transform rotate-180' : ''
            }`}
          />
        </button>

        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                statusFilter === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {Object.entries(statusConfig).map(([status, config]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Referrals List */}
      {referrals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {statusFilter
              ? `No ${statusFilter.toLowerCase()} referrals found`
              : 'No referrals yet. Share your affiliate link to start earning!'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Referred
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {referrals.map((referral) => {
                  const config = statusConfig[referral.status];
                  const StatusIcon = config.icon;

                  return (
                    <tr key={referral.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {referral.referredUser.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {referral.referredUser.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${referral.commission.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(referral.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {referral.paidAt
                          ? format(new Date(referral.paidAt), 'MMM d, yyyy')
                          : referral.approvedAt
                          ? format(new Date(referral.approvedAt), 'MMM d, yyyy')
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

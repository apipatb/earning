import { useEffect, useState } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Link,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import AffiliateStats from '../components/AffiliateStats';
import LinkGenerator from '../components/LinkGenerator';
import ReferralList from '../components/ReferralList';
import WithdrawalRequest from '../components/WithdrawalRequest';

interface AffiliateProgram {
  id: string;
  code: string;
  commissionRate: number;
  totalReferred: number;
  totalEarnings: number;
  tier: number;
  isActive: boolean;
  createdAt: string;
  stats: {
    totalReferrals: number;
    totalLinks: number;
    totalWithdrawals: number;
  };
}

interface DashboardStats {
  overview: {
    totalEarnings: number;
    availableBalance: number;
    totalWithdrawn: number;
    pendingWithdrawals: number;
    totalReferred: number;
    commissionRate: number;
    tier: number;
  };
  referrals: {
    pending: number;
    approved: number;
    rejected: number;
    paid: number;
  };
  topLinks: Array<{
    id: string;
    campaign: string | null;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
}

export default function AffiliateDashboard() {
  const [program, setProgram] = useState<AffiliateProgram | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'referrals' | 'withdrawals'>('overview');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await fetch('/api/v1/affiliates/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.status === 404) {
        // Not enrolled yet
        setProgram(null);
        setStats(null);
      } else if (response.ok) {
        const data = await response.json();
        setProgram(data.program);
        setStats(data.stats);
      } else {
        throw new Error('Failed to load affiliate dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      const response = await fetch('/api/v1/affiliates/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to enroll in affiliate program');
      }

      // Reload dashboard
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setIsEnrolling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You might want to show a toast notification here
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Not enrolled view
  if (!program) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Join Our Affiliate Program
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Earn commissions by referring new users to EarnTrack. Get 10% commission on all referral
              subscriptions with multi-tier rewards and automated payouts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">10% Commission</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Earn on every subscription
              </p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Tier Upgrades</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Higher rates as you grow
              </p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Auto Payouts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fast and secure payments
              </p>
            </div>
          </div>

          <button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Affiliate Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your referrals and earnings
          </p>
        </div>
        {program.isActive ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Active
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 rounded-full text-sm font-medium">
            <Clock className="h-4 w-4" />
            Inactive
          </div>
        )}
      </div>

      {/* Affiliate Code Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm font-medium mb-1">Your Affiliate Code</p>
            <p className="text-3xl font-bold tracking-wider">{program.code}</p>
          </div>
          <button
            onClick={() => copyToClipboard(program.code)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            Copy Code
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-sm text-indigo-100">
            Share your referral link:{' '}
            <code className="bg-white/20 px-2 py-1 rounded text-xs">
              {`${window.location.origin}/signup?ref=${program.code}`}
            </code>
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && <AffiliateStats stats={stats} />}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'links', label: 'Links', icon: Link },
            { id: 'referrals', label: 'Referrals', icon: Users },
            { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Links */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Performing Links
              </h3>
              {stats.topLinks.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No links created yet. Create your first affiliate link!
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.topLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {link.campaign || 'Untitled Campaign'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {link.clicks} clicks, {link.conversions} conversions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                          {link.conversionRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">conversion rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referral Status Breakdown */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Referral Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Pending</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.referrals.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Approved</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.referrals.approved}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Paid</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.referrals.paid}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Rejected</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.referrals.rejected}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && <LinkGenerator affiliateId={program.id} />}

        {activeTab === 'referrals' && <ReferralList affiliateId={program.id} />}

        {activeTab === 'withdrawals' && stats && (
          <WithdrawalRequest
            affiliateId={program.id}
            availableBalance={stats.overview.availableBalance}
          />
        )}
      </div>
    </div>
  );
}

import { DollarSign, Users, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsProps {
  stats: {
    overview: {
      totalEarnings: number;
      availableBalance: number;
      totalWithdrawn: number;
      pendingWithdrawals: number;
      totalReferred: number;
      commissionRate: number;
      tier: number;
    };
  };
}

export default function AffiliateStats({ stats }: StatsProps) {
  const { overview } = stats;

  const statsCards = [
    {
      label: 'Total Earnings',
      value: `$${overview.totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      lightBg: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      change: null,
    },
    {
      label: 'Available Balance',
      value: `$${overview.availableBalance.toFixed(2)}`,
      icon: Wallet,
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      change: null,
    },
    {
      label: 'Total Withdrawn',
      value: `$${overview.totalWithdrawn.toFixed(2)}`,
      icon: ArrowDownRight,
      color: 'bg-purple-500',
      lightBg: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      change: null,
    },
    {
      label: 'Pending Withdrawals',
      value: `$${overview.pendingWithdrawals.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-yellow-500',
      lightBg: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      change: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.lightBg} p-3 rounded-lg`}>
                <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
              </div>
              {stat.change && (
                <span
                  className={`flex items-center text-sm font-medium ${
                    stat.change > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {stat.change > 0 ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(stat.change)}%
                </span>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Referrals</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {overview.totalReferred}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Commission Rate</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {overview.commissionRate}%
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-5 w-5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded flex items-center justify-center text-white text-xs font-bold">
              T{overview.tier}
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Tier</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">Tier {overview.tier}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {overview.tier < 3 ? 'Refer more to unlock higher tiers' : 'Maximum tier achieved!'}
          </p>
        </div>
      </div>

      {/* Tier Progress */}
      {overview.tier < 3 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Tier {overview.tier + 1} Progress
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Unlock {overview.tier === 1 ? '12%' : '15%'} commission rate with{' '}
                {overview.tier === 1 ? '25' : '50'} referrals
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {overview.totalReferred}/{overview.tier === 1 ? 25 : 50}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  (overview.totalReferred / (overview.tier === 1 ? 25 : 50)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

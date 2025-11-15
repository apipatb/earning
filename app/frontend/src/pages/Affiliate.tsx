import React, { useState } from 'react';
import { Copy, Share2, TrendingUp, DollarSign, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface AffiliateStats {
  referralCode: string;
  referralLink: string;
  totalClicks: number;
  totalConversions: number;
  conversionRate: string;
  totalEarnings: number;
  tier: string;
}

export const Affiliate: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['affiliateStats'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/affiliate/stats');
      return response.data;
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['affiliateLeaderboard'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/affiliate/leaderboard');
      return response.data;
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">EarnTrack Affiliate Program</h1>
          <p className="text-xl text-slate-300">
            Earn 20-30% commission for every referral that upgrades to a paid plan
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Referral Link */}
          <div className="md:col-span-2 bg-slate-700/50 rounded-lg p-8 border border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-6">Your Referral Link</h2>

            <div className="bg-slate-600/50 p-4 rounded-lg mb-4 flex items-center justify-between">
              <code className="text-blue-400 font-mono break-all flex-1">
                {stats?.referralLink || 'Loading...'}
              </code>
              <button
                onClick={() => copyToClipboard(stats?.referralLink)}
                className="ml-4 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {copied && (
              <p className="text-green-400 text-sm">✓ Copied to clipboard!</p>
            )}

            {/* Commission Rates */}
            <div className="mt-6 pt-6 border-t border-slate-600">
              <h3 className="font-semibold text-white mb-4">Commission Structure</h3>
              <div className="space-y-2 text-slate-300">
                <p className="flex justify-between">
                  <span>Free → Pro:</span>
                  <span className="text-yellow-400 font-bold">20%</span>
                </p>
                <p className="flex justify-between">
                  <span>Free → Business:</span>
                  <span className="text-yellow-400 font-bold">30%</span>
                </p>
                <p className="flex justify-between">
                  <span>Monthly Recurring:</span>
                  <span className="text-yellow-400 font-bold">10%</span>
                </p>
              </div>
            </div>
          </div>

          {/* Current Tier */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Current Tier</h3>
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <p className="text-4xl font-bold text-white capitalize mb-4">
              {stats?.tier || 'bronze'}
            </p>
            <p className="text-blue-100">Upgrade your tier by referring more users</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
            <p className="text-slate-400 mb-2">Total Clicks</p>
            <p className="text-3xl font-bold text-white">{stats?.totalClicks || 0}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
            <p className="text-slate-400 mb-2">Conversions</p>
            <p className="text-3xl font-bold text-green-400">{stats?.totalConversions || 0}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
            <p className="text-slate-400 mb-2">Conversion Rate</p>
            <p className="text-3xl font-bold text-blue-400">{stats?.conversionRate || '0'}%</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-slate-400 text-sm">Total Earnings</p>
                <p className="text-2xl font-bold text-yellow-400">
                  ${stats?.totalEarnings || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Marketing Resources</h2>

          <div className="space-y-6">
            {/* Email Template */}
            <div>
              <h3 className="font-semibold text-white mb-3">Email Template</h3>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Copy Email Text
              </button>
            </div>

            {/* Social Post */}
            <div>
              <h3 className="font-semibold text-white mb-3">Social Media Posts</h3>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Get Social Posts
              </button>
            </div>

            {/* Banner */}
            <div>
              <h3 className="font-semibold text-white mb-3">Website Banners</h3>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Download Banners
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600">
          <h2 className="text-2xl font-bold text-white mb-6">Top Affiliates</h2>

          <div className="space-y-4">
            {leaderboard?.map((affiliate: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-600/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-yellow-400">#{index + 1}</span>
                  <div>
                    <p className="font-semibold text-white">{affiliate.name}</p>
                    <p className="text-sm text-slate-400">{affiliate.referralCode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">
                    ${affiliate.earnings.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400 capitalize">{affiliate.tier}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Affiliate;

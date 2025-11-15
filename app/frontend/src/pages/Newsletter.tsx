import React, { useState } from 'react';
import { Mail, CheckCircle, Bell, Zap } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface EmailSettings {
  weeklyNewsletter: boolean;
  goalReminders: boolean;
  platformUpdates: boolean;
  promotions: boolean;
}

export const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['emailSettings'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/v1/emails/settings');
        return response.data;
      } catch {
        return null;
      }
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/v1/emails/subscribe', {
        email,
        name: name || 'Subscriber',
      });
      return response.data;
    },
    onSuccess: () => {
      setSubscribed(true);
      setEmail('');
      setName('');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<EmailSettings>) => {
      const response = await axios.put('/api/v1/emails/settings', newSettings);
      return response.data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Newsletter & Email Settings</h1>
          <p className="text-xl text-slate-300">
            Stay updated with tips, earnings insights, and exclusive resources
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Subscribe Box */}
          <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-6">Join Our Newsletter</h2>

            {subscribed ? (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-green-200 font-semibold">
                  ✓ Successfully subscribed!
                </p>
                <p className="text-green-300 text-sm mt-2">
                  Check your email for confirmation
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                subscribeMutation.mutate();
              }} className="space-y-4">
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-600 text-white placeholder-slate-400 border border-slate-500"
                />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-600 text-white placeholder-slate-400 border border-slate-500"
                />
                <button
                  type="submit"
                  disabled={subscribeMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe Now'}
                </button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-slate-600 space-y-3">
              <h3 className="font-semibold text-white">What you'll get:</h3>
              <div className="space-y-2 text-slate-300">
                <p className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Weekly earnings tips
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Platform insights
                </p>
                <p className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-green-400" />
                  Exclusive resources
                </p>
              </div>
            </div>
          </div>

          {/* Email Preferences */}
          <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-6">Email Preferences</h2>

            {isLoading ? (
              <div className="text-slate-400">Loading...</div>
            ) : (
              <div className="space-y-4">
                {/* Weekly Newsletter Toggle */}
                <label className="flex items-center p-4 bg-slate-600/50 rounded-lg cursor-pointer hover:bg-slate-600">
                  <input
                    type="checkbox"
                    checked={settings?.weeklyNewsletter ?? true}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        weeklyNewsletter: e.target.checked,
                      });
                    }}
                    className="w-5 h-5 rounded"
                  />
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-white">Weekly Newsletter</p>
                    <p className="text-sm text-slate-400">Your earnings summary and insights</p>
                  </div>
                </label>

                {/* Goal Reminders Toggle */}
                <label className="flex items-center p-4 bg-slate-600/50 rounded-lg cursor-pointer hover:bg-slate-600">
                  <input
                    type="checkbox"
                    checked={settings?.goalReminders ?? true}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        goalReminders: e.target.checked,
                      });
                    }}
                    className="w-5 h-5 rounded"
                  />
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-white">Goal Reminders</p>
                    <p className="text-sm text-slate-400">Reminders to work on your goals</p>
                  </div>
                </label>

                {/* Platform Updates Toggle */}
                <label className="flex items-center p-4 bg-slate-600/50 rounded-lg cursor-pointer hover:bg-slate-600">
                  <input
                    type="checkbox"
                    checked={settings?.platformUpdates ?? true}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        platformUpdates: e.target.checked,
                      });
                    }}
                    className="w-5 h-5 rounded"
                  />
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-white">Platform Updates</p>
                    <p className="text-sm text-slate-400">News about your platforms</p>
                  </div>
                </label>

                {/* Promotions Toggle */}
                <label className="flex items-center p-4 bg-slate-600/50 rounded-lg cursor-pointer hover:bg-slate-600">
                  <input
                    type="checkbox"
                    checked={settings?.promotions ?? false}
                    onChange={(e) => {
                      updateSettingsMutation.mutate({
                        promotions: e.target.checked,
                      });
                    }}
                    className="w-5 h-5 rounded"
                  />
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-white">Promotions & Offers</p>
                    <p className="text-sm text-slate-400">Deals and special offers</p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-8 bg-slate-700/50 rounded-lg p-8 border border-slate-600">
          <h2 className="text-2xl font-bold text-white mb-6">Newsletter Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">12K+</p>
              <p className="text-slate-300 text-sm">Subscribers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">45%</p>
              <p className="text-slate-300 text-sm">Open Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-400">8.2%</p>
              <p className="text-slate-300 text-sm">Click Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">Weekly</p>
              <p className="text-slate-300 text-sm">Frequency</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Newsletter;

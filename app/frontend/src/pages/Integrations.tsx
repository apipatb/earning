import React, { useState } from 'react';
import { Plug, Plus, Trash2, Zap, Check } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

interface Integration {
  id: string;
  name: string;
  icon: string;
  tier: string;
  description: string;
}

interface ConnectedIntegration {
  integrationId: string;
  isConnected: boolean;
  name: string;
  lastSyncAt?: string;
}

export const Integrations: React.FC = () => {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState('');

  // Get available integrations
  const { data: available } = useQuery({
    queryKey: ['availableIntegrations'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/integrations/available');
      return response.data;
    },
  });

  // Get user integrations
  const { data: connected, refetch } = useQuery({
    queryKey: ['userIntegrations'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/integrations/list');
      return response.data;
    },
  });

  // Get stats
  const { data: stats } = useQuery({
    queryKey: ['integrationStats'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/integrations/stats');
      return response.data;
    },
  });

  // Connect integration mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/v1/integrations/connect', {
        integrationId: selectedIntegration,
        accessToken,
      });
      return response.data;
    },
    onSuccess: () => {
      setAccessToken('');
      setSelectedIntegration(null);
      refetch();
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await axios.delete(`/api/v1/integrations/${integrationId}`);
      return response.data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const isConnected = (id: string) => connected?.some((int: ConnectedIntegration) => int.integrationId === id && int.isConnected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Integrations & Automations</h1>
          <p className="text-xl text-slate-300">
            Connect to your favorite tools and automate workflows
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600 text-center">
            <p className="text-slate-400 mb-2">Connected</p>
            <p className="text-3xl font-bold text-blue-400">{stats?.connectedCount || 0}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600 text-center">
            <p className="text-slate-400 mb-2">Automations</p>
            <p className="text-3xl font-bold text-green-400">{stats?.automationCount || 0}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600 text-center">
            <p className="text-slate-400 mb-2">Active</p>
            <p className="text-3xl font-bold text-yellow-400">{stats?.activeAutomations || 0}</p>
          </div>
        </div>

        {/* Available Integrations */}
        <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Plug className="w-6 h-6" />
            Available Integrations
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {available?.map((int: Integration) => (
              <div
                key={int.id}
                className={`p-6 rounded-lg border-2 transition-all ${
                  isConnected(int.id)
                    ? 'bg-green-500/10 border-green-500'
                    : 'bg-slate-600/50 border-slate-500 hover:border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Placeholder icon */}
                    <Plug className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="font-semibold text-white">{int.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{int.tier}</p>
                    </div>
                  </div>
                  {isConnected(int.id) && <Check className="w-5 h-5 text-green-400" />}
                </div>

                <p className="text-sm text-slate-300 mb-4">{int.description}</p>

                {isConnected(int.id) ? (
                  <button
                    onClick={() => disconnectMutation.mutate(int.id)}
                    disabled={disconnectMutation.isPending}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedIntegration(int.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connection Modal */}
        {selectedIntegration && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full border border-slate-600">
              <h3 className="text-2xl font-bold text-white mb-6">
                Connect {available?.find((int: Integration) => int.id === selectedIntegration)?.name}
              </h3>

              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Access Token / API Key"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-600 text-white placeholder-slate-400"
                />

                <p className="text-sm text-slate-400">
                  Find your API key in the integration's settings. It will be encrypted and securely stored.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedIntegration(null)}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => connectMutation.mutate()}
                    disabled={!accessToken || connectMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg disabled:opacity-50"
                  >
                    {connectMutation.isPending ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Start */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Automation Examples
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-black/20 p-4 rounded-lg">
              <p className="font-semibold text-white mb-2">📈 Daily Slack Summary</p>
              <p className="text-purple-100 text-sm">
                Get your daily earnings summary sent to Slack every morning
              </p>
            </div>

            <div className="bg-black/20 p-4 rounded-lg">
              <p className="font-semibold text-white mb-2">📊 Google Sheets Sync</p>
              <p className="text-purple-100 text-sm">
                Auto-sync earnings to a spreadsheet for further analysis
              </p>
            </div>

            <div className="bg-black/20 p-4 rounded-lg">
              <p className="font-semibold text-white mb-2">🎉 Discord Milestones</p>
              <p className="text-purple-100 text-sm">
                Celebrate milestones with notifications in your Discord server
              </p>
            </div>

            <div className="bg-black/20 p-4 rounded-lg">
              <p className="font-semibold text-white mb-2">📱 Telegram Alerts</p>
              <p className="text-purple-100 text-sm">
                Instant earnings alerts directly to your Telegram bot
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;

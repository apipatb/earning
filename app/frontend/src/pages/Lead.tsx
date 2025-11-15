import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  BarChart3,
} from 'lucide-react';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiating' | 'won' | 'lost';
  score: number;
  createdAt: string;
}

interface LeadAnalytics {
  period: number;
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  lostLeads: number;
  avgLeadScore: number;
  conversionRate: number;
  activeLeads: number;
}

interface SalesPipeline {
  [key: string]: {
    count: number;
    averageScore: number;
  };
}

const Lead: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [pipeline, setPipeline] = useState<SalesPipeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pipeline' || activeTab === 'leads') {
        const res = await apiClient.get('/leads/leads');
        setLeads(res.data);
      }
      if (activeTab === 'pipeline') {
        const pipelineRes = await apiClient.get('/leads/pipeline');
        setPipeline(pipelineRes.data);
      }
      if (activeTab === 'analytics') {
        const analyticsRes = await apiClient.get('/leads/analytics');
        setAnalytics(analyticsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (formData: any) => {
    try {
      await apiClient.post('/leads/leads', formData);
      setShowCreateLead(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create lead:', error);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      await apiClient.put(`/leads/leads/${leadId}/status`, { status: newStatus });
      fetchAllData();
    } catch (error) {
      console.error('Failed to update lead status:', error);
    }
  };

  const handleConvertLead = async (lead: Lead) => {
    try {
      await apiClient.post(`/leads/leads/${lead.id}/convert`, {
        clientName: `${lead.firstName} ${lead.lastName}`,
        email: lead.email,
        phone: lead.phone,
      });
      fetchAllData();
    } catch (error) {
      console.error('Failed to convert lead:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-purple-100 text-purple-800';
      case 'qualified':
        return 'bg-yellow-100 text-yellow-800';
      case 'proposal':
        return 'bg-orange-100 text-orange-800';
      case 'negotiating':
        return 'bg-pink-100 text-pink-800';
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const statusOrder = [
    'new',
    'contacted',
    'qualified',
    'proposal',
    'negotiating',
    'won',
    'lost',
  ];

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSource = filterSource === 'all' || lead.source === filterSource;
    return matchesSearch && matchesStatus && matchesSource;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Lead Management & CRM</h1>
          <p className="text-slate-400">Track leads through your sales pipeline</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'pipeline'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="inline mr-2 w-5 h-5" />
            Sales Pipeline
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'leads'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="inline mr-2 w-5 h-5" />
            All Leads
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="inline mr-2 w-5 h-5" />
            Analytics
          </button>
        </div>

        {/* Sales Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            {/* Pipeline Stats */}
            {pipeline && (
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {statusOrder.map((status) => {
                  const data = pipeline[status];
                  return (
                    <div
                      key={status}
                      className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700/50 transition"
                    >
                      <p className="text-xs text-slate-400 mb-2 capitalize font-semibold">
                        {status}
                      </p>
                      <p className="text-2xl font-bold text-white mb-2">{data?.count || 0}</p>
                      <p className="text-xs text-slate-500">
                        Avg Score: {(data?.averageScore || 0).toFixed(0)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pipeline Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statusOrder.slice(0, 7).map((status) => (
                <div key={status} className="bg-slate-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white capitalize">{status}</h3>
                    <span className="bg-slate-700 text-slate-200 px-3 py-1 rounded-full text-sm">
                      {filteredLeads.filter((l) => l.status === status).length}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredLeads
                      .filter((l) => l.status === status)
                      .map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-white">
                                {lead.firstName} {lead.lastName}
                              </p>
                              <p className="text-xs text-slate-400">{lead.company}</p>
                            </div>
                            <div
                              className={`text-lg font-bold ${getScoreColor(lead.score)}`}
                            >
                              {lead.score}
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 mb-3">{lead.email}</p>
                          <div className="flex gap-2">
                            {status === 'negotiating' && (
                              <button
                                onClick={() => handleConvertLead(lead)}
                                className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition"
                              >
                                Convert
                              </button>
                            )}
                            {status !== 'won' && status !== 'lost' && (
                              <select
                                value={status}
                                onChange={(e) =>
                                  handleUpdateLeadStatus(lead.id, e.target.value)
                                }
                                className="flex-1 text-xs bg-slate-600 text-white px-2 py-1 rounded outline-none"
                              >
                                {statusOrder.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setShowCreateLead(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                New Lead
              </button>
              <div className="flex gap-2 flex-1 min-w-[300px]">
                <div className="flex items-center bg-slate-700 rounded-lg px-4 flex-1">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent text-white placeholder-slate-400 outline-none ml-2 w-full"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-700 text-white px-4 rounded-lg outline-none"
                >
                  <option value="all">All Status</option>
                  {statusOrder.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="bg-slate-700 text-white px-4 rounded-lg outline-none"
                >
                  <option value="all">All Sources</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="email">Email</option>
                  <option value="event">Event</option>
                  <option value="social">Social</option>
                </select>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                      Company
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                      Source
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {lead.firstName} {lead.lastName}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{lead.company || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{lead.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-400 capitalize">
                          {lead.source}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-bold ${getScoreColor(lead.score)}`}>
                          {lead.score}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No leads found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analytics ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-80">Total Leads</p>
                    <p className="text-3xl font-bold">{analytics.totalLeads}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-80">Won Leads</p>
                    <p className="text-3xl font-bold">{analytics.wonLeads}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-80">Conversion Rate</p>
                    <p className="text-3xl font-bold">{analytics.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-80">Avg Lead Score</p>
                    <p className="text-3xl font-bold">
                      {analytics.avgLeadScore.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* More Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-slate-400">Active Leads</p>
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.activeLeads}</p>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-slate-400">New This Period</p>
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.newLeads}</p>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-slate-400">Lost Leads</p>
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.lostLeads}</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Lead Status Breakdown</h3>
                  <div className="space-y-3">
                    {statusOrder.map((status) => {
                      const count = filteredLeads.filter((l) => l.status === status).length;
                      const percentage =
                        analytics.totalLeads > 0
                          ? ((count / analytics.totalLeads) * 100).toFixed(0)
                          : 0;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-slate-300 capitalize">{status}</span>
                          <div className="flex items-center gap-4">
                            <div className="bg-slate-700 rounded-full h-2 w-40">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-slate-400 text-sm w-12 text-right">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 py-12">
                {loading ? 'Loading analytics...' : 'No analytics data available'}
              </div>
            )}
          </div>
        )}

        {/* Create Lead Modal */}
        {showCreateLead && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Lead</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateLead({
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    company: formData.get('company'),
                    jobTitle: formData.get('jobTitle'),
                    source: formData.get('source'),
                    score: parseInt(formData.get('score') as string) || 0,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    required
                    className="bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    required
                    className="bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                  />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone (optional)"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <input
                  type="text"
                  name="company"
                  placeholder="Company (optional)"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <input
                  type="text"
                  name="jobTitle"
                  placeholder="Job Title (optional)"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <select
                  name="source"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                >
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="email">Email</option>
                  <option value="event">Event</option>
                  <option value="social">Social Media</option>
                </select>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Lead Score (0-100)</label>
                  <input
                    type="number"
                    name="score"
                    placeholder="0-100"
                    min="0"
                    max="100"
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateLead(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lead;

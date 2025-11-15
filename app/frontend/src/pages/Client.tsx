import React, { useState, useEffect } from 'react';
import { Users, Plus, MessageSquare, FileText, TrendingUp, Settings } from 'lucide-react';

interface Client {
  id: string;
  clientName: string;
  email: string;
  phone?: string;
  city?: string;
  industry?: string;
  status: string;
  createdAt: string;
}

interface Vendor {
  id: string;
  vendorName: string;
  email: string;
  category: string;
  status: string;
}

interface Contract {
  id: string;
  contractName: string;
  clientId: string;
  value: number;
  status: string;
  startDate: string;
  endDate: string;
}

interface ClientAnalytics {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalProjectValue: number;
  avgProjectValue: number;
}

export default function Client() {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    industry: 'other',
    companySize: '',
    website: '',
  });

  useEffect(() => {
    fetchClients();
    fetchAnalytics();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/clients/clients', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/v1/clients/vendors', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/v1/clients/contracts', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setContracts(data);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/clients/analytics', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const createClient = async () => {
    try {
      const response = await fetch('/api/v1/clients/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          clientName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          industry: 'other',
          companySize: '',
          website: '',
        });
        fetchClients();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Failed to create client:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Client Management
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Client
        </button>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Clients</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.totalClients}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Active Clients</p>
            <p className="text-2xl font-bold text-green-600">{analytics.activeClients}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Project Value</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${analytics.totalProjectValue.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Avg Project Value</p>
            <p className="text-2xl font-bold text-blue-600">
              ${analytics.avgProjectValue.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-8 px-6">
            <button
              onClick={() => {
                setActiveTab('clients');
                fetchClients();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'clients'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Clients
            </button>
            <button
              onClick={() => {
                setActiveTab('vendors');
                fetchVendors();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'vendors'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Vendors
            </button>
            <button
              onClick={() => {
                setActiveTab('contracts');
                fetchContracts();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'contracts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Contracts
            </button>
            <button
              onClick={() => {
                setActiveTab('analytics');
                fetchAnalytics();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Clients ({clients.length})
              </h3>
              {loading ? (
                <p className="text-gray-500">Loading clients...</p>
              ) : clients.length === 0 ? (
                <p className="text-gray-500">No clients yet. Create your first client!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Client Name
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Industry
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          City
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr
                          key={client.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                            {client.clientName}
                          </td>
                          <td className="py-3 px-4">{client.email}</td>
                          <td className="py-3 px-4">{client.industry || 'N/A'}</td>
                          <td className="py-3 px-4">{client.city || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                client.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {client.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vendors' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Vendors ({vendors.length})
              </h3>
              {vendors.length === 0 ? (
                <p className="text-gray-500">No vendors yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {vendor.vendorName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{vendor.email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {vendor.category}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                          vendor.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Contracts ({contracts.length})
              </h3>
              {contracts.length === 0 ? (
                <p className="text-gray-500">No contracts yet.</p>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {contract.contractName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(contract.startDate).toLocaleDateString()} -{' '}
                          {new Date(contract.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          ${contract.value.toFixed(2)}
                        </p>
                        <span
                          className={`text-xs font-medium ${
                            contract.status === 'active'
                              ? 'text-green-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {contract.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Client Analytics
              </h3>
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Client Status</p>
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Active</span>
                          <span className="font-medium">{analytics.activeClients}</span>
                        </div>
                        <div className="w-full bg-gray-300 rounded h-2">
                          <div
                            className="bg-green-500 h-2 rounded"
                            style={{
                              width: `${
                                analytics.totalClients > 0
                                  ? (analytics.activeClients / analytics.totalClients) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Inactive</span>
                          <span className="font-medium">{analytics.inactiveClients}</span>
                        </div>
                        <div className="w-full bg-gray-300 rounded h-2">
                          <div
                            className="bg-gray-500 h-2 rounded"
                            style={{
                              width: `${
                                analytics.totalClients > 0
                                  ? (analytics.inactiveClients / analytics.totalClients) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Project Summary</p>
                    <div className="mt-3 space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Total Value:</span> ${analytics.totalProjectValue.toFixed(2)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Avg Value:</span> ${analytics.avgProjectValue.toFixed(2)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Total Clients:</span> {analytics.totalClients}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading analytics...</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Client Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Create Client
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industry
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="other">Select Industry</option>
                  <option value="technology">Technology</option>
                  <option value="finance">Finance</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createClient}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

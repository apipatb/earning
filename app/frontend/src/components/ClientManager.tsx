import { useState, useEffect } from 'react';
import { Users, Plus, Mail, Phone, Building, DollarSign, Calendar, Edit2, Trash2, Search, Filter, Star, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { notify } from '../store/notification.store';

// Client status type
type ClientStatus = 'active' | 'inactive' | 'pending';

// Filter status type (includes 'all' option)
type FilterStatus = 'all' | ClientStatus;

// Client data structure
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  hourlyRate: number;
  totalEarnings: number;
  projectsCount: number;
  status: ClientStatus;
  rating: number;
  lastContact: string;
  tags: string[];
  notes: string;
  createdAt: string;
}

// Client form data structure
interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  hourlyRate: number;
  status: ClientStatus;
  rating: number;
  tags: string;
  notes: string;
}

// Earning/Invoice data structure (associated with clients)
interface Earning {
  id: string;
  clientId: string;
  amount: number;
  date: string;
  description?: string;
  category?: string;
  invoiceNumber?: string;
  status?: string;
}

// Project association structure
interface Project {
  id: string;
  clientId: string;
  name: string;
  amount: number;
  date: string;
  status?: string;
  description?: string;
}

// Client performance metrics
interface ClientStats {
  total: number;
  active: number;
  totalRevenue: number;
  avgRating: number;
}

// Client interaction history entry
interface ClientInteraction {
  id: string;
  clientId: string;
  type: 'email' | 'call' | 'meeting' | 'message' | 'other';
  date: string;
  notes: string;
  outcome?: string;
}

// Performance metrics for individual clients
interface ClientPerformanceMetrics {
  totalEarnings: number;
  projectsCount: number;
  averageProjectValue: number;
  lastContactDate: string;
  responseTime?: number;
  satisfactionScore: number;
  retentionRate?: number;
}

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    hourlyRate: 0,
    status: 'active',
    rating: 5,
    tags: '',
    notes: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, filterStatus]);

  const loadClients = (): void => {
    const stored = localStorage.getItem('clients');
    if (stored) {
      const loadedClients: Client[] = JSON.parse(stored);
      // Calculate earnings from earnings data
      const earningsData = localStorage.getItem('earnings') || '[]';
      const earnings: Earning[] = JSON.parse(earningsData);

      const updatedClients: Client[] = loadedClients.map((client: Client) => {
        const clientEarnings: Earning[] = earnings.filter((e: Earning) => e.clientId === client.id);
        const totalEarnings: number = clientEarnings.reduce((sum: number, e: Earning) => sum + e.amount, 0);
        const projectsCount: number = clientEarnings.length;

        return {
          ...client,
          totalEarnings,
          projectsCount,
        };
      });

      setClients(updatedClients);
    }
  };

  const filterClients = (): void => {
    let filtered: Client[] = [...clients];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((client: Client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((client: Client) => client.status === filterStatus);
    }

    // Sort by total earnings (highest first)
    filtered.sort((a: Client, b: Client) => b.totalEarnings - a.totalEarnings);

    setFilteredClients(filtered);
  };

  const saveClient = (): void => {
    if (!formData.name || !formData.email) {
      notify.error('Validation Error', 'Name and email are required');
      return;
    }

    const newClient: Client = {
      id: editingClient?.id || `client-${Date.now()}`,
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()) : [],
      totalEarnings: editingClient?.totalEarnings || 0,
      projectsCount: editingClient?.projectsCount || 0,
      lastContact: new Date().toISOString(),
      createdAt: editingClient?.createdAt || new Date().toISOString(),
    };

    let updatedClients: Client[];
    if (editingClient) {
      updatedClients = clients.map((c: Client) => c.id === editingClient.id ? newClient : c);
      notify.success('Updated', `Client ${newClient.name} updated successfully`);
    } else {
      updatedClients = [...clients, newClient];
      notify.success('Added', `Client ${newClient.name} added successfully`);
    }

    localStorage.setItem('clients', JSON.stringify(updatedClients));
    setClients(updatedClients);
    resetForm();
  };

  const editClient = (client: Client): void => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      hourlyRate: client.hourlyRate,
      status: client.status,
      rating: client.rating,
      tags: client.tags.join(', '),
      notes: client.notes,
    });
    setShowForm(true);
  };

  const deleteClient = (id: string): void => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    const updatedClients: Client[] = clients.filter((c: Client) => c.id !== id);
    localStorage.setItem('clients', JSON.stringify(updatedClients));
    setClients(updatedClients);
    notify.success('Deleted', 'Client deleted successfully');
  };

  const resetForm = (): void => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      hourlyRate: 0,
      status: 'active',
      rating: 5,
      tags: '',
      notes: '',
    });
    setEditingClient(null);
    setShowForm(false);
  };

  const getStatusColor = (status: ClientStatus): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const stats: ClientStats = {
    total: clients.length,
    active: clients.filter((c: Client) => c.status === 'active').length,
    totalRevenue: clients.reduce((sum: number, c: Client) => sum + c.totalEarnings, 0),
    avgRating: clients.length > 0 ? clients.reduce((sum: number, c: Client) => sum + c.rating, 0) / clients.length : 0,
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Client Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Track and manage your client relationships
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Clients</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {stats.total}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Active Clients</span>
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {stats.active}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            ${stats.totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Avg Rating</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
            {stats.avgRating.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingClient ? 'Edit Client' : 'Add New Client'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Client name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="client@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Company name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hourly Rate
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="50.00"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rating (1-5)
              </label>
              <div className="relative">
                <Star className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  min="1"
                  max="5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="freelance, remote, long-term"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Additional notes about this client..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={saveClient}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingClient ? 'Update Client' : 'Add Client'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Search clients..."
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'inactive'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm || filterStatus !== 'all' ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add your first client to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {client.name}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < client.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    {client.company && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Building className="w-4 h-4" />
                        {client.company}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4" />
                      {client.email}
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" />
                        {client.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      Last: {new Date(client.lastContact).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="font-semibold text-green-900 dark:text-green-100">
                        ${client.totalEarnings.toFixed(2)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">total</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {client.projectsCount} {client.projectsCount === 1 ? 'project' : 'projects'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ${client.hourlyRate}/hr
                    </div>
                  </div>

                  {client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {client.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {client.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      {client.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => editClient(client)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteClient(client.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Client Management Tips
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Track hourly rates to quickly estimate project costs</li>
          <li>Use tags to categorize clients (e.g., freelance, agency, corporate)</li>
          <li>Keep notes for each client to remember preferences and history</li>
          <li>Monitor client ratings to focus on high-value relationships</li>
          <li>Total earnings update automatically from your earnings entries</li>
        </ul>
      </div>
    </div>
  );
}

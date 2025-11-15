import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit,
  Trash2,
  Download,
  Share2,
  TrendingUp,
  Eye,
} from 'lucide-react';

interface Contract {
  id: string;
  title: string;
  description?: string;
  contractType: string;
  clientId?: string;
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
}

interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  value: number;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
}

const Contract: React.FC = () => {
  const [activeTab, setActiveTab] = useState('contracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    headers: {
      Authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
    },
  });

  useEffect(() => {
    fetchAllData();
  }, [activeTab, filterStatus]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'contracts') {
        const params = filterStatus !== 'all' ? { status: filterStatus } : {};
        const res = await apiClient.get('/contracts/contracts', { params });
        setContracts(res.data);
      } else if (activeTab === 'analytics') {
        const res = await apiClient.get('/contracts/analytics');
        setAnalytics(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContract = async (contract: Contract) => {
    setSelectedContract(contract);
    try {
      const milestonesRes = await apiClient.get(`/contracts/contracts/${contract.id}/milestones`);
      setMilestones(milestonesRes.data);
      const paymentsRes = await apiClient.get(`/contracts/contracts/${contract.id}/payments`);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Failed to fetch contract details:', error);
    }
  };

  const handleCreateContract = async (formData: any) => {
    try {
      await apiClient.post('/contracts/contracts', formData);
      setShowCreateForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create contract:', error);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    try {
      await apiClient.delete(`/contracts/contracts/${contractId}`);
      fetchAllData();
    } catch (error) {
      console.error('Failed to delete contract:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900 text-green-200';
      case 'completed':
        return 'bg-blue-900 text-blue-200';
      case 'pending_signature':
        return 'bg-yellow-900 text-yellow-200';
      case 'draft':
        return 'bg-slate-700 text-slate-300';
      case 'terminated':
        return 'bg-red-900 text-red-200';
      case 'expired':
        return 'bg-orange-900 text-orange-200';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service':
        return '📋';
      case 'nda':
        return '🔒';
      case 'employment':
        return '👤';
      case 'vendor':
        return '🤝';
      case 'license':
        return '📜';
      default:
        return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Contract Management</h1>
          <p className="text-slate-400">Create and manage contracts, milestones, payments, and signatures</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-4 py-2 ${activeTab === 'contracts' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Contracts
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 ${activeTab === 'details' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 ${activeTab === 'analytics' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Analytics
          </button>
        </div>

        {activeTab === 'contracts' && (
          <div className="space-y-6">
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                <Plus className="w-5 h-5" />
                New Contract
              </button>
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 pl-10 rounded-lg"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-700 text-white px-4 py-2 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_signature">Pending Signature</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="terminated">Terminated</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts
                .filter((c) => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => handleSelectContract(contract)}
                    className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500 cursor-pointer transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTypeIcon(contract.contractType)}</span>
                        <div>
                          <h3 className="font-bold text-white">{contract.title}</h3>
                          <p className="text-xs text-slate-400">{contract.contractType}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(contract.status)}`}>
                        {contract.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Value:</span>
                        <span className="font-semibold text-green-400">
                          {contract.value} {contract.currency}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(contract.startDate).toLocaleDateString()} -{' '}
                          {new Date(contract.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContract(contract.id);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'details' && selectedContract && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">{selectedContract.title}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Contract Type</p>
                  <p className="text-lg font-semibold text-white">{selectedContract.contractType}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded font-medium ${getStatusColor(selectedContract.status)}`}>
                    {selectedContract.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Contract Value</p>
                  <p className="text-2xl font-bold text-green-400">
                    {selectedContract.value} {selectedContract.currency}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Duration</p>
                  <p className="text-white">
                    {new Date(selectedContract.startDate).toLocaleDateString()} -{' '}
                    {new Date(selectedContract.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedContract.description && (
                <div className="mb-6">
                  <p className="text-sm text-slate-400 mb-2">Description</p>
                  <p className="text-slate-300">{selectedContract.description}</p>
                </div>
              )}
            </div>

            {milestones.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Milestones</h3>
                <div className="space-y-3">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between bg-slate-700 p-4 rounded-lg">
                      <div>
                        <p className="font-semibold text-white">{milestone.name}</p>
                        <p className="text-sm text-slate-400">
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">${milestone.value}</p>
                        <p className="text-xs text-slate-400">{milestone.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {payments.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Payment Schedule</h3>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="font-semibold text-white">${payment.amount}</p>
                          <p className="text-sm text-slate-400">
                            Due: {new Date(payment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          payment.status === 'paid'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-yellow-900 text-yellow-200'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Total Contracts</p>
                <p className="text-3xl font-bold">{analytics.totalContracts}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Active Contracts</p>
                <p className="text-3xl font-bold">{analytics.activeContracts}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Total Value</p>
                <p className="text-3xl font-bold">${analytics.totalValue}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Pending Payments</p>
                <p className="text-3xl font-bold">${analytics.totalPendingPayments}</p>
              </div>
            </div>

            {analytics.upcomingMilestones && analytics.upcomingMilestones.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Upcoming Milestones</h3>
                <div className="space-y-2">
                  {analytics.upcomingMilestones.slice(0, 5).map((milestone: any) => (
                    <div key={milestone.id} className="flex items-center gap-3 p-3 bg-slate-700 rounded">
                      <Clock className="w-5 h-5 text-yellow-400" />
                      <div className="flex-1">
                        <p className="text-white font-medium">{milestone.name}</p>
                        <p className="text-sm text-slate-400">
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-bold text-green-400">${milestone.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.upcomingRenewals && analytics.upcomingRenewals.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Upcoming Renewals</h3>
                <div className="space-y-2">
                  {analytics.upcomingRenewals.slice(0, 5).map((renewal: any) => (
                    <div key={renewal.id} className="flex items-center gap-3 p-3 bg-slate-700 rounded">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      <div className="flex-1">
                        <p className="text-white font-medium">Renewal</p>
                        <p className="text-sm text-slate-400">
                          {new Date(renewal.renewalDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create Contract</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateContract({ title: 'New Contract' });
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  placeholder="Contract Title"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg"
                />
                <select className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg">
                  <option>Service Agreement</option>
                  <option>NDA</option>
                  <option>Employment</option>
                  <option>Vendor</option>
                  <option>License</option>
                </select>
                <input
                  type="number"
                  placeholder="Contract Value"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg"
                />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                  Create
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contract;

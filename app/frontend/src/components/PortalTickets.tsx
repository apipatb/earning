import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { notify } from '../store/notification.store';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export default function PortalTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'ALL'>('ALL');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'MEDIUM' as TicketPriority,
    category: '',
  });

  // Mock customer ID - in production, get from auth
  const customerId = 'demo-customer-id';

  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/v1/customer/tickets?customerId=${customerId}&status=${filterStatus !== 'ALL' ? filterStatus : ''}`);

      // Mock data
      setTickets([
        {
          id: '1',
          subject: 'Issue with recent order',
          description: 'I received the wrong item in my last order.',
          status: 'OPEN',
          priority: 'HIGH',
          category: 'Orders',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          resolvedAt: null,
        },
        {
          id: '2',
          subject: 'Question about pricing',
          description: 'Can you provide more information about bulk pricing?',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          category: 'Billing',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
          resolvedAt: null,
        },
        {
          id: '3',
          subject: 'Account access issue',
          description: 'I am unable to access some features of my account.',
          status: 'RESOLVED',
          priority: 'MEDIUM',
          category: 'Technical',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
          resolvedAt: new Date(Date.now() - 43200000).toISOString(),
        },
      ]);
    } catch (error) {
      notify.error('Error', 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.description) {
      notify.error('Validation Error', 'Subject and description are required');
      return;
    }

    try {
      // TODO: Replace with actual API call
      // await fetch('/api/v1/customer/tickets', {
      //   method: 'POST',
      //   body: JSON.stringify({ ...formData, customerId }),
      // });

      notify.success('Success', 'Ticket created successfully');
      setShowCreateForm(false);
      setFormData({ subject: '', description: '', priority: 'MEDIUM', category: '' });
      loadTickets();
    } catch (error) {
      notify.error('Error', 'Failed to create ticket');
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    const styles = {
      OPEN: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      WAITING_RESPONSE: 'bg-purple-100 text-purple-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };

    const icons = {
      OPEN: AlertCircle,
      IN_PROGRESS: Clock,
      WAITING_RESPONSE: Clock,
      RESOLVED: CheckCircle,
      CLOSED: XCircle,
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    const styles = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || ticket.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage your support requests
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </button>
      </div>

      {/* Create Ticket Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Ticket</h3>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of your issue"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Provide detailed information about your issue"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as TicketPriority })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="Orders">Orders</option>
                  <option value="Billing">Billing</option>
                  <option value="Technical">Technical</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Ticket
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tickets..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TicketStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_RESPONSE">Waiting Response</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No tickets found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {ticket.subject}
                      </h3>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{ticket.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Ticket #{ticket.id}</span>
                      {ticket.category && <span>Category: {ticket.category}</span>}
                      <span>
                        Created: {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                      {ticket.resolvedAt && (
                        <span>
                          Resolved: {new Date(ticket.resolvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

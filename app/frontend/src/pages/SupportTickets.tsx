import { useEffect, useState } from 'react';
import { Plus, Filter, Download } from 'lucide-react';
import TicketList from '../components/TicketList';
import TicketForm from '../components/TicketForm';
import TicketDetail from '../components/TicketDetail';
import { notify } from '../store/notification.store';

export interface Ticket {
  id: string;
  userId: string;
  customerId?: string;
  assignedTo?: string;
  subject: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags?: string;
  category?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  resolvedAt?: string;
  slaResponseTime?: number;
  slaResolveTime?: number;
  firstResponseAt?: string;
  slaBreach: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  messages?: any[];
}

export interface TicketStats {
  total: number;
  byStatus: {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  slaBreach: number;
  avgResponseTime: number;
}

interface TicketFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  category?: string;
  slaBreach?: boolean;
  search?: string;
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadTickets();
    loadStats();
  }, [filters, page]);

  const loadTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...filters,
      });

      const response = await fetch(`/api/v1/tickets?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch tickets');

      const data = await response.json();
      setTickets(data.data);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      notify.error('Error', 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/tickets/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateTicket = async (ticketData: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) throw new Error('Failed to create ticket');

      notify.success('Success', 'Ticket created successfully');
      setShowForm(false);
      loadTickets();
      loadStats();
    } catch (error) {
      notify.error('Error', 'Failed to create ticket');
    }
  };

  const handleUpdateTicket = async (ticketId: string, updates: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update ticket');

      notify.success('Success', 'Ticket updated successfully');
      loadTickets();
      loadStats();
      if (selectedTicket?.id === ticketId) {
        const data = await response.json();
        setSelectedTicket(data.data);
      }
    } catch (error) {
      notify.error('Error', 'Failed to update ticket');
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/tickets/${ticketId}/close`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to close ticket');

      notify.success('Success', 'Ticket closed successfully');
      loadTickets();
      loadStats();
    } catch (error) {
      notify.error('Error', 'Failed to close ticket');
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage customer support tickets and track SLA compliance
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tickets</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Open</div>
            <div className="mt-1 text-3xl font-semibold text-orange-600">{stats.byStatus.open}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</div>
            <div className="mt-1 text-3xl font-semibold text-blue-600">{stats.byStatus.inProgress}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">SLA Breach</div>
            <div className="mt-1 text-3xl font-semibold text-red-600">{stats.slaBreach}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Response Time</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{stats.avgResponseTime}m</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={filters.priority || ''}
                onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
                placeholder="Search tickets..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <TicketList
        tickets={tickets}
        onTicketClick={setSelectedTicket}
        onUpdateTicket={handleUpdateTicket}
        onCloseTicket={handleCloseTicket}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Ticket Form Modal */}
      {showForm && <TicketForm onClose={() => setShowForm(false)} onSubmit={handleCreateTicket} />}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onUpdate={handleUpdateTicket} />
      )}
    </div>
  );
}

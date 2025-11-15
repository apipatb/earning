import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Filter, Download, MessageSquare, BookOpen, HelpCircle, TrendingUp } from 'lucide-react';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  status: 'open' | 'in_progress' | 'closed' | 'resolved';
  clientId: string;
  createdAt: string;
  updatedAt?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  views: number;
  isPublished: boolean;
  createdAt: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  order: number;
}

interface SupportMetrics {
  period: number;
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  urgentTickets: number;
  avgResolutionTime: number;
  customerSatisfaction: number;
  firstResponseTime: number;
  timestamp: string;
}

const Support: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showCreateArticle, setShowCreateArticle] = useState(false);
  const [showCreateFAQ, setShowCreateFAQ] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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
      if (activeTab === 'tickets') {
        const res = await apiClient.get('/support/tickets');
        setTickets(res.data);
      } else if (activeTab === 'knowledge-base') {
        const res = await apiClient.get('/support/articles');
        setArticles(res.data);
      } else if (activeTab === 'faqs') {
        const res = await apiClient.get('/support/faqs');
        setFAQs(res.data);
      } else if (activeTab === 'analytics') {
        const res = await apiClient.get('/support/metrics');
        setMetrics(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (formData: any) => {
    try {
      await apiClient.post('/support/tickets', formData);
      setShowCreateTicket(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleCreateArticle = async (formData: any) => {
    try {
      await apiClient.post('/support/articles', formData);
      setShowCreateArticle(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create article:', error);
    }
  };

  const handleCreateFAQ = async (formData: any) => {
    try {
      await apiClient.post('/support/faqs', formData);
      setShowCreateFAQ(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create FAQ:', error);
    }
  };

  const handleCloseTicket = async (ticketId: string, resolutionNote: string) => {
    try {
      await apiClient.put(`/support/tickets/${ticketId}/close`, { resolutionNote });
      fetchAllData();
    } catch (error) {
      console.error('Failed to close ticket:', error);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const res = await apiClient.post('/support/reports/generate', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      const report = res.data;
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2)));
      element.setAttribute('download', `support-report-${Date.now()}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Customer Support</h1>
          <p className="text-slate-400">Manage tickets, knowledge base, FAQs, and support analytics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'tickets'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="inline mr-2 w-5 h-5" />
            Tickets
          </button>
          <button
            onClick={() => setActiveTab('knowledge-base')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'knowledge-base'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="inline mr-2 w-5 h-5" />
            Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'faqs'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="inline mr-2 w-5 h-5" />
            FAQs
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="inline mr-2 w-5 h-5" />
            Analytics
          </button>
        </div>

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Total Tickets</p>
                <p className="text-3xl font-bold">{tickets.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Open</p>
                <p className="text-3xl font-bold">{tickets.filter((t) => t.status === 'open').length}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">In Progress</p>
                <p className="text-3xl font-bold">{tickets.filter((t) => t.status === 'in_progress').length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Closed</p>
                <p className="text-3xl font-bold">{tickets.filter((t) => t.status === 'closed' || t.status === 'resolved').length}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setShowCreateTicket(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                New Ticket
              </button>
              <div className="flex gap-2 flex-1 min-w-[300px]">
                <div className="flex items-center bg-slate-700 rounded-lg px-4 flex-1">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
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
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Ticket #</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Subject</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Priority</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Created</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 text-sm text-slate-300">{ticket.ticketNumber}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{ticket.subject}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                            <button
                              onClick={() => handleCloseTicket(ticket.id, '')}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-all"
                            >
                              Close
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No tickets found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge-base' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateArticle(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                New Article
              </button>
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.length > 0 ? (
                articles.map((article) => (
                  <div key={article.id} className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700/50 transition">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex-1">{article.title}</h3>
                      {!article.isPublished && (
                        <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">Draft</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-4">{article.category}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{article.views} views</span>
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-slate-400 py-12">
                  No articles yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* FAQs Tab */}
        {activeTab === 'faqs' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateFAQ(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                New FAQ
              </button>
            </div>

            {/* FAQs Accordion */}
            <div className="space-y-3">
              {faqs.length > 0 ? (
                faqs.map((faq) => (
                  <div key={faq.id} className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700/50 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">{faq.question}</h3>
                        <p className="text-slate-400 mb-3">{faq.answer}</p>
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">{faq.category}</span>
                      </div>
                      {!faq.isActive && (
                        <span className="text-xs bg-red-600 text-red-100 px-2 py-1 rounded">Inactive</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-12">
                  No FAQs yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {metrics ? (
              <>
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-800 rounded-lg p-6">
                    <p className="text-sm text-slate-400 mb-2">Total Tickets</p>
                    <p className="text-3xl font-bold text-white">{metrics.totalTickets}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6">
                    <p className="text-sm text-slate-400 mb-2">Open Tickets</p>
                    <p className="text-3xl font-bold text-white">{metrics.openTickets}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6">
                    <p className="text-sm text-slate-400 mb-2">Closed Tickets</p>
                    <p className="text-3xl font-bold text-white">{metrics.closedTickets}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6">
                    <p className="text-sm text-slate-400 mb-2">Urgent Tickets</p>
                    <p className="text-3xl font-bold text-white">{metrics.urgentTickets}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6">
                    <p className="text-sm text-slate-400 mb-2">Avg Resolution Time</p>
                    <p className="text-3xl font-bold text-white">{metrics.avgResolutionTime.toFixed(1)}h</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6">
                    <p className="text-sm text-slate-400 mb-2">First Response Time</p>
                    <p className="text-3xl font-bold text-white">{metrics.firstResponseTime.toFixed(1)}h</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6">
                    <p className="text-sm text-slate-400 mb-2">Customer Satisfaction</p>
                    <p className="text-3xl font-bold text-white">{metrics.customerSatisfaction.toFixed(1)}/5</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6">
                    <p className="text-sm text-slate-400 mb-2">Period</p>
                    <p className="text-3xl font-bold text-white">{metrics.period}d</p>
                  </div>
                </div>

                {/* Report Generation */}
                <button
                  onClick={handleGenerateReport}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
                >
                  <Download className="w-5 h-5" />
                  Generate Report
                </button>
              </>
            ) : (
              <div className="text-center text-slate-400 py-12">
                {loading ? 'Loading metrics...' : 'No analytics data available'}
              </div>
            )}
          </div>
        )}

        {/* Create Ticket Modal */}
        {showCreateTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Ticket</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateTicket({
                    clientId: formData.get('clientId'),
                    subject: formData.get('subject'),
                    description: formData.get('description'),
                    priority: formData.get('priority'),
                    category: formData.get('category'),
                  });
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  name="clientId"
                  placeholder="Client ID"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none h-24"
                />
                <select name="priority" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none">
                  <option value="low">Low</option>
                  <option value="medium" selected>
                    Medium
                  </option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select name="category" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none">
                  <option value="general">General</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                  <option value="feature">Feature Request</option>
                </select>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateTicket(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Article Modal */}
        {showCreateArticle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Article</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateArticle({
                    title: formData.get('title'),
                    content: formData.get('content'),
                    category: formData.get('category'),
                    isPublished: formData.get('isPublished') === 'on',
                  });
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  name="title"
                  placeholder="Article Title"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <textarea
                  name="content"
                  placeholder="Article Content"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none h-24"
                />
                <select name="category" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none">
                  <option value="general">General</option>
                  <option value="troubleshooting">Troubleshooting</option>
                  <option value="tutorial">Tutorial</option>
                </select>
                <label className="flex items-center gap-2 text-slate-300">
                  <input type="checkbox" name="isPublished" />
                  Publish immediately
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateArticle(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create FAQ Modal */}
        {showCreateFAQ && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create New FAQ</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateFAQ({
                    question: formData.get('question'),
                    answer: formData.get('answer'),
                    category: formData.get('category'),
                  });
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  name="question"
                  placeholder="Question"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <textarea
                  name="answer"
                  placeholder="Answer"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none h-24"
                />
                <select name="category" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none">
                  <option value="general">General</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                </select>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateFAQ(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
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

export default Support;

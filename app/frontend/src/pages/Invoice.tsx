import React, { useState, useEffect } from 'react';
import { FileText, Plus, DollarSign, TrendingUp, Settings } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  totalAmount: number;
  finalAmount: number;
  status: string;
  dueDate: string;
  issuedAt: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
}

interface InvoiceAnalytics {
  period: number;
  totalInvoices: number;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  collectionRate: number;
  statusBreakdown: any;
}

export default function Invoice() {
  const [activeTab, setActiveTab] = useState('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<InvoiceAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    amount: '',
    description: '',
    dueDate: '',
    taxRate: '0',
  });

  useEffect(() => {
    fetchInvoices();
    fetchAnalytics();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoices', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics', {
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

  const createInvoice = async () => {
    try {
      const response = await fetch('/api/invoices', {
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
          clientEmail: '',
          amount: '',
          description: '',
          dueDate: '',
          taxRate: '0',
        });
        fetchInvoices();
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const publishInvoice = async (invoiceId: string) => {
    try {
      await fetch(`/api/invoices/${invoiceId}/publish`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchInvoices();
    } catch (error) {
      console.error('Failed to publish invoice:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Invoice & Billing
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Invoice
        </button>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Invoiced</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${analytics.totalInvoiced.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">${analytics.totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Outstanding</p>
            <p className="text-2xl font-bold text-orange-600">
              ${analytics.outstanding.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Collection Rate</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.collectionRate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-8 px-6">
            <button
              onClick={() => {
                setActiveTab('overview');
                fetchInvoices();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Invoices
            </button>
            <button
              onClick={() => {
                setActiveTab('payments');
                fetchPayments();
              }}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'payments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-2" />
              Payments
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
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 border-b-2 font-medium transition ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invoices ({invoices.length})
              </h3>
              {loading ? (
                <p className="text-gray-500">Loading invoices...</p>
              ) : invoices.length === 0 ? (
                <p className="text-gray-500">No invoices yet. Create your first invoice!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Invoice #
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Client
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Due Date
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="py-3 px-4">{invoice.invoiceNumber}</td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {invoice.clientName}
                              </p>
                              <p className="text-gray-500 text-xs">{invoice.clientEmail}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">${invoice.finalAmount.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === 'sent'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            {invoice.status === 'draft' && (
                              <button
                                onClick={() => publishInvoice(invoice.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Publish
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Payments ({payments.length})
              </h3>
              {loading ? (
                <p className="text-gray-500">Loading payments...</p>
              ) : payments.length === 0 ? (
                <p className="text-gray-500">No payment records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Invoice ID
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Method
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          <td className="py-3 px-4 font-medium">{payment.invoiceId}</td>
                          <td className="py-3 px-4 font-medium text-green-600">
                            ${payment.paymentAmount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">{payment.paymentMethod}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              {payment.status}
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

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invoice Analytics
              </h3>
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Total Invoices (Period)</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {analytics.totalInvoices}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Average Invoice</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      ${(analytics.totalInvoiced / Math.max(analytics.totalInvoices, 1)).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Payment Status</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Paid:</span>{' '}
                        {analytics.statusBreakdown.paid || 0}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Partially Paid:</span>{' '}
                        {analytics.statusBreakdown.partially_paid || 0}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Sent:</span> {analytics.statusBreakdown.sent || 0}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Analysis Period</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {analytics.period} days
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading analytics...</p>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invoice Settings
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Configure invoice templates, recurring invoices, and tax settings here.
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Manage Templates
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Invoice</h2>
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
                  Client Email
                </label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
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
                onClick={createInvoice}
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

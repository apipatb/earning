import { useEffect, useState } from 'react';
import { Download, Eye, Search, Filter, DollarSign, Calendar } from 'lucide-react';
import { notify } from '../store/notification.store';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED';

interface Invoice {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  invoiceDate: string;
  dueDate: string;
  paidDate: string | null;
  status: InvoiceStatus;
  lineItems: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

export default function PortalInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Mock customer ID
  const customerId = 'demo-customer-id';

  useEffect(() => {
    loadInvoices();
  }, [filterStatus]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/v1/customer/invoices?customerId=${customerId}`);

      // Mock data
      setInvoices([
        {
          id: '1',
          invoiceNumber: 'INV-2024-001',
          subtotal: 1500.00,
          taxAmount: 150.00,
          discountAmount: 0,
          totalAmount: 1650.00,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 2592000000).toISOString(),
          paidDate: null,
          status: 'SENT',
          lineItems: [
            {
              id: '1',
              description: 'Premium Service Package',
              quantity: 1,
              unitPrice: 1500.00,
              totalPrice: 1500.00,
            },
          ],
        },
        {
          id: '2',
          invoiceNumber: 'INV-2024-002',
          subtotal: 750.00,
          taxAmount: 75.00,
          discountAmount: 50.00,
          totalAmount: 775.00,
          invoiceDate: new Date(Date.now() - 2592000000).toISOString(),
          dueDate: new Date(Date.now() - 1296000000).toISOString(),
          paidDate: new Date(Date.now() - 1296000000).toISOString(),
          status: 'PAID',
          lineItems: [
            {
              id: '2',
              description: 'Consulting Services',
              quantity: 5,
              unitPrice: 150.00,
              totalPrice: 750.00,
            },
          ],
        },
      ]);
    } catch (error) {
      notify.error('Error', 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      VIEWED: 'bg-purple-100 text-purple-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // TODO: Implement actual download
      notify.success('Success', 'Invoice download started');
    } catch (error) {
      notify.error('Error', 'Failed to download invoice');
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || invoice.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Invoice Detail View
  if (selectedInvoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedInvoice(null)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Invoices
          </button>
          <button
            onClick={() => handleDownloadInvoice(selectedInvoice.id)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-lg text-gray-600">{selectedInvoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              {getStatusBadge(selectedInvoice.status)}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">INVOICE DATE</h3>
              <p className="text-gray-900">
                {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">DUE DATE</h3>
              <p className="text-gray-900">
                {new Date(selectedInvoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedInvoice.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">${selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              {selectedInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-green-600">-${selectedInvoice.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span className="text-gray-900">${selectedInvoice.taxAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total:</span>
                <span className="text-gray-900">${selectedInvoice.totalAmount.toFixed(2)}</span>
              </div>
              {selectedInvoice.paidDate && (
                <div className="text-sm text-green-600">
                  Paid on {new Date(selectedInvoice.paidDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invoice List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
        <p className="text-sm text-gray-600 mt-1">
          View and download your invoices
        </p>
      </div>

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
                placeholder="Search invoices..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="VIEWED">Viewed</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">
                {invoices.filter((inv) => inv.status === 'PAID').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {invoices.filter((inv) => !['PAID', 'CANCELLED'].includes(inv.status)).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${invoice.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-700 mr-3"
                      >
                        <Eye className="w-5 h-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        <Download className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

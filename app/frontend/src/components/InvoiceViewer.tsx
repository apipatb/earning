import React, { useState, useEffect } from 'react';
import { X, Download, Send, FileText, Calendar, DollarSign, User, Building } from 'lucide-react';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  terms?: string;
  customer?: Customer;
  lineItems?: InvoiceLineItem[];
}

interface InvoiceViewerProps {
  invoice: Invoice;
  onClose: () => void;
}

const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ invoice: initialInvoice, onClose }) => {
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch full invoice details if line items not loaded
    if (!invoice.lineItems) {
      fetchInvoiceDetails();
    }
  }, []);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/billing/invoices/${invoice.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // In a real implementation, this would download a PDF
    console.log('Downloading invoice:', invoice.id);
    alert('PDF download functionality would be implemented here');
  };

  const handleSendEmail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/billing/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('Invoice sent successfully!');
        setInvoice((prev) => ({ ...prev, status: 'SENT' }));
      } else {
        throw new Error('Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to send invoice');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'SENT':
      case 'VIEWED':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
            {invoice.status !== 'SENT' && invoice.customer?.email && (
              <button
                onClick={handleSendEmail}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-8">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>

          {/* Invoice Info Grid */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* From */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">FROM</h3>
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">Your Company Name</p>
                <p className="text-sm text-gray-600">123 Business Street</p>
                <p className="text-sm text-gray-600">City, State 12345</p>
                <p className="text-sm text-gray-600">Email: billing@yourcompany.com</p>
              </div>
            </div>

            {/* To */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">BILL TO</h3>
              {invoice.customer ? (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {invoice.customer.name}
                  </p>
                  {invoice.customer.company && (
                    <p className="text-sm text-gray-600 flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      {invoice.customer.company}
                    </p>
                  )}
                  {invoice.customer.email && (
                    <p className="text-sm text-gray-600">{invoice.customer.email}</p>
                  )}
                  {invoice.customer.address && (
                    <p className="text-sm text-gray-600">{invoice.customer.address}</p>
                  )}
                  {(invoice.customer.city || invoice.customer.country) && (
                    <p className="text-sm text-gray-600">
                      {invoice.customer.city}
                      {invoice.customer.city && invoice.customer.country && ', '}
                      {invoice.customer.country}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No customer information</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                INVOICE DATE
              </p>
              <p className="text-sm font-medium text-gray-900">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                DUE DATE
              </p>
              <p className="text-sm font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
            </div>
            {invoice.paidDate && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  PAID DATE
                </p>
                <p className="text-sm font-medium text-green-600">{formatDate(invoice.paidDate)}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          {invoice.lineItems && invoice.lineItems.length > 0 && (
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 text-sm font-semibold text-gray-600">DESCRIPTION</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-600">QTY</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-600">UNIT PRICE</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-600">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="text-right py-3 text-sm text-gray-900">{item.quantity}</td>
                      <td className="text-right py-3 text-sm text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="text-right py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(invoice.discountAmount)}
                  </span>
                </div>
              )}
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                <span className="text-base font-semibold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-gray-900 flex items-center">
                  <DollarSign className="w-5 h-5 mr-1" />
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="space-y-4 pt-6 border-t border-gray-200">
              {invoice.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">NOTES</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">TERMS & CONDITIONS</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-center text-gray-500">
            Thank you for your business! For questions about this invoice, please contact billing@yourcompany.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewer;

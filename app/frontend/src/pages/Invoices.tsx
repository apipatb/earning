import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { invoicesAPI, customersAPI } from '../lib/api';
import { notify } from '../store/notification.store';

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceNumber: '',
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    status: 'draft',
    paymentMethod: '',
    notes: '',
    terms: '',
    lineItems: [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invRes, custRes, summRes, overdueRes] = await Promise.all([
        invoicesAPI.getAll(),
        customersAPI.getAll(),
        invoicesAPI.getSummary(),
        invoicesAPI.getOverdue(),
      ]);
      setInvoices(invRes.invoices);
      setCustomers(custRes.customers);
      setSummary(summRes.summary);
      setOverdueInvoices(overdueRes.overdueInvoices);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      notify.error('Error', 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (items: any[], tax: number, discount: number) => {
    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const taxAmount = subtotal * (tax / 100);
    const total = subtotal + taxAmount - discount;
    return { subtotal, taxAmount, total };
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }

    const { subtotal, taxAmount, total } = calculateTotal(
      newItems,
      formData.taxAmount,
      formData.discountAmount
    );

    setFormData({
      ...formData,
      lineItems: newItems,
      subtotal,
      taxAmount,
      totalAmount: total,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNumber || formData.lineItems.length === 0 || formData.totalAmount <= 0) {
      notify.error('Validation Error', 'Please fill all required fields');
      return;
    }

    try {
      if (editingId) {
        await invoicesAPI.update(editingId, formData);
        setInvoices(invoices.map((inv) => (inv.id === editingId ? { ...inv, ...formData } : inv)));
        notify.success('Success', 'Invoice updated');
      } else {
        const response = await invoicesAPI.create(formData);
        setInvoices([response.invoice, ...invoices]);
        notify.success('Success', 'Invoice created');
      }
      resetForm();
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to save invoice');
    }
  };

  const handleEdit = (invoice: any) => {
    setFormData({
      customerId: invoice.customerId || '',
      invoiceNumber: invoice.invoiceNumber,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      status: invoice.status,
      paymentMethod: invoice.paymentMethod || '',
      notes: invoice.notes || '',
      terms: invoice.terms || '',
      lineItems: invoice.lineItems,
    });
    setEditingId(invoice.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await invoicesAPI.delete(id);
      setInvoices(invoices.filter((inv) => inv.id !== id));
      notify.success('Invoice Deleted', 'Invoice has been removed');
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to delete invoice');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await invoicesAPI.markPaid(id, { paymentMethod: formData.paymentMethod });
      setInvoices(invoices.map((inv) => (inv.id === id ? { ...inv, status: 'paid' } : inv)));
      notify.success('Success', 'Invoice marked as paid');
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to mark invoice as paid');
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      invoiceNumber: `INV-${Date.now()}`,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      status: 'draft',
      paymentMethod: '',
      notes: '',
      terms: '',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </button>
      </div>

      {/* Overdue Alerts */}
      {overdueInvoices.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-orange-900">
                {overdueInvoices.length} Overdue Invoice{overdueInvoices.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-orange-800 mt-2">
                Total overdue: ${overdueInvoices.reduce((sum, i) => sum + i.totalAmount, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Total Invoices</p>
            <p className="mt-2 text-3xl font-extrabold text-gray-900">{summary.total_invoices}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Paid</p>
            <p className="mt-2 text-3xl font-extrabold text-green-600">
              ${summary.paid_amount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">{summary.paid} invoices</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="mt-2 text-3xl font-extrabold text-orange-600">
              ${summary.pending_amount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">{summary.pending} invoices</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Total Value</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">
              ${summary.total_amount.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Invoice Number *</label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="viewed">Viewed</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.taxAmount}
                  onChange={(e) => {
                    const tax = parseFloat(e.target.value) || 0;
                    const { subtotal, taxAmount, total } = calculateTotal(
                      formData.lineItems,
                      tax,
                      formData.discountAmount
                    );
                    setFormData({
                      ...formData,
                      taxAmount: tax,
                      subtotal,
                      totalAmount: total,
                    });
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Line Items</h3>
              {formData.lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-3">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="rounded-md border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Price"
                    value={item.unitPrice}
                    onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="rounded-md border border-gray-300 px-3 py-2"
                  />
                  <div className="bg-gray-100 rounded-md px-3 py-2 flex items-center">
                    ${item.totalPrice.toFixed(2)}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    lineItems: [...formData.lineItems, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
                  })
                }
                className="text-sm text-blue-600 hover:text-blue-900 mt-2"
              >
                + Add Line Item
              </button>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-2 text-right">
              <p className="text-sm">
                <span className="text-gray-700">Subtotal:</span> ${formData.subtotal.toFixed(2)}
              </p>
              <p className="text-sm">
                <span className="text-gray-700">Tax:</span> ${(formData.subtotal * (formData.taxAmount / 100)).toFixed(2)}
              </p>
              <p className="text-lg font-medium">
                <span className="text-gray-900">Total:</span> ${formData.totalAmount.toFixed(2)}
              </p>
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                {editingId ? 'Update' : 'Create'} Invoice
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.customer?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.invoiceDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${invoice.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'sent'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {invoice.status === 'paid' && <CheckCircle className="h-3 w-3 inline mr-1" />}
                      {invoice.status === 'draft' && <Clock className="h-3 w-3 inline mr-1" />}
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {invoice.status !== 'paid' && (
                      <button
                        onClick={() => handleMarkPaid(invoice.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button onClick={() => handleEdit(invoice)} className="text-blue-600 hover:text-blue-900">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(invoice.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {invoices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No invoices yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

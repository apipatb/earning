import { useState, useEffect } from 'react';
import { FileText, Plus, Download, Send, Edit2, Trash2, Eye, Copy } from 'lucide-react';

// Invoice status types
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

// Line item structure for invoice items
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Invoice calculation result type
interface InvoiceCalculation {
  subtotal: number;
  tax: number;
  total: number;
}

// Main invoice template type
interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes: string;
  status: InvoiceStatus;
  createdAt: string;
}

// Type for invoice item field values
type InvoiceItemFieldValue<K extends keyof InvoiceItem> = InvoiceItem[K];

export default function InvoiceGenerator() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Invoice>>({
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    items: [],
    taxRate: 0,
    notes: '',
    status: 'draft',
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = () => {
    const stored = localStorage.getItem('invoices');
    if (stored) {
      setInvoices(JSON.parse(stored));
    }
  };

  const saveInvoices = (newInvoices: Invoice[]) => {
    localStorage.setItem('invoices', JSON.stringify(newInvoices));
    setInvoices(newInvoices);
  };

  const calculateTotals = (items: InvoiceItem[], taxRate: number): InvoiceCalculation => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
    };

    setFormData({
      ...formData,
      items: [...(formData.items || []), newItem],
    });
  };

  const updateItem = <K extends keyof InvoiceItem>(
    id: string,
    field: K,
    value: InvoiceItemFieldValue<K>
  ): void => {
    const items = (formData.items || []).map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    });

    const { subtotal, tax, total } = calculateTotals(items, formData.taxRate || 0);

    setFormData({
      ...formData,
      items,
      subtotal,
      tax,
      total,
    });
  };

  const removeItem = (id: string) => {
    const items = (formData.items || []).filter(item => item.id !== id);
    const { subtotal, tax, total } = calculateTotals(items, formData.taxRate || 0);

    setFormData({
      ...formData,
      items,
      subtotal,
      tax,
      total,
    });
  };

  const handleCreate = () => {
    if (!formData.clientName || !formData.items?.length) {
      alert('Please fill in client name and add at least one item');
      return;
    }

    const { subtotal, tax, total } = calculateTotals(formData.items, formData.taxRate || 0);

    const newInvoice: Invoice = {
      id: `invoice-${Date.now()}`,
      invoiceNumber: formData.invoiceNumber!,
      date: formData.date!,
      dueDate: formData.dueDate!,
      clientName: formData.clientName!,
      clientEmail: formData.clientEmail || '',
      clientAddress: formData.clientAddress || '',
      items: formData.items,
      subtotal,
      tax,
      taxRate: formData.taxRate || 0,
      total,
      notes: formData.notes || '',
      status: formData.status!,
      createdAt: new Date().toISOString(),
    };

    saveInvoices([...invoices, newInvoice]);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingId) return;

    const { subtotal, tax, total } = calculateTotals(formData.items || [], formData.taxRate || 0);

    const updated = invoices.map(inv =>
      inv.id === editingId
        ? {
            ...inv,
            ...formData,
            subtotal,
            tax,
            total,
          }
        : inv
    );

    saveInvoices(updated);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this invoice?')) {
      saveInvoices(invoices.filter(inv => inv.id !== id));
    }
  };

  const duplicateInvoice = (invoice: Invoice) => {
    const duplicate: Invoice = {
      ...invoice,
      id: `invoice-${Date.now()}`,
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    saveInvoices([duplicate, ...invoices]);
  };

  const downloadPDF = (invoice: Invoice) => {
    // This would integrate with jsPDF or similar
    console.log('Downloading PDF for', invoice.invoiceNumber);
    alert('PDF download feature coming soon!');
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      items: [],
      taxRate: 0,
      notes: '',
      status: 'draft',
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const startEdit = (invoice: Invoice) => {
    setFormData(invoice);
    setEditingId(invoice.id);
    setIsCreating(true);
  };

  const getStatusColor = (status: InvoiceStatus): string => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'overdue': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invoice Generator</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Create professional invoices
            </p>
          </div>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        )}
      </div>

      {!isCreating ? (
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Invoices Yet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Create your first professional invoice
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Create Invoice
              </button>
            </div>
          ) : (
            invoices.map(invoice => (
              <div
                key={invoice.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {invoice.clientName}
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Date:</span>
                        <span className="ml-1 text-gray-900 dark:text-white">
                          {new Date(invoice.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Due:</span>
                        <span className="ml-1 text-gray-900 dark:text-white">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Total:</span>
                        <span className="ml-1 font-semibold text-gray-900 dark:text-white">
                          ${invoice.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => downloadPDF(invoice)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicateInvoice(invoice)}
                      className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEdit(invoice)}
                      className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as InvoiceStatus })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Address
              </label>
              <input
                type="text"
                value={formData.clientAddress}
                onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Invoice Items
              </label>
              <button
                onClick={addItem}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {(formData.items || []).map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="col-span-5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <div className="col-span-2 text-sm font-medium text-gray-900 dark:text-white">
                    ${item.amount.toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="col-span-1 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${(formData.subtotal || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => {
                      const taxRate = parseFloat(e.target.value) || 0;
                      const { subtotal, tax, total } = calculateTotals(formData.items || [], taxRate);
                      setFormData({ ...formData, taxRate, subtotal, tax, total });
                    }}
                    placeholder="%"
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${(formData.tax || 0).toFixed(2)}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-base font-semibold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">
                  ${(formData.total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Payment terms, thank you note, etc."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              {editingId ? 'Update' : 'Create'} Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

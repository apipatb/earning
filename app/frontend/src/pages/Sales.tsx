import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ShoppingCart, Search } from 'lucide-react';
import { salesAPI, productsAPI, Sale, Product, SaleData, SalesSummary } from '../lib/api';
import { notify } from '../store/notification.store';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [summary, setSummary] = useState<SalesSummary | null>(null);

  const [formData, setFormData] = useState<SaleData>({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    saleDate: new Date().toISOString().split('T')[0],
    customer: '',
    notes: '',
    status: 'completed',
  });

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesRes, productsRes, summaryRes] = await Promise.all([
        salesAPI.getAll({
          status: filterStatus !== 'all' ? filterStatus : undefined,
        }),
        productsAPI.getAll(),
        salesAPI.getSummary(),
      ]);
      setSales(salesRes.sales || []);
      setProducts(productsRes.products || []);
      setSummary(summaryRes);
    } catch (error) {
      notify.error('Error', 'Failed to load sales data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setFormData({
        ...formData,
        productId,
        unitPrice: product.price,
        totalAmount: product.price * formData.quantity,
      });
    }
  };

  const handleQuantityChange = (quantity: number) => {
    const total = quantity * formData.unitPrice;
    setFormData({
      ...formData,
      quantity,
      totalAmount: total,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId || formData.quantity <= 0 || formData.totalAmount <= 0) {
      notify.error('Validation Error', 'All fields are required');
      return;
    }

    try {
      if (editingId) {
        await salesAPI.update(editingId, formData);
        setSales(
          sales.map((s) => (s.id === editingId ? { ...s, ...formData } : s))
        );
        notify.success('Success', 'Sale updated successfully');
      } else {
        const response = await salesAPI.create(formData);
        setSales([response.sale, ...sales]);
        notify.success('Success', 'Sale recorded successfully');
      }
      resetForm();
      loadData(); // Reload to update summary
    } catch (error) {
      notify.error('Error', 'Failed to save sale. Please try again.');
    }
  };

  const handleEdit = (sale: Sale) => {
    setFormData({
      productId: sale.productId,
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      saleDate: new Date(sale.saleDate).toISOString().split('T')[0],
      customer: sale.customer || '',
      notes: sale.notes || '',
      status: sale.status,
    });
    setEditingId(sale.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sale?')) return;

    try {
      await salesAPI.delete(id);
      setSales(sales.filter((s) => s.id !== id));
      notify.success('Sale Deleted', 'Sale has been removed successfully.');
      loadData(); // Reload to update summary
    } catch (error) {
      notify.error('Error', 'Failed to delete sale. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      saleDate: new Date().toISOString().split('T')[0],
      customer: '',
      notes: '',
      status: 'completed',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredSales = sales.filter((sale) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      sale.customer?.toLowerCase().includes(searchLower) ||
      sale.product?.name.toLowerCase().includes(searchLower) ||
      sale.notes?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Sale
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Total Sales</p>
            <p className="mt-2 text-3xl font-extrabold text-gray-900">
              {summary.summary.total_sales}
            </p>
            <p className="mt-2 text-xs text-gray-500">This month</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Total Quantity</p>
            <p className="mt-2 text-3xl font-extrabold text-gray-900">
              {summary.summary.total_quantity.toFixed(0)}
            </p>
            <p className="mt-2 text-xs text-gray-500">Units sold</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="mt-2 text-3xl font-extrabold text-green-600">
              ${summary.summary.total_revenue.toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-gray-500">This month</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Avg Sale</p>
            <p className="mt-2 text-3xl font-extrabold text-gray-900">
              ${summary.summary.average_sale.toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-gray-500">Per transaction</p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Sale' : 'Record New Sale'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product *
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sale Date *
                </label>
                <input
                  type="date"
                  value={formData.saleDate}
                  onChange={(e) =>
                    setFormData({ ...formData, saleDate: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitPrice}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      unitPrice: price,
                      totalAmount: price * formData.quantity,
                    });
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Amount
                </label>
                <div className="mt-1 p-2 bg-gray-100 rounded-md text-gray-900 font-medium">
                  ${formData.totalAmount.toFixed(2)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) =>
                    setFormData({ ...formData, customer: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                rows={3}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                {editingId ? 'Update' : 'Record'} Sale
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

      {/* Sales List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Sales List ({filteredSales.length})
          </h2>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-md border border-gray-300"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-300"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.saleDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.product?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customer || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.quantity.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ${sale.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sale.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : sale.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(sale)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No sales recorded yet. Record your first sale to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

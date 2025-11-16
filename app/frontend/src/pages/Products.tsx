import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { productsAPI } from '../lib/api';
import { notify } from '../store/notification.store';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    sku: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.products);
    } catch (error) {
      console.error('Failed to load products:', error);
      notify.error('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.price <= 0) {
      notify.error('Validation Error', 'Name and price are required');
      return;
    }

    try {
      if (editingId) {
        await productsAPI.update(editingId, formData);
        setProducts(
          products.map((p) => (p.id === editingId ? { ...p, ...formData } : p))
        );
        notify.success('Success', 'Product updated successfully');
      } else {
        const response = await productsAPI.create(formData);
        setProducts([response.product, ...products]);
        notify.success('Success', 'Product created successfully');
      }
      resetForm();
    } catch (error) {
      notify.error('Error', 'Failed to save product. Please try again.');
    }
  };

  const handleEdit = (product: any) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category || '',
      sku: product.sku || '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productsAPI.delete(id);
      setProducts(products.filter((p) => p.id !== id));
      notify.success('Product Deleted', 'Product has been removed successfully.');
    } catch (error) {
      notify.error('Error', 'Failed to delete product. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      sku: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Products & Services</h1>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  SKU (Stock Keeping Unit)
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
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
                {editingId ? 'Update' : 'Create'} Product
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

      {/* Products Grid */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          All Products ({products.length})
        </h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Package className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {product.name}
                      </h3>
                      {product.category && (
                        <p className="text-xs text-gray-500 capitalize">
                          {product.category}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-gray-400 hover:text-blue-500"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {product.description && (
                  <p className="mt-2 text-sm text-gray-600">
                    {product.description.substring(0, 100)}
                    {product.description.length > 100 ? '...' : ''}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Price</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                  {product.sku && (
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">SKU</span>
                      <span className="text-sm font-mono text-gray-900">
                        {product.sku}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Sales</p>
                    <p className="text-lg font-medium text-gray-900">
                      {product.stats.total_sales}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Qty Sold</p>
                    <p className="text-lg font-medium text-gray-900">
                      {product.stats.total_quantity.toFixed(0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-lg font-medium text-green-600">
                      ${product.stats.total_revenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No products yet. Add your first product to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

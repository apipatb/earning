import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, Package, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { inventoryAPI, productsAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  reorderPoint: number;
  price?: number;
  supplierName?: string;
}

interface LowStockAlert {
  id: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  deficit: number;
  severity: 'critical' | 'high' | 'medium';
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setError(null);
      const [invRes, alertsRes] = await Promise.all([
        inventoryAPI.getAll(),
        inventoryAPI.getLowStockAlerts(),
      ]);
      setInventory(Array.isArray(invRes.inventory) ? invRes.inventory : []);
      setLowStockAlerts(Array.isArray(alertsRes.alerts) ? alertsRes.alerts : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load inventory data';
      console.error('Failed to load inventory:', err);
      setError(errorMessage);
      notify.error('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (id: string) => {
    if (!editData.quantity && editData.quantity !== 0) {
      notify.error('Validation Error', 'Please enter a quantity');
      return;
    }

    try {
      await inventoryAPI.updateStock(id, editData);
      setInventory(inventory.map((item) => (item.id === id ? { ...item, ...editData } : item)));
      setEditingId(null);
      setEditData({});
      notify.success('Success', 'Product stock has been updated');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update stock';
      notify.error('Error', errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Loading inventory data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">Error Loading Inventory</h3>
              <p className="mt-1 text-sm text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={loadInventory}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
  const inStockCount = inventory.filter((item) => item.quantity > item.reorderPoint).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Track and manage product inventory</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200">Low Stock Alerts ({lowStockAlerts.length})</h3>
              <div className="mt-4 space-y-2">
                {lowStockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`text-sm rounded-lg p-3 flex items-center justify-between ${
                      alert.severity === 'critical'
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                        : alert.severity === 'high'
                          ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200'
                          : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    <div>
                      <strong>{alert.name}</strong>
                      <span className="ml-2">Stock: <span className="font-bold">{alert.currentStock.toFixed(0)}</span></span>
                    </div>
                    {alert.severity === 'critical' && (
                      <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">CRITICAL</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{inventory.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Stock</p>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">{inStockCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock Items</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{lowStockAlerts.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Inventory Value</p>
          <p className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
            ${totalValue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {inventory.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Products Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Start managing your inventory by adding products to your catalog.</p>
          <button
            onClick={() => window.location.href = '/products'}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Package className="w-4 h-4 mr-2" />
            Go to Products
          </button>
        </div>
      ) : (
      <>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Products ({inventory.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reorder Point</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {inventory.map((item) => (
                <tr key={item.id} className={(item.quantity <= item.reorderPoint) ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{item.sku || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editData.quantity ?? item.quantity}
                        onChange={(e) => setEditData({ ...editData, quantity: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      item.quantity.toFixed(0)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editData.reorderPoint ?? item.reorderPoint}
                        onChange={(e) => setEditData({ ...editData, reorderPoint: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      item.reorderPoint.toFixed(0)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.price.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${(item.quantity * item.price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.isLowStock ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <TrendingDown className="h-3 w-3 inline mr-1" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateStock(item.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditData({ quantity: item.quantity, reorderPoint: item.reorderPoint });
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

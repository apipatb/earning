import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, Package } from 'lucide-react';
import { inventoryAPI, productsAPI } from '../lib/api';
import { notify } from '../store/notification.store';

export default function Inventory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const [invRes, alertsRes] = await Promise.all([
        inventoryAPI.getAll(),
        inventoryAPI.getLowStockAlerts(),
      ]);
      setInventory(invRes.inventory);
      setLowStockAlerts(alertsRes.alerts);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      notify.error('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (id: string) => {
    try {
      await inventoryAPI.updateStock(id, editData);
      setInventory(inventory.map((item) => (item.id === id ? { ...item, ...editData } : item)));
      setEditingId(null);
      notify.success('Stock Updated', 'Product stock has been updated');
    } catch (error) {
      notify.error('Error', 'Failed to update stock');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900">Low Stock Alerts ({lowStockAlerts.length})</h3>
              <div className="mt-3 space-y-2">
                {lowStockAlerts.map((alert) => (
                  <div key={alert.id} className="text-sm text-red-800 bg-white rounded p-2">
                    <strong>{alert.name}</strong> - Stock: {alert.currentStock.toFixed(0)} (Need: {alert.deficit.toFixed(0)})
                    {alert.severity === 'critical' && <span className="ml-2 font-bold text-red-600">CRITICAL</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm font-medium text-gray-500">Total Products</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{inventory.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
          <p className="mt-2 text-3xl font-extrabold text-red-600">{lowStockAlerts.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm font-medium text-gray-500">Total Inventory Value</p>
          <p className="mt-2 text-3xl font-extrabold text-green-600">
            ${inventory.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">All Products</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id} className={item.isLowStock ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.sku || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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

      {inventory.length === 0 && (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No products in inventory yet</p>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ChartBarIcon,
  BellAlertIcon,
  ShoppingCartIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import ForecastChart from '../components/ForecastChart';
import ReorderRules from '../components/ReorderRules';

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

interface Alert {
  id: string;
  productId: string;
  product: {
    name: string;
    sku: string;
    quantity: number;
  };
  type: string;
  message: string;
  triggered: string;
}

interface Recommendation {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  recommendedOrderQty: number;
  estimatedCost: number;
  supplier: string | null;
  urgency: 'critical' | 'high' | 'medium';
  leadTime: number;
  estimatedArrival: string;
  forecastedDemand: number;
}

interface PurchaseOrder {
  supplier: string;
  itemCount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  totalCost: number;
  estimatedDelivery: string;
}

const SmartInventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'forecasts' | 'rules' | 'alerts'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    criticalCount: 0,
    lowStockCount: 0,
    totalRecommendations: 0,
    estimatedTotalCost: 0,
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchProducts();
    fetchAlerts();
    fetchRecommendations();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v1/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v1/inventory/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(response.data.alerts || []);
      setStats((prev) => ({
        ...prev,
        totalAlerts: response.data.totalCount || 0,
        criticalCount: response.data.criticalCount || 0,
        lowStockCount: response.data.lowStockCount || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v1/inventory/recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecommendations(response.data.recommendations || []);
      setStats((prev) => ({
        ...prev,
        totalRecommendations: response.data.totalRecommendations || 0,
        estimatedTotalCost: response.data.estimatedTotalCost || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    }
  };

  const triggerAutoReorder = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/v1/inventory/auto-order`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPurchaseOrders(response.data.purchaseOrders || []);
      await fetchAlerts();
      await fetchRecommendations();
    } catch (error) {
      console.error('Failed to trigger auto-reorder:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/v1/inventory/alerts/${alertId}/resolve`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return 'bg-red-100 text-red-800';
      case 'OVERSTOCK':
        return 'bg-blue-100 text-blue-800';
      case 'EXPIRING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Smart Inventory Management</h1>
        <p className="mt-2 text-gray-600">
          AI-powered forecasting and automated reordering
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BellAlertIcon className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAlerts}</p>
              <p className="text-xs text-red-600">{stats.criticalCount} critical</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ShoppingCartIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recommendations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecommendations}</p>
              <p className="text-xs text-gray-600">reorder suggestions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Estimated Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.estimatedTotalCost.toFixed(2)}
              </p>
              <p className="text-xs text-gray-600">total reorder cost</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={triggerAutoReorder}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCartIcon className="h-5 w-5 mr-2" />
                Auto-Reorder
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('forecasts')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'forecasts'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Demand Forecasts
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'rules'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reorder Rules
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'alerts'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Alerts
              {stats.totalAlerts > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                  {stats.totalAlerts}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Reorder Recommendations
                </h3>
                {recommendations.length === 0 ? (
                  <p className="text-gray-500">No reorder recommendations at this time.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Current
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Order Qty
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Cost
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Supplier
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Urgency
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            ETA
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recommendations.map((rec) => (
                          <tr key={rec.productId}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {rec.productName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {rec.currentStock}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {rec.recommendedOrderQty}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${rec.estimatedCost.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {rec.supplier || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(
                                  rec.urgency
                                )}`}
                              >
                                {rec.urgency}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(rec.estimatedArrival).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {purchaseOrders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Generated Purchase Orders
                  </h3>
                  <div className="space-y-4">
                    {purchaseOrders.map((po, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{po.supplier}</h4>
                            <p className="text-sm text-gray-500">
                              {po.itemCount} items - Delivery:{' '}
                              {new Date(po.estimatedDelivery).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              ${po.totalCost.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {po.items.map((item) => (
                            <div
                              key={item.productId}
                              className="flex justify-between text-sm bg-gray-50 p-2 rounded"
                            >
                              <span className="text-gray-700">{item.productName}</span>
                              <span className="text-gray-900">
                                {item.quantity} × ${item.unitCost.toFixed(2)} = $
                                {item.totalCost.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Forecasts Tab */}
          {activeTab === 'forecasts' && (
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Product
                </label>
                <select
                  value={selectedProduct || ''}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Choose a product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (SKU: {product.sku || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && <ForecastChart productId={selectedProduct} />}
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && <ReorderRules products={products} onUpdate={fetchProducts} />}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div>
              {alerts.length === 0 ? (
                <p className="text-gray-500">No active alerts.</p>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="border border-gray-200 rounded-lg p-4 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getAlertTypeColor(
                              alert.type
                            )}`}
                          >
                            {alert.type}
                          </span>
                          <h4 className="font-semibold text-gray-900">
                            {alert.product.name}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          Triggered: {new Date(alert.triggered).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="ml-4 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartInventory;

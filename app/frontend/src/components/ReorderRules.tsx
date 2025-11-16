import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PencilIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

interface ReorderRule {
  id: string;
  productId: string;
  minStock: number;
  maxStock: number;
  reorderQty: number;
  leadTime: number;
  supplier: string | null;
  isActive: boolean;
  recommendedSafetyStock?: number;
}

interface ReorderRulesProps {
  products: Product[];
  onUpdate: () => void;
}

const ReorderRules: React.FC<ReorderRulesProps> = ({ products, onUpdate }) => {
  const [rules, setRules] = useState<Map<string, ReorderRule>>(new Map());
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    minStock: 0,
    maxStock: 0,
    reorderQty: 0,
    leadTime: 7,
    supplier: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [safetyStock, setSafetyStock] = useState<number | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchRules();
  }, [products]);

  const fetchRules = async () => {
    const rulesMap = new Map<string, ReorderRule>();

    for (const product of products) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_URL}/api/v1/inventory/reorder-rules/${product.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        rulesMap.set(product.id, response.data.rule);
      } catch (error) {
        // Rule doesn't exist for this product
      }
    }

    setRules(rulesMap);
  };

  const calculateSafetyStock = async (productId: string, leadTime: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/inventory/safety-stock/${productId}?leadTime=${leadTime}&serviceLevel=0.95`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSafetyStock(response.data.safetyStock);
    } catch (error) {
      console.error('Failed to calculate safety stock:', error);
    }
  };

  const startEdit = (product: Product) => {
    const rule = rules.get(product.id);

    if (rule) {
      setFormData({
        minStock: rule.minStock,
        maxStock: rule.maxStock,
        reorderQty: rule.reorderQty,
        leadTime: rule.leadTime,
        supplier: rule.supplier || '',
        isActive: rule.isActive,
      });
    } else {
      setFormData({
        minStock: Math.ceil(product.quantity * 0.2),
        maxStock: Math.ceil(product.quantity * 2),
        reorderQty: Math.ceil(product.quantity),
        leadTime: 7,
        supplier: '',
        isActive: true,
      });
    }

    setEditingProduct(product.id);
    calculateSafetyStock(product.id, formData.leadTime);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setSafetyStock(null);
  };

  const saveRule = async (productId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/v1/inventory/reorder-rules`,
        {
          productId,
          ...formData,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await fetchRules();
      setEditingProduct(null);
      setSafetyStock(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to save reorder rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadTimeChange = (leadTime: number) => {
    setFormData({ ...formData, leadTime });
    if (editingProduct) {
      calculateSafetyStock(editingProduct, leadTime);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">About Reorder Rules</h4>
        <p className="text-sm text-blue-800">
          Configure automatic reordering thresholds for each product. When stock falls below the
          minimum level, the system will generate reorder recommendations.
        </p>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
          <li>
            <strong>Min Stock:</strong> Alert threshold - reorder when stock falls below this level
          </li>
          <li>
            <strong>Max Stock:</strong> Target stock level after reordering
          </li>
          <li>
            <strong>Reorder Qty:</strong> Default quantity to order when restocking
          </li>
          <li>
            <strong>Lead Time:</strong> Days between ordering and receiving stock
          </li>
        </ul>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Current Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Min Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Max Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reorder Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Lead Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const rule = rules.get(product.id);
              const isEditing = editingProduct === product.id;

              return (
                <tr key={product.id} className={isEditing ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">SKU: {product.sku || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.quantity}
                  </td>

                  {isEditing ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={formData.minStock}
                          onChange={(e) =>
                            setFormData({ ...formData, minStock: parseFloat(e.target.value) })
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {safetyStock !== null && (
                          <div className="text-xs text-gray-500 mt-1">
                            Suggested: {safetyStock}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={formData.maxStock}
                          onChange={(e) =>
                            setFormData({ ...formData, maxStock: parseFloat(e.target.value) })
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={formData.reorderQty}
                          onChange={(e) =>
                            setFormData({ ...formData, reorderQty: parseFloat(e.target.value) })
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={formData.leadTime}
                          onChange={(e) => handleLeadTimeChange(parseInt(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="ml-1 text-xs text-gray-500">days</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={formData.supplier}
                          onChange={(e) =>
                            setFormData({ ...formData, supplier: e.target.value })
                          }
                          placeholder="Supplier name"
                          className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) =>
                              setFormData({ ...formData, isActive: e.target.checked })
                            }
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Active</span>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveRule(product.id)}
                            disabled={loading}
                            className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Save"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Cancel"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rule ? rule.minStock : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rule ? rule.maxStock : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rule ? rule.reorderQty : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rule ? `${rule.leadTime} days` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rule?.supplier || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {rule ? (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              rule.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not configured</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => startEdit(product)}
                          className="text-indigo-600 hover:text-indigo-800"
                          title={rule ? 'Edit rule' : 'Create rule'}
                        >
                          {rule ? (
                            <PencilIcon className="h-5 w-5" />
                          ) : (
                            <PlusIcon className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No products available. Create products first to configure reorder rules.</p>
        </div>
      )}
    </div>
  );
};

export default ReorderRules;

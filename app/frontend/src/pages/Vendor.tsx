import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  Star,
  ShoppingCart,
  FileText,
  TrendingUp,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
} from 'lucide-react';

interface Vendor {
  id: string;
  vendorName: string;
  email: string;
  phone?: string;
  category: string;
  status: string;
  paymentTerms: string;
  createdAt: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  totalAmount: number;
  status: string;
  dueDate: string;
}

interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
}

interface VendorRating {
  id: string;
  rating: number;
  category: string;
  comment?: string;
}

const Vendor: React.FC = () => {
  const [activeTab, setActiveTab] = useState('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [ratings, setRatings] = useState<VendorRating[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    headers: {
      Authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
    },
  });

  useEffect(() => {
    fetchAllData();
  }, [activeTab, filterStatus]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'vendors') {
        const params = filterStatus !== 'all' ? { status: filterStatus } : {};
        const res = await apiClient.get('/vendor/vendors', { params });
        setVendors(res.data);
      } else if (activeTab === 'analytics') {
        const res = await apiClient.get('/vendor/analytics');
        setAnalytics(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVendor = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    try {
      const poRes = await apiClient.get('/vendor/purchase-orders', { params: { vendorId: vendor.id } });
      setPurchaseOrders(poRes.data);
      const invRes = await apiClient.get('/vendor/invoices', { params: { vendorId: vendor.id } });
      setInvoices(invRes.data);
      const ratingRes = await apiClient.get(`/vendor/vendors/${vendor.id}/ratings`);
      setRatings(ratingRes.data);
    } catch (error) {
      console.error('Failed to fetch vendor details:', error);
    }
  };

  const handleCreateVendor = async (formData: any) => {
    try {
      await apiClient.post('/vendor/vendors', formData);
      setShowCreateForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create vendor:', error);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      await apiClient.delete(`/vendor/vendors/${vendorId}`);
      fetchAllData();
    } catch (error) {
      console.error('Failed to delete vendor:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900 text-green-200';
      case 'inactive':
        return 'bg-slate-700 text-slate-300';
      case 'pending':
        return 'bg-yellow-900 text-yellow-200';
      case 'paid':
        return 'bg-blue-900 text-blue-200';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'supplies':
        return '📦';
      case 'services':
        return '🔧';
      case 'professional':
        return '👔';
      default:
        return '🏢';
    }
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(Math.min(Math.floor(rating), 5));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Vendor Management & Procurement</h1>
          <p className="text-slate-400">Manage vendors, purchase orders, invoices, and supplier performance</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-2 ${activeTab === 'vendors' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Vendors
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 ${activeTab === 'details' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
            disabled={!selectedVendor}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 ${activeTab === 'analytics' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Analytics
          </button>
        </div>

        {activeTab === 'vendors' && (
          <div className="space-y-6">
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                <Plus className="w-5 h-5" />
                Add Vendor
              </button>
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 pl-10 rounded-lg"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-700 text-white px-4 py-2 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors
                .filter((v) => v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((vendor) => (
                  <div
                    key={vendor.id}
                    onClick={() => {
                      handleSelectVendor(vendor);
                      setActiveTab('details');
                    }}
                    className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500 cursor-pointer transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(vendor.category)}</span>
                        <div>
                          <h3 className="font-bold text-white">{vendor.vendorName}</h3>
                          <p className="text-xs text-slate-400">{vendor.category}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(vendor.status)}`}>
                        {vendor.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-slate-400">📧 {vendor.email}</p>
                      {vendor.phone && <p className="text-slate-400">📱 {vendor.phone}</p>}
                      <p className="text-slate-400">💰 {vendor.paymentTerms}</p>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVendor(vendor.id);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'details' && selectedVendor && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedVendor.vendorName}</h2>
                  <p className="text-slate-400">{selectedVendor.category.toUpperCase()}</p>
                </div>
                <span className={`px-4 py-2 rounded font-medium ${getStatusColor(selectedVendor.status)}`}>
                  {selectedVendor.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Email</p>
                  <p className="text-white font-medium">{selectedVendor.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Phone</p>
                  <p className="text-white font-medium">{selectedVendor.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Payment Terms</p>
                  <p className="text-white font-medium">{selectedVendor.paymentTerms}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Member Since</p>
                  <p className="text-white font-medium">{new Date(selectedVendor.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {purchaseOrders.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Purchase Orders</h3>
                <div className="space-y-3">
                  {purchaseOrders.slice(0, 5).map((po) => (
                    <div key={po.id} className="flex items-center justify-between bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="font-semibold text-white">{po.poNumber}</p>
                          <p className="text-sm text-slate-400">{new Date(po.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">${po.totalAmount.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invoices.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Invoices</h3>
                <div className="space-y-3">
                  {invoices.slice(0, 5).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-orange-400" />
                        <div>
                          <p className="font-semibold text-white">{inv.invoiceNumber}</p>
                          <p className="text-sm text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-400">${inv.amount.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ratings.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Performance Ratings</h3>
                <div className="space-y-3">
                  {ratings.map((rating) => (
                    <div key={rating.id} className="bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium">{rating.category}</p>
                          <p className="text-sm text-slate-400 mt-1">{rating.comment}</p>
                        </div>
                        <div className="text-xl">{renderStars(rating.rating)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Total Vendors</p>
                <p className="text-3xl font-bold">{analytics.vendorMetrics?.totalVendors}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Active Vendors</p>
                <p className="text-3xl font-bold">{analytics.vendorMetrics?.activeVendors}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Total PO Amount</p>
                <p className="text-3xl font-bold">${analytics.purchasingMetrics?.totalPoAmount.toFixed(0)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Pending Invoices</p>
                <p className="text-3xl font-bold">${analytics.invoiceMetrics?.pendingInvoiceAmount.toFixed(0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Purchasing Metrics</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Purchase Orders</span>
                    <span className="text-white font-semibold">{analytics.purchasingMetrics?.totalPOs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Completed POs</span>
                    <span className="text-green-400 font-semibold">{analytics.purchasingMetrics?.completedPos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg PO Amount</span>
                    <span className="text-white font-semibold">${analytics.purchasingMetrics?.avgPoAmount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Invoice Metrics</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Invoices</span>
                    <span className="text-white font-semibold">{analytics.invoiceMetrics?.totalInvoices}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paid Invoices</span>
                    <span className="text-blue-400 font-semibold">{analytics.invoiceMetrics?.paidInvoices}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pending Invoices</span>
                    <span className="text-yellow-400 font-semibold">{analytics.invoiceMetrics?.pendingInvoices}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Add Vendor</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateVendor({ vendorName: 'New Vendor', email: 'vendor@example.com' });
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  placeholder="Vendor Name"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg"
                />
                <select className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg">
                  <option>Supplies</option>
                  <option>Services</option>
                  <option>Professional</option>
                  <option>Other</option>
                </select>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                  Add Vendor
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vendor;

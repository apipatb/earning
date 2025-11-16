import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, TrendingUp } from 'lucide-react';
import { customersAPI, Customer, CustomerData } from '../lib/api';
import { notify } from '../store/notification.store';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CustomerData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    city: '',
    country: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.customers);
    } catch (error) {
      notify.error('Error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.name.trim() === '') {
      notify.error('Validation Error', 'Name is required');
      return;
    }

    // Validate email format if provided
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        notify.error('Validation Error', 'Please enter a valid email address');
        return;
      }
    }

    // Validate phone format if provided (basic check for non-empty)
    if (formData.phone && formData.phone.trim() === '') {
      // Allow empty phone, but trim it if it's provided
      formData.phone = '';
    }

    try {
      if (editingId) {
        await customersAPI.update(editingId, formData);
        setCustomers(customers.map((c) => (c.id === editingId ? { ...c, ...formData } : c)));
        notify.success('Success', 'Customer updated');
      } else {
        const response = await customersAPI.create(formData);
        setCustomers([response.customer, ...customers]);
        notify.success('Success', 'Customer created');
      }
      resetForm();
    } catch (error) {
      notify.error('Error', 'Failed to save customer');
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      city: customer.city || '',
      country: customer.country || '',
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try {
      await customersAPI.delete(id);
      setCustomers(customers.filter((c) => c.id !== id));
      notify.success('Customer Deleted', 'Customer has been removed');
    } catch (error) {
      notify.error('Error', 'Failed to delete customer');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', company: '', city: '', country: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const topCustomers = [...customers].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 3);
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalPurchases, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm font-medium text-gray-500">Total Customers</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{totalCustomers}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm font-medium text-gray-500">Total Revenue</p>
          <p className="mt-2 text-3xl font-extrabold text-green-600">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm font-medium text-gray-500">Avg Customer Value</p>
          <p className="mt-2 text-3xl font-extrabold text-blue-600">
            ${totalCustomers > 0 ? (totalRevenue / totalCustomers).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Top Customers */}
      {topCustomers.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Top Customers</h2>
          </div>
          <div className="space-y-3">
            {topCustomers.map((c, idx) => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">#{idx + 1} {c.name}</p>
                  <p className="text-sm text-gray-600">{c.purchaseCount} purchase(s)</p>
                </div>
                <p className="font-medium text-green-600">${c.totalPurchases.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                rows={3}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                {editingId ? 'Update' : 'Create'} Customer
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

      {/* Customers List */}
      <div>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-white shadow rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{customer.name}</h3>
                    {customer.company && <p className="text-sm text-gray-600">{customer.company}</p>}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {customer.email && <p className="text-gray-600">{customer.email}</p>}
                  {customer.phone && <p className="text-gray-600">{customer.phone}</p>}
                  <p className="font-medium text-gray-900 mt-3">
                    LTV: ${customer.totalPurchases.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {customer.purchaseCount} purchase{customer.purchaseCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}

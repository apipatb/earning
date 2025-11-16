import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, TrendingUp } from 'lucide-react';
import { customersAPI } from '../lib/api';
import { notify } from '../store/notification.store';
import { useFormValidation } from '../hooks/useFormValidation';
import { validateRequired, validateEmail, validatePhoneNumber, validateName } from '../lib/form-validation';
import { FormInput, FormTextarea } from '../components/FormError';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const initialFormData = {
    name: '',
    email: '',
    phone: '',
    company: '',
    city: '',
    country: '',
    notes: '',
  };

  const { values: formData, errors, touched, handleChange, handleBlur, handleSubmit, resetForm: resetFormValidation, setFieldValue } = useFormValidation(
    initialFormData,
    {
      validators: {
        name: validateName,
        email: (fieldName, value) => {
          if (!value) return { isValid: true }; // Optional field
          return validateEmail(value);
        },
        phone: (fieldName, value) => {
          if (!value) return { isValid: true }; // Optional field
          return validatePhoneNumber(value);
        },
      },
      validateOnBlur: true,
      validateOnChange: false,
      validateOnSubmit: true,
    }
  );

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.customers);
    } catch (error) {
      console.error('Failed to load customers:', error);
      notify.error('Error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const onFormSubmit = async (values: Record<string, any>) => {
    try {
      if (editingId) {
        await customersAPI.update(editingId, values);
        setCustomers(customers.map((c) => (c.id === editingId ? { ...c, ...values } : c)));
        notify.success('Success', 'Customer updated');
      } else {
        const response = await customersAPI.create(values);
        setCustomers([response.customer, ...customers]);
        notify.success('Success', 'Customer created');
      }
      resetFormComplete();
    } catch (error) {
      notify.error('Error', 'Failed to save customer');
    }
  };

  const handleEdit = (customer: any) => {
    setFieldValue('name', customer.name);
    setFieldValue('email', customer.email || '');
    setFieldValue('phone', customer.phone || '');
    setFieldValue('company', customer.company || '');
    setFieldValue('city', customer.city || '');
    setFieldValue('country', customer.country || '');
    setFieldValue('notes', customer.notes || '');
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

  const resetFormComplete = () => {
    resetFormValidation();
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
          onClick={() => (showForm ? resetFormComplete() : setShowForm(true))}
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
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                label="Name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.name?.message}
                touched={touched.name}
                required
              />

              <FormInput
                label="Email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.email?.message}
                touched={touched.email}
                helperText="(Optional)"
              />

              <FormInput
                label="Phone"
                name="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.phone?.message}
                touched={touched.phone}
                helperText="(Optional)"
              />

              <FormInput
                label="Company"
                name="company"
                type="text"
                placeholder="Acme Inc."
                value={formData.company}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.company?.message}
                touched={touched.company}
              />

              <FormInput
                label="City"
                name="city"
                type="text"
                placeholder="New York"
                value={formData.city}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.city?.message}
                touched={touched.city}
              />

              <FormInput
                label="Country"
                name="country"
                type="text"
                placeholder="United States"
                value={formData.country}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.country?.message}
                touched={touched.country}
              />
            </div>

            <FormTextarea
              label="Notes"
              name="notes"
              placeholder="Add any notes about this customer..."
              value={formData.notes}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.notes?.message}
              touched={touched.notes}
              rows={3}
            />

            <div className="flex space-x-2">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 disabled:opacity-50"
                disabled={Object.values(errors).some((e) => e !== undefined) && Object.keys(touched).length > 0}
              >
                {editingId ? 'Update' : 'Create'} Customer
              </button>
              <button
                type="button"
                onClick={resetFormComplete}
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

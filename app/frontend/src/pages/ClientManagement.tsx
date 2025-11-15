import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, DollarSign, Briefcase, Mail, Phone } from 'lucide-react';
import { notify } from '../store/notification.store';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  totalEarned: number;
  activeProjects: number;
  hourlyRate?: number;
  notes?: string;
  createdAt: string;
}

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    hourlyRate: '',
    notes: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('clients');
    if (saved) {
      setClients(JSON.parse(saved));
    }
  }, []);

  const saveToStorage = (data: Client[]) => {
    localStorage.setItem('clients', JSON.stringify(data));
    setClients(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      notify.warning('Missing Fields', 'Name and email are required');
      return;
    }

    if (editingId) {
      const updated = clients.map((c) =>
        c.id === editingId
          ? {
              ...c,
              name: formData.name,
              email: formData.email,
              phone: formData.phone || undefined,
              company: formData.company || undefined,
              hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
              notes: formData.notes || undefined,
            }
          : c
      );
      saveToStorage(updated);
      notify.success('Client Updated', `${formData.name} has been updated`);
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        totalEarned: 0,
        activeProjects: 0,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
        notes: formData.notes || undefined,
        createdAt: new Date().toISOString(),
      };
      saveToStorage([...clients, newClient]);
      notify.success('Client Added', `${formData.name} has been added to your clients`);
    }

    resetForm();
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      hourlyRate: client.hourlyRate?.toString() || '',
      notes: client.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete client "${name}"?`)) return;

    const updated = clients.filter((c) => c.id !== id);
    saveToStorage(updated);
    notify.success('Client Deleted', `${name} has been removed`);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      hourlyRate: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getTotalEarned = () => {
    return clients.reduce((sum, c) => sum + c.totalEarned, 0);
  };

  const getActiveClients = () => {
    return clients.filter((c) => c.activeProjects > 0).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your clients and track relationships
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {clients.length}
              </p>
            </div>
            <Users className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Active Clients</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {getActiveClients()}
              </p>
            </div>
            <Briefcase className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                ${getTotalEarned().toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Edit Client' : 'New Client'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Acme Inc."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hourly Rate
                </label>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this client..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {editingId ? 'Update Client' : 'Add Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Client List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Users className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No clients yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add your first client</p>
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 hover:shadow-lg transition-shadow animate-fade-in"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {client.name}
                  </h3>
                  {client.company && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{client.company}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(client)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id, client.name)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span>{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Total Earned</p>
                  <p className="font-semibold text-gray-900 dark:text-white mt-1">
                    ${client.totalEarned.toFixed(2)}
                  </p>
                </div>
                {client.hourlyRate && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Hourly Rate</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">
                      ${client.hourlyRate.toFixed(2)}/h
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

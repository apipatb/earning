import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, CheckCircle, XCircle, Search } from 'lucide-react';
import { smsAPI, PhoneContact } from '../lib/api';
import { notify } from '../store/notification.store';

export default function SMSContactList() {
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<PhoneContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptedIn, setFilterOptedIn] = useState<boolean | undefined>(undefined);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    name: '',
    notes: '',
  });

  useEffect(() => {
    loadContacts();
  }, [filterOptedIn]);

  const loadContacts = async () => {
    try {
      const params: any = {};
      if (filterOptedIn !== undefined) {
        params.optedIn = filterOptedIn;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await smsAPI.getContacts(params);
      setContacts(response.contacts);
    } catch (error) {
      notify.error('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingContact(null);
    setFormData({ phoneNumber: '', name: '', notes: '' });
    setShowForm(true);
  };

  const handleEdit = (contact: PhoneContact) => {
    setEditingContact(contact);
    setFormData({
      phoneNumber: contact.phoneNumber,
      name: contact.name || '',
      notes: contact.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return;

    try {
      await smsAPI.deleteContact(id);
      notify.success('Contact Deleted', 'Contact has been removed');
      loadContacts();
    } catch (error) {
      notify.error('Error', 'Failed to delete contact');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phoneNumber) {
      notify.error('Validation Error', 'Phone number is required');
      return;
    }

    try {
      if (editingContact) {
        await smsAPI.updateContact(editingContact.id, formData);
        notify.success('Success', 'Contact updated');
      } else {
        await smsAPI.addContact(formData);
        notify.success('Success', 'Contact added');
      }
      setShowForm(false);
      loadContacts();
    } catch (error) {
      notify.error('Error', 'Failed to save contact');
    }
  };

  const handleSearch = () => {
    loadContacts();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Phone Contacts</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name or phone..."
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterOptedIn(undefined)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterOptedIn === undefined
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterOptedIn(true)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterOptedIn === true
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Opted In
            </button>
            <button
              onClick={() => setFilterOptedIn(false)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterOptedIn === false
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Opted Out
            </button>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
          <p className="text-gray-600 mb-4">Add contacts to start sending SMS campaigns</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Contact
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {contact.name || 'Unnamed'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{contact.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {contact.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                      {contact.isOptedIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <CheckCircle className="w-3 h-3" />
                          Opted In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          Opted Out
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {contact.notes || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Contact"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contact Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingContact ? 'Edit Contact' : 'Add Contact'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number * (E.164 format)
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+14155552671"
                    required
                    disabled={!!editingContact}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: +[country code][number]
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional notes about this contact"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Home, FileText, DollarSign, Files, Settings, BarChart3 } from 'lucide-react';
import PortalProfile from '../components/PortalProfile';
import PortalTickets from '../components/PortalTickets';
import PortalInvoices from '../components/PortalInvoices';
import PortalDocuments from '../components/PortalDocuments';

type Tab = 'overview' | 'tickets' | 'invoices' | 'documents' | 'settings';

export default function CustomerPortal() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs = [
    { id: 'overview' as Tab, name: 'Overview', icon: Home },
    { id: 'tickets' as Tab, name: 'Support Tickets', icon: FileText },
    { id: 'invoices' as Tab, name: 'Invoices', icon: DollarSign },
    { id: 'documents' as Tab, name: 'Documents', icon: Files },
    { id: 'settings' as Tab, name: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Customer Portal</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your account, view invoices, and get support
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div>
            <PortalProfile />
          </div>
        )}

        {activeTab === 'tickets' && (
          <div>
            <PortalTickets />
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <PortalInvoices />
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <PortalDocuments />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Notification Preferences</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                      defaultChecked
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Email notifications for new invoices
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                      defaultChecked
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Email notifications for ticket updates
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Marketing emails
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Privacy</h3>
                <p className="text-sm text-gray-600">
                  Your data is secure and private. We never share your information with
                  third parties.
                </p>
              </div>

              <div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Plus,
  Send,
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  BarChart3,
} from 'lucide-react';
import { smsAPI, SMSCampaign, SMSTemplate } from '../lib/api';
import { notify } from '../store/notification.store';
import SMSTemplateEditor from '../components/SMSTemplateEditor';
import SMSCampaignBuilder from '../components/SMSCampaignBuilder';
import SMSContactList from '../components/SMSContactList';

export default function SMSCampaigns() {
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'contacts'>('campaigns');
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<SMSCampaign | null>(null);
  const [showCampaignLogs, setShowCampaignLogs] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [campaignsRes, templatesRes] = await Promise.all([
        smsAPI.getCampaigns(),
        smsAPI.getTemplates(),
      ]);
      setCampaigns(campaignsRes.campaigns);
      setTemplates(templatesRes.templates);
    } catch (error) {
      notify.error('Error', 'Failed to load SMS data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    if (!confirm('Send this SMS campaign? This will send messages to all recipients.')) return;

    try {
      const result = await smsAPI.sendCampaign(campaignId);
      notify.success('Campaign Sent', `Sent ${result.sent} messages successfully`);
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to send campaign');
    }
  };

  const handleViewLogs = (campaign: SMSCampaign) => {
    setSelectedCampaign(campaign);
    setShowCampaignLogs(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'SENDING':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'DRAFT':
      case 'SCHEDULED':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'CANCELLED':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 text-green-800';
      case 'SENDING':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SCHEDULED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Campaigns</h1>
        <p className="text-gray-600">Create and manage SMS marketing campaigns</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
            </div>
            <MessageSquare className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Templates</p>
              <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
            </div>
            <BarChart3 className="w-10 h-10 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sent Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">
                {campaigns.filter((c) => c.status === 'SENT').length}
              </p>
            </div>
            <Send className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">
                {campaigns.reduce((sum, c) => sum + c.messageCount, 0)}
              </p>
            </div>
            <Users className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'campaigns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contacts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Contacts
          </button>
        </nav>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Campaigns</h2>
            <button
              onClick={() => setShowCampaignBuilder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first SMS campaign</p>
              <button
                onClick={() => setShowCampaignBuilder(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Messages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {campaign.template?.name || 'No template'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{campaign.recipientCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            campaign.status
                          )}`}
                        >
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaign.messageCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {campaign.status === 'DRAFT' && (
                            <button
                              onClick={() => handleSendCampaign(campaign.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Send Campaign"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewLogs(campaign)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Logs"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <SMSTemplateEditor templates={templates} onTemplateChange={loadData} />
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && <SMSContactList />}

      {/* Campaign Builder Modal */}
      {showCampaignBuilder && (
        <SMSCampaignBuilder
          templates={templates}
          onClose={() => setShowCampaignBuilder(false)}
          onSuccess={() => {
            setShowCampaignBuilder(false);
            loadData();
          }}
        />
      )}

      {/* Campaign Logs Modal */}
      {showCampaignLogs && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Campaign Logs: {selectedCampaign.name}
                </h3>
                <button
                  onClick={() => setShowCampaignLogs(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <CampaignLogsView campaignId={selectedCampaign.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Campaign Logs Component
function CampaignLogsView({ campaignId }: { campaignId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [campaignId]);

  const loadLogs = async () => {
    try {
      const response = await smsAPI.getCampaignLogs(campaignId);
      setLogs(response.logs);
    } catch (error) {
      notify.error('Error', 'Failed to load campaign logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No logs available</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">{log.phoneNumber}</p>
                  <p className="text-sm text-gray-600">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    log.status === 'DELIVERED'
                      ? 'bg-green-100 text-green-800'
                      : log.status === 'SENT'
                      ? 'bg-blue-100 text-blue-800'
                      : log.status === 'FAILED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {log.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{log.message}</p>
              {log.error && (
                <p className="text-sm text-red-600">Error: {log.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { X, Save, Plus, Trash2, Upload } from 'lucide-react';
import { smsAPI, SMSTemplate, SMSCampaignData } from '../lib/api';
import { notify } from '../store/notification.store';

interface SMSCampaignBuilderProps {
  templates: SMSTemplate[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function SMSCampaignBuilder({
  templates,
  onClose,
  onSuccess,
}: SMSCampaignBuilderProps) {
  const [formData, setFormData] = useState<SMSCampaignData>({
    name: '',
    templateId: '',
    recipients: [],
    scheduledFor: undefined,
  });
  const [recipientInput, setRecipientInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setSelectedTemplate(template || null);
    setFormData({ ...formData, templateId });
  };

  const handleAddRecipient = () => {
    if (recipientInput.trim()) {
      const newRecipients = recipientInput
        .split(/[\n,;]/)
        .map((num) => num.trim())
        .filter((num) => num);
      setFormData({
        ...formData,
        recipients: [...formData.recipients, ...newRecipients],
      });
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter((_, i) => i !== index),
    });
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const numbers = text
        .split(/[\n,;]/)
        .map((num) => num.trim())
        .filter((num) => num);
      setFormData({
        ...formData,
        recipients: [...formData.recipients, ...numbers],
      });
      notify.success('Success', `Added ${numbers.length} phone numbers`);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.templateId || formData.recipients.length === 0) {
      notify.error('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      await smsAPI.createCampaign(formData);
      notify.success('Success', 'SMS campaign created successfully');
      onSuccess();
    } catch (error) {
      notify.error('Error', 'Failed to create campaign');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Create SMS Campaign</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Holiday Promotion"
                required
              />
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template *
              </label>
              <select
                value={formData.templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <p className="text-sm text-gray-600">{selectedTemplate.content}</p>
                  {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Variables:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedTemplate.variables.map((variable) => (
                          <span
                            key={variable}
                            className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipients * ({formData.recipients.length} added)
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <textarea
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter phone numbers (one per line, or comma/semicolon separated)&#10;+14155552671&#10;+14155552672"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleAddRecipient}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add
                    </button>
                    <label className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-center whitespace-nowrap">
                      <Upload className="w-4 h-4 inline mr-1" />
                      Upload CSV
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleBulkUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {formData.recipients.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {formData.recipients.map((recipient, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm text-gray-700">{recipient}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule For (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledFor || ''}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to create as draft. You can send it manually later.
              </p>
            </div>

            {/* Campaign Summary */}
            {formData.recipients.length > 0 && selectedTemplate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Campaign Summary</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>Recipients: {formData.recipients.length}</p>
                  <p>
                    Estimated length: {selectedTemplate.content.length} characters (
                    {Math.ceil(selectedTemplate.content.length / 160)} SMS)
                  </p>
                  {formData.scheduledFor && (
                    <p>
                      Scheduled: {new Date(formData.scheduledFor).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Create Campaign
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

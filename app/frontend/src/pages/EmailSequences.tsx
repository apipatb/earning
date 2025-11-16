import { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Mail,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
} from 'lucide-react';
import {
  emailsAPI,
  EmailSequence,
  EmailSequenceData,
  EmailTemplate,
  EmailTemplateData,
} from '../lib/api';
import { notify } from '../store/notification.store';

export default function EmailSequences() {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sequences' | 'templates'>('sequences');
  const [showSequenceForm, setShowSequenceForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Sequence form state
  const [sequenceName, setSequenceName] = useState('');
  const [sequenceTrigger, setSequenceTrigger] = useState('');
  const [sequenceSteps, setSequenceSteps] = useState<EmailSequenceData['steps']>([]);
  const [sequenceActive, setSequenceActive] = useState(true);

  // Template form state
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [seqResponse, tempResponse, statsResponse] = await Promise.all([
        emailsAPI.getSequences(),
        emailsAPI.getTemplates(),
        emailsAPI.getStats(),
      ]);
      setSequences(seqResponse.sequences);
      setTemplates(tempResponse.templates);
      setStats(statsResponse.stats);
    } catch (error) {
      notify.error('Error', 'Failed to load email data');
    } finally {
      setLoading(false);
    }
  };

  // Sequence handlers
  const handleCreateSequence = () => {
    setEditingSequence(null);
    setSequenceName('');
    setSequenceTrigger('');
    setSequenceSteps([{ delay: 0, subject: '', body: '' }]);
    setSequenceActive(true);
    setShowSequenceForm(true);
  };

  const handleEditSequence = (sequence: EmailSequence) => {
    setEditingSequence(sequence);
    setSequenceName(sequence.name);
    setSequenceTrigger(sequence.trigger);
    setSequenceSteps(sequence.steps);
    setSequenceActive(sequence.isActive);
    setShowSequenceForm(true);
  };

  const handleSaveSequence = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sequenceName || !sequenceTrigger || sequenceSteps.length === 0) {
      notify.error('Validation Error', 'Please fill in all required fields');
      return;
    }

    const data: EmailSequenceData = {
      name: sequenceName,
      trigger: sequenceTrigger,
      steps: sequenceSteps,
      isActive: sequenceActive,
    };

    try {
      if (editingSequence) {
        await emailsAPI.updateSequence(editingSequence.id, data);
        notify.success('Success', 'Email sequence updated');
      } else {
        await emailsAPI.createSequence(data);
        notify.success('Success', 'Email sequence created');
      }
      setShowSequenceForm(false);
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to save email sequence');
    }
  };

  const handleDeleteSequence = async (id: string) => {
    if (!confirm('Delete this email sequence?')) return;
    try {
      await emailsAPI.deleteSequence(id);
      setSequences(sequences.filter((s) => s.id !== id));
      notify.success('Sequence Deleted', 'Email sequence has been removed');
    } catch (error) {
      notify.error('Error', 'Failed to delete email sequence');
    }
  };

  // Template handlers
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateSubject('');
    setTemplateBody('');
    setTemplateVariables([]);
    setShowTemplateForm(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateSubject(template.subject);
    setTemplateBody(template.htmlBody);
    setTemplateVariables(template.variables || []);
    setShowTemplateForm(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateName || !templateSubject || !templateBody) {
      notify.error('Validation Error', 'Please fill in all required fields');
      return;
    }

    const data: EmailTemplateData = {
      name: templateName,
      subject: templateSubject,
      htmlBody: templateBody,
      variables: templateVariables,
    };

    try {
      if (editingTemplate) {
        await emailsAPI.updateTemplate(editingTemplate.id, data);
        notify.success('Success', 'Email template updated');
      } else {
        await emailsAPI.createTemplate(data);
        notify.success('Success', 'Email template created');
      }
      setShowTemplateForm(false);
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to save email template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this email template?')) return;
    try {
      await emailsAPI.deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
      notify.success('Template Deleted', 'Email template has been removed');
    } catch (error) {
      notify.error('Error', 'Failed to delete email template');
    }
  };

  const addSequenceStep = () => {
    setSequenceSteps([...sequenceSteps, { delay: 24, subject: '', body: '' }]);
  };

  const removeSequenceStep = (index: number) => {
    setSequenceSteps(sequenceSteps.filter((_, i) => i !== index));
  };

  const updateSequenceStep = (index: number, field: string, value: any) => {
    setSequenceSteps(
      sequenceSteps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Email Automation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage email sequences and templates
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sent</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {stats.total}
                </p>
              </div>
              <Mail className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="text-red-600" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bounced</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.bounced}</p>
              </div>
              <Activity className="text-yellow-600" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('sequences')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sequences'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Email Sequences
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Email Templates
          </button>
        </nav>
      </div>

      {activeTab === 'sequences' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Email Sequences
            </h2>
            <button
              onClick={handleCreateSequence}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create Sequence
            </button>
          </div>

          {showSequenceForm ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <form onSubmit={handleSaveSequence} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sequence Name
                  </label>
                  <input
                    type="text"
                    value={sequenceName}
                    onChange={(e) => setSequenceName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Trigger
                  </label>
                  <input
                    type="text"
                    value={sequenceTrigger}
                    onChange={(e) => setSequenceTrigger(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="e.g., new_customer, abandoned_cart"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Steps
                    </label>
                    <button
                      type="button"
                      onClick={addSequenceStep}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + Add Step
                    </button>
                  </div>
                  {sequenceSteps.map((step, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          Step {index + 1}
                        </span>
                        {sequenceSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSequenceStep(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            Delay (hours)
                          </label>
                          <input
                            type="number"
                            value={step.delay}
                            onChange={(e) =>
                              updateSequenceStep(index, 'delay', parseInt(e.target.value))
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={step.subject}
                            onChange={(e) =>
                              updateSequenceStep(index, 'subject', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            Body
                          </label>
                          <textarea
                            value={step.body}
                            onChange={(e) =>
                              updateSequenceStep(index, 'body', e.target.value)
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sequenceActive"
                    checked={sequenceActive}
                    onChange={(e) => setSequenceActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="sequenceActive"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Sequence is active
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSequenceForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Sequence
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid gap-4">
              {sequences.map((sequence) => (
                <div
                  key={sequence.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        {sequence.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Trigger: {sequence.trigger}</span>
                        <span>{sequence.steps.length} steps</span>
                        <span>{sequence.emailsSent} emails sent</span>
                        {sequence.isActive ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-gray-400">Inactive</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSequence(sequence)}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteSequence(sequence.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Email Templates
            </h2>
            <button
              onClick={handleCreateTemplate}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create Template
            </button>
          </div>

          {showTemplateForm ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    HTML Body
                  </label>
                  <textarea
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTemplateForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Subject: {template.subject}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

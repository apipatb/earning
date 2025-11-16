import { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { Workflow, WorkflowData, WorkflowAction } from '../lib/api';

interface WorkflowBuilderProps {
  workflow: Workflow | null;
  onSave: (data: WorkflowData) => void;
  onCancel: () => void;
}

export default function WorkflowBuilder({ workflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [name, setName] = useState(workflow?.name || '');
  const [trigger, setTrigger] = useState<WorkflowData['trigger']>(
    workflow?.trigger || 'EARNING_CREATED'
  );
  const [actions, setActions] = useState<WorkflowAction[]>(workflow?.actions || []);
  const [isActive, setIsActive] = useState(workflow?.isActive ?? true);

  const triggerOptions = [
    { value: 'EARNING_CREATED', label: 'Earning Created' },
    { value: 'INVOICE_PAID', label: 'Invoice Paid' },
    { value: 'LOW_STOCK', label: 'Low Stock' },
    { value: 'CUSTOMER_CREATED', label: 'Customer Created' },
    { value: 'GOAL_COMPLETED', label: 'Goal Completed' },
  ] as const;

  const actionTypeOptions = [
    { value: 'send_email', label: 'Send Email' },
    { value: 'create_task', label: 'Create Task' },
    { value: 'update_record', label: 'Update Record' },
    { value: 'call_webhook', label: 'Call Webhook' },
  ] as const;

  const addAction = () => {
    setActions([
      ...actions,
      {
        type: 'send_email',
        config: { to: '', subject: '', body: '' },
      },
    ]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
    setActions(
      actions.map((action, i) => (i === index ? { ...action, ...updates } : action))
    );
  };

  const updateActionConfig = (index: number, key: string, value: any) => {
    setActions(
      actions.map((action, i) =>
        i === index
          ? {
              ...action,
              config: {
                ...action.config,
                [key]: value,
              },
            }
          : action
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    if (actions.length === 0) {
      alert('Please add at least one action');
      return;
    }

    onSave({
      name,
      trigger,
      actions,
      isActive,
    });
  };

  const renderActionConfig = (action: WorkflowAction, index: number) => {
    switch (action.type) {
      case 'send_email':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To (Email)
              </label>
              <input
                type="email"
                value={action.config.to || ''}
                onChange={(e) => updateActionConfig(index, 'to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="recipient@example.com or {{email}}"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={action.config.subject || ''}
                onChange={(e) => updateActionConfig(index, 'subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Email subject (use {{variable}} for dynamic content)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Body (HTML)
              </label>
              <textarea
                value={action.config.body || ''}
                onChange={(e) => updateActionConfig(index, 'body', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Email body (HTML supported, use {{variable}} for dynamic content)"
              />
            </div>
          </div>
        );

      case 'create_task':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Title
              </label>
              <input
                type="text"
                value={action.config.taskTitle || ''}
                onChange={(e) => updateActionConfig(index, 'taskTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={action.config.taskDescription || ''}
                onChange={(e) =>
                  updateActionConfig(index, 'taskDescription', e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Task description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={action.config.taskDueDate || ''}
                onChange={(e) => updateActionConfig(index, 'taskDueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
        );

      case 'call_webhook':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                value={action.config.webhookUrl || ''}
                onChange={(e) => updateActionConfig(index, 'webhookUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Method
              </label>
              <select
                value={action.config.webhookMethod || 'POST'}
                onChange={(e) => updateActionConfig(index, 'webhookMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>
        );

      case 'update_record':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Record Type
              </label>
              <input
                type="text"
                value={action.config.recordType || ''}
                onChange={(e) => updateActionConfig(index, 'recordType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="e.g., customer, product, invoice"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Record ID
              </label>
              <input
                type="text"
                value={action.config.recordId || ''}
                onChange={(e) => updateActionConfig(index, 'recordId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Record ID or {{id}}"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {workflow ? 'Edit Workflow' : 'Create Workflow'}
          </h1>
          <button
            onClick={onCancel}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Enter workflow name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trigger Event
                </label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as WorkflowData['trigger'])}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  {triggerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="isActive"
                  className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Workflow is active
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Actions
              </h2>
              <button
                type="button"
                onClick={addAction}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Add Action
              </button>
            </div>

            {actions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No actions added yet. Click "Add Action" to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {actions.map((action, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Action Type
                        </label>
                        <select
                          value={action.type}
                          onChange={(e) =>
                            updateAction(index, {
                              type: e.target.value as WorkflowAction['type'],
                              config: {},
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        >
                          {actionTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAction(index)}
                        className="ml-3 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    {renderActionConfig(action, index)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={20} />
              Save Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

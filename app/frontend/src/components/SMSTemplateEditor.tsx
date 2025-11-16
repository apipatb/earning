import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { smsAPI, SMSTemplate, SMSTemplateData } from '../lib/api';
import { notify } from '../store/notification.store';

interface SMSTemplateEditorProps {
  templates: SMSTemplate[];
  onTemplateChange: () => void;
}

export default function SMSTemplateEditor({ templates, onTemplateChange }: SMSTemplateEditorProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [formData, setFormData] = useState<SMSTemplateData>({
    name: '',
    content: '',
    variables: [],
  });
  const [newVariable, setNewVariable] = useState('');

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', content: '', variables: [] });
    setShowForm(true);
  };

  const handleEdit = (template: SMSTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      variables: template.variables || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;

    try {
      await smsAPI.deleteTemplate(id);
      notify.success('Template Deleted', 'SMS template has been removed');
      onTemplateChange();
    } catch (error) {
      notify.error('Error', 'Failed to delete template');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.content) {
      notify.error('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingTemplate) {
        await smsAPI.updateTemplate(editingTemplate.id, formData);
        notify.success('Success', 'SMS template updated');
      } else {
        await smsAPI.createTemplate(formData);
        notify.success('Success', 'SMS template created');
      }
      setShowForm(false);
      onTemplateChange();
    } catch (error) {
      notify.error('Error', 'Failed to save template');
    }
  };

  const handleAddVariable = () => {
    if (newVariable && !formData.variables?.includes(newVariable)) {
      setFormData({
        ...formData,
        variables: [...(formData.variables || []), newVariable],
      });
      setNewVariable('');
    }
  };

  const handleRemoveVariable = (variable: string) => {
    setFormData({
      ...formData,
      variables: formData.variables?.filter((v) => v !== variable) || [],
    });
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.content;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newContent = before + `{{${variable}}}` + after;
      setFormData({ ...formData, content: newContent });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">SMS Templates</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-600 mb-4">Create your first SMS template to get started</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-gray-700 mb-4 line-clamp-3">{template.content}</p>
              {template.variables && template.variables.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((variable) => (
                    <span
                      key={variable}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 text-sm text-gray-500">
                {template.campaignCount || 0} campaigns
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Welcome Message"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Content * (Max 160 characters recommended)
                  </label>
                  <textarea
                    id="template-content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={6}
                    placeholder="Hello {{name}}, welcome to our service!"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.content.length} characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variables
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newVariable}
                      onChange={(e) => setNewVariable(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVariable())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., name, email, phone"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariable}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {formData.variables && formData.variables.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.variables.map((variable) => (
                        <div
                          key={variable}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
                        >
                          <span className="text-sm">{variable}</span>
                          <button
                            type="button"
                            onClick={() => insertVariable(variable)}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                            title="Insert into template"
                          >
                            Insert
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariable(variable)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
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

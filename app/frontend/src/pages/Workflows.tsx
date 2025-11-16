import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Play, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';
import { workflowsAPI, Workflow, WorkflowData } from '../lib/api';
import { notify } from '../store/notification.store';
import WorkflowBuilder from '../components/WorkflowBuilder';

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await workflowsAPI.getAll();
      setWorkflows(response.workflows);
    } catch (error) {
      notify.error('Error', 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingWorkflow(null);
    setShowBuilder(true);
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setShowBuilder(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow? This action cannot be undone.')) return;
    try {
      await workflowsAPI.delete(id);
      setWorkflows(workflows.filter((w) => w.id !== id));
      notify.success('Workflow Deleted', 'Workflow has been removed');
    } catch (error) {
      notify.error('Error', 'Failed to delete workflow');
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await workflowsAPI.execute(id);
      notify.success('Workflow Executed', 'Workflow has been queued for execution');
    } catch (error) {
      notify.error('Error', 'Failed to execute workflow');
    }
  };

  const handleToggleActive = async (workflow: Workflow) => {
    try {
      await workflowsAPI.update(workflow.id, {
        ...workflow,
        isActive: !workflow.isActive,
      });
      setWorkflows(
        workflows.map((w) =>
          w.id === workflow.id ? { ...w, isActive: !w.isActive } : w
        )
      );
      notify.success(
        'Workflow Updated',
        `Workflow ${!workflow.isActive ? 'activated' : 'deactivated'}`
      );
    } catch (error) {
      notify.error('Error', 'Failed to update workflow');
    }
  };

  const handleSaveWorkflow = async (data: WorkflowData) => {
    try {
      if (editingWorkflow) {
        await workflowsAPI.update(editingWorkflow.id, data);
        notify.success('Success', 'Workflow updated');
      } else {
        await workflowsAPI.create(data);
        notify.success('Success', 'Workflow created');
      }
      setShowBuilder(false);
      setEditingWorkflow(null);
      loadWorkflows();
    } catch (error) {
      notify.error('Error', 'Failed to save workflow');
    }
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      EARNING_CREATED: 'Earning Created',
      INVOICE_PAID: 'Invoice Paid',
      LOW_STOCK: 'Low Stock',
      CUSTOMER_CREATED: 'Customer Created',
      GOAL_COMPLETED: 'Goal Completed',
    };
    return labels[trigger] || trigger;
  };

  const getTriggerColor = (trigger: string) => {
    const colors: Record<string, string> = {
      EARNING_CREATED: 'bg-green-100 text-green-800',
      INVOICE_PAID: 'bg-blue-100 text-blue-800',
      LOW_STOCK: 'bg-yellow-100 text-yellow-800',
      CUSTOMER_CREATED: 'bg-purple-100 text-purple-800',
      GOAL_COMPLETED: 'bg-indigo-100 text-indigo-800',
    };
    return colors[trigger] || 'bg-gray-100 text-gray-800';
  };

  if (showBuilder) {
    return (
      <WorkflowBuilder
        workflow={editingWorkflow}
        onSave={handleSaveWorkflow}
        onCancel={() => {
          setShowBuilder(false);
          setEditingWorkflow(null);
        }}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Automated Workflows
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Automate tasks based on triggers and conditions
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Create Workflow
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Activity size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            No Workflows Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first workflow to automate repetitive tasks
          </p>
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      {workflow.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getTriggerColor(
                        workflow.trigger
                      )}`}
                    >
                      {getTriggerLabel(workflow.trigger)}
                    </span>
                    {workflow.isActive ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle size={16} />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <XCircle size={16} />
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Activity size={16} />
                      {workflow.actions.length} action
                      {workflow.actions.length !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={16} />
                      {workflow.executionCount} execution
                      {workflow.executionCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(workflow)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      workflow.isActive
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {workflow.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleExecute(workflow.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Execute workflow"
                  >
                    <Play size={20} />
                  </button>
                  <button
                    onClick={() => handleEdit(workflow)}
                    className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Edit workflow"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(workflow.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete workflow"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                  Actions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {workflow.actions.map((action, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                    >
                      {action.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  Edit,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Zap,
  Settings,
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  actions: string;
  isActive: boolean;
  createdAt: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  executedAt: string;
  result?: string;
  createdAt: string;
}

interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  workflowId: string;
  schedule: string;
  nextRun: string;
  isActive: boolean;
  createdAt: string;
}

const Workflow: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    headers: {
      Authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
    },
  });

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await apiClient.get('/workflows/analytics');
        setAnalytics(res.data);
        const execRes = await apiClient.get('/workflows/executions');
        setExecutions(execRes.data);
      } else if (activeTab === 'workflows') {
        const res = await apiClient.get('/workflows/workflows');
        setWorkflows(res.data);
      } else if (activeTab === 'schedules') {
        const res = await apiClient.get('/workflows/tasks');
        setScheduledTasks(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (formData: any) => {
    try {
      await apiClient.post('/workflows/workflows', formData);
      setShowCreateWorkflow(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleCreateTask = async (formData: any) => {
    try {
      await apiClient.post('/workflows/tasks', formData);
      setShowCreateTask(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      await apiClient.post(`/workflows/workflows/${workflowId}/execute`);
      fetchAllData();
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const handleToggleWorkflow = async (workflowId: string, currentStatus: boolean) => {
    try {
      await apiClient.put(`/workflows/workflows/${workflowId}`, {
        isActive: !currentStatus,
      });
      fetchAllData();
    } catch (error) {
      console.error('Failed to update workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await apiClient.delete(`/workflows/workflows/${workflowId}`);
      fetchAllData();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Workflow Automation</h1>
          <p className="text-slate-400">Create and manage automated workflows with triggers and actions</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 ${activeTab === 'dashboard' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 ${activeTab === 'workflows' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Workflows
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 ${activeTab === 'schedules' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Schedules
          </button>
        </div>

        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Total Workflows</p>
                <p className="text-3xl font-bold">{analytics.totalWorkflows}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Active Workflows</p>
                <p className="text-3xl font-bold">{analytics.activeWorkflows}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Total Executions</p>
                <p className="text-3xl font-bold">{analytics.totalExecutions}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Success Rate</p>
                <p className="text-3xl font-bold">{analytics.successRate}%</p>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Executions</h2>
              <div className="space-y-3">
                {executions.slice(0, 5).map((exec) => (
                  <div key={exec.id} className="flex items-center justify-between bg-slate-700 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      {exec.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <div>
                        <p className="text-white font-medium">Workflow {exec.workflowId}</p>
                        <p className="text-sm text-slate-400">{new Date(exec.executedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      exec.status === 'completed' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                    }`}>
                      {exec.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateWorkflow(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                <Plus className="w-5 h-5" />
                New Workflow
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 pl-10 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows
                .filter((w) => w.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((workflow) => (
                  <div key={workflow.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{workflow.name}</h3>
                        <p className="text-sm text-slate-400">{workflow.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        workflow.isActive ? 'bg-green-900 text-green-200' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">Created {new Date(workflow.createdAt).toLocaleDateString()}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExecuteWorkflow(workflow.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
                      >
                        <Play className="w-4 h-4" />
                        Execute
                      </button>
                      <button
                        onClick={() => handleToggleWorkflow(workflow.id, workflow.isActive)}
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
                      >
                        {workflow.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <button
              onClick={() => setShowCreateTask(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              New Scheduled Task
            </button>

            <div className="space-y-3">
              {scheduledTasks.map((task) => (
                <div key={task.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{task.name}</h3>
                      <p className="text-sm text-slate-400">{task.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-slate-400">Schedule: <span className="text-white font-medium">{task.schedule}</span></span>
                        <span className="text-sm text-slate-400">Next Run: <span className="text-white font-medium">{new Date(task.nextRun).toLocaleString()}</span></span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      task.isActive ? 'bg-green-900 text-green-200' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {task.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showCreateWorkflow && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create Workflow</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateWorkflow({ name: 'New Workflow' });
              }} className="space-y-4">
                <input type="text" placeholder="Workflow Name" required className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Create</button>
              </form>
            </div>
          </div>
        )}

        {showCreateTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create Scheduled Task</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateTask({ name: 'New Task' });
              }} className="space-y-4">
                <input type="text" placeholder="Task Name" required className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Create</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workflow;

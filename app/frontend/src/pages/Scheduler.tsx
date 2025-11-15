import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  taskType: string;
  cronExpression: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}

interface TaskExecution {
  id: string;
  status: string;
  result: any;
  durationMs: number;
  executedAt: string;
}

const CRON_TEMPLATES = {
  'every_day_9am': '0 9 * * *',
  'every_weekday_9am': '0 9 * * 1-5',
  'every_monday': '0 0 * * 1',
  'every_month': '0 0 1 * *',
  'every_hour': '0 * * * *',
  'every_6_hours': '0 */6 * * *',
};

const TASK_TYPES = [
  { value: 'recurring_earning', label: 'Recurring Earning Entry' },
  { value: 'reminder', label: 'Reminder/Notification' },
  { value: 'report', label: 'Generate Report' },
  { value: 'cleanup', label: 'Data Cleanup' },
];

export default function Scheduler() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<ScheduledTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    taskType: 'recurring_earning',
    cronExpression: '0 9 * * *',
    platformId: '',
    amount: '',
    timezone: 'UTC',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const tasksRes = await axios.get('/api/v1/scheduler/tasks');
      setTasks(tasksRes.data);

      if (activeTab === 'upcoming') {
        const upcomingRes = await axios.get('/api/v1/scheduler/upcoming');
        setUpcomingTasks(upcomingRes.data);
      }
    } catch (error) {
      console.error('Error fetching scheduler data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskExecutions = async (taskId: string) => {
    try {
      const res = await axios.get(`/api/v1/scheduler/tasks/${taskId}/history`);
      setExecutions(res.data.executions);
      setSelectedTaskId(taskId);
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const createTask = async () => {
    try {
      const payload: any = {
        name: newTask.name,
        description: newTask.description,
        taskType: newTask.taskType,
        cronExpression: newTask.cronExpression,
        timezone: newTask.timezone,
        isActive: true,
      };

      // Add task-specific config
      if (newTask.taskType === 'recurring_earning') {
        payload.actionConfig = {
          platformId: newTask.platformId,
          amount: parseFloat(newTask.amount),
        };
      }

      await axios.post('/api/v1/scheduler/tasks', payload);
      setNewTask({
        name: '',
        description: '',
        taskType: 'recurring_earning',
        cronExpression: '0 9 * * *',
        platformId: '',
        amount: '',
        timezone: 'UTC',
      });
      fetchData();
      alert('Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await axios.delete(`/api/v1/scheduler/tasks/${taskId}`);
      fetchData();
      alert('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const toggleTask = async (taskId: string, isActive: boolean) => {
    try {
      await axios.put(`/api/v1/scheduler/tasks/${taskId}`, { isActive: !isActive });
      fetchData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const runNow = async (taskId: string) => {
    try {
      await axios.post(`/api/v1/scheduler/tasks/${taskId}/run`);
      fetchData();
      alert('Task executed!');
    } catch (error) {
      console.error('Error running task:', error);
      alert('Failed to execute task');
    }
  };

  if (loading && !tasks.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Task Scheduler</h1>
          <p className="text-gray-400">Automate recurring tasks and earnings entry</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700 flex gap-8">
          {[
            { id: 'tasks', label: '📋 Tasks' },
            { id: 'create', label: '➕ Create Task' },
            { id: 'upcoming', label: '⏰ Upcoming' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div key={task.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">{task.name}</h3>
                        {task.description && (
                          <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.isActive
                            ? 'bg-green-900 text-green-300'
                            : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {task.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-400">Type</p>
                        <p className="text-white font-semibold">
                          {TASK_TYPES.find((t) => t.value === task.taskType)?.label}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Schedule</p>
                        <p className="text-white font-mono">{task.cronExpression}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Last Run</p>
                        <p className="text-white">
                          {task.lastRunAt
                            ? new Date(task.lastRunAt).toLocaleString()
                            : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Next Run</p>
                        <p className="text-white">
                          {task.nextRunAt ? new Date(task.nextRunAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleTask(task.id, task.isActive)}
                        className={`px-4 py-2 rounded transition ${
                          task.isActive
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {task.isActive ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => runNow(task.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Run Now
                      </button>
                      <button
                        onClick={() => fetchTaskExecutions(task.id)}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                      >
                        History
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Execution History */}
                  {selectedTaskId === task.id && executions.length > 0 && (
                    <div className="bg-gray-700 p-6 border-t border-gray-600">
                      <h4 className="text-white font-bold mb-4">Recent Executions</h4>
                      <div className="space-y-2">
                        {executions.slice(0, 5).map((exec) => (
                          <div key={exec.id} className="flex justify-between items-center text-sm">
                            <div>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  exec.status === 'completed'
                                    ? 'bg-green-900 text-green-300'
                                    : 'bg-red-900 text-red-300'
                                }`}
                              >
                                {exec.status}
                              </span>
                              <span className="text-gray-400 ml-3">
                                {new Date(exec.executedAt).toLocaleString()}
                              </span>
                            </div>
                            <span className="text-gray-400">{exec.durationMs}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-12">
                <p>No scheduled tasks yet. Create one to get started!</p>
              </div>
            )}
          </div>
        )}

        {/* Create Task Tab */}
        {activeTab === 'create' && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create Scheduled Task</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Name</label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  placeholder="e.g., Daily earnings from Fiverr"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Type</label>
                <select
                  value={newTask.taskType}
                  onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                >
                  {TASK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cron Schedule</label>
                <select
                  value={newTask.cronExpression}
                  onChange={(e) => setNewTask({ ...newTask, cronExpression: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none mb-2"
                >
                  <option value="">Custom expression...</option>
                  {Object.entries(CRON_TEMPLATES).map(([label, expr]) => (
                    <option key={expr} value={expr}>
                      {label.replace(/_/g, ' ').toUpperCase()} ({expr})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newTask.cronExpression}
                  onChange={(e) => setNewTask({ ...newTask, cronExpression: e.target.value })}
                  placeholder="0 9 * * * (9 AM daily)"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none text-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: minute hour day month weekday (0=Sunday)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                <input
                  type="text"
                  value={newTask.timezone}
                  onChange={(e) => setNewTask({ ...newTask, timezone: e.target.value })}
                  placeholder="UTC"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                />
              </div>

              {newTask.taskType === 'recurring_earning' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Platform
                    </label>
                    <input
                      type="text"
                      value={newTask.platformId}
                      onChange={(e) => setNewTask({ ...newTask, platformId: e.target.value })}
                      placeholder="Platform UUID"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                    <input
                      type="number"
                      value={newTask.amount}
                      onChange={(e) => setNewTask({ ...newTask, amount: e.target.value })}
                      placeholder="50"
                      step="0.01"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              <button
                onClick={createTask}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
              >
                Create Task
              </button>
            </div>
          </div>
        )}

        {/* Upcoming Tab */}
        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Next 7 Days</h2>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white">{task.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          Scheduled: {task.nextRunAt ? new Date(task.nextRunAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <span className="text-sm px-3 py-1 bg-blue-900 text-blue-300 rounded">
                        {TASK_TYPES.find((t) => t.value === task.taskType)?.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400">No tasks scheduled for the next 7 days</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

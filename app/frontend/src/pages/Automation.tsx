import { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  Play,
  Clock,
  BarChart3,
  FileText,
  Activity,
  Toggle2,
  Settings,
} from 'lucide-react';
import { automationAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  enabled: boolean;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  enabled: boolean;
  version: number;
  createdAt: string;
}

interface ScheduledAutomation {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  enabled: boolean;
  nextRun: string;
  executionCount: number;
}

interface AutomationStats {
  totalRules: number;
  enabledRules: number;
  totalWorkflows: number;
  enabledWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
}

interface AutomationHistoryItem {
  id: string;
  automationName: string;
  automationType: string;
  action: string;
  result?: string;
  error?: string;
  executedAt: string;
}

export default function Automation() {
  const [activeTab, setActiveTab] = useState<'rules' | 'workflows' | 'scheduled' | 'analytics'>('rules');
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledAutomation[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [history, setHistory] = useState<AutomationHistoryItem[]>([]);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [showNewWorkflowForm, setShowNewWorkflowForm] = useState(false);
  const [showNewScheduledForm, setShowNewScheduledForm] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', description: '', trigger: 'earning_threshold', conditions: '', actions: '' });
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '', triggerType: 'manual', steps: '' });
  const [newScheduled, setNewScheduled] = useState({ name: '', description: '', schedule: '0 9 * * *', action: '' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'rules') {
        const data = await automationAPI.getAutomationRules();
        setRules(data);
      } else if (activeTab === 'workflows') {
        const data = await automationAPI.getWorkflows();
        setWorkflows(data);
      } else if (activeTab === 'scheduled') {
        const data = await automationAPI.getScheduledAutomations();
        setScheduled(data);
      } else if (activeTab === 'analytics') {
        const stats = await automationAPI.getAutomationStats();
        const hist = await automationAPI.getAutomationHistory();
        setStats(stats);
        setHistory(hist);
      }
    } catch (error) {
      notify.error('Error', 'Failed to load automation data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name) {
      notify.error('Error', 'Rule name is required');
      return;
    }

    try {
      await automationAPI.createAutomationRule({
        ...newRule,
        conditions: newRule.conditions ? JSON.parse(newRule.conditions) : [],
        actions: newRule.actions ? JSON.parse(newRule.actions) : [],
      });
      setNewRule({ name: '', description: '', trigger: 'earning_threshold', conditions: '', actions: '' });
      setShowNewRuleForm(false);
      notify.success('Success', 'Automation rule created');
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to create automation rule');
    }
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name) {
      notify.error('Error', 'Workflow name is required');
      return;
    }

    try {
      await automationAPI.createWorkflow({
        ...newWorkflow,
        steps: newWorkflow.steps ? JSON.parse(newWorkflow.steps) : [],
      });
      setNewWorkflow({ name: '', description: '', triggerType: 'manual', steps: '' });
      setShowNewWorkflowForm(false);
      notify.success('Success', 'Workflow created');
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to create workflow');
    }
  };

  const handleCreateScheduled = async () => {
    if (!newScheduled.name || !newScheduled.schedule) {
      notify.error('Error', 'Name and schedule are required');
      return;
    }

    try {
      await automationAPI.createScheduledAutomation({
        ...newScheduled,
        action: newScheduled.action ? JSON.parse(newScheduled.action) : {},
      });
      setNewScheduled({ name: '', description: '', schedule: '0 9 * * *', action: '' });
      setShowNewScheduledForm(false);
      notify.success('Success', 'Scheduled automation created');
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to create scheduled automation');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this automation rule?')) return;
    try {
      await automationAPI.deleteAutomationRule(id);
      setRules(rules.filter((r) => r.id !== id));
      notify.success('Success', 'Rule deleted');
    } catch (error) {
      notify.error('Error', 'Failed to delete rule');
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await automationAPI.deleteWorkflow(id);
      setWorkflows(workflows.filter((w) => w.id !== id));
      notify.success('Success', 'Workflow deleted');
    } catch (error) {
      notify.error('Error', 'Failed to delete workflow');
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    if (!confirm('Delete this scheduled automation?')) return;
    try {
      await automationAPI.deleteScheduledAutomation(id);
      setScheduled(scheduled.filter((s) => s.id !== id));
      notify.success('Success', 'Scheduled automation deleted');
    } catch (error) {
      notify.error('Error', 'Failed to delete scheduled automation');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automation & Workflows</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create rules, workflows, and scheduled automations</p>
        </div>
        {activeTab === 'rules' && !showNewRuleForm && (
          <button
            onClick={() => setShowNewRuleForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        )}
        {activeTab === 'workflows' && !showNewWorkflowForm && (
          <button
            onClick={() => setShowNewWorkflowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        )}
        {activeTab === 'scheduled' && !showNewScheduledForm && (
          <button
            onClick={() => setShowNewScheduledForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Scheduled
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['rules', 'workflows', 'scheduled', 'analytics'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'rules' && <span className="flex items-center gap-2"><Toggle2 className="w-4 h-4" /> Rules</span>}
            {tab === 'workflows' && <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Workflows</span>}
            {tab === 'scheduled' && <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Scheduled</span>}
            {tab === 'analytics' && <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Analytics</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
        </div>
      ) : (
        <>
          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              {showNewRuleForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Rule</h2>
                  <input
                    type="text"
                    placeholder="Rule Name"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <textarea
                    placeholder="Description"
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                  <select
                    value={newRule.trigger}
                    onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="earning_threshold">Earning Threshold</option>
                    <option value="daily_earnings">Daily Earnings</option>
                    <option value="goal_reached">Goal Reached</option>
                    <option value="platform_earnings">Platform Earnings</option>
                  </select>
                  <textarea
                    placeholder="Conditions (JSON)"
                    value={newRule.conditions}
                    onChange={(e) => setNewRule({ ...newRule, conditions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    rows={3}
                  />
                  <textarea
                    placeholder="Actions (JSON)"
                    value={newRule.actions}
                    onChange={(e) => setNewRule({ ...newRule, actions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateRule}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewRuleForm(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Rules List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rule.description}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          rule.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Trigger:</span> {rule.trigger}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Executions:</span> {rule.executionCount}
                      </p>
                      {rule.lastExecutedAt && (
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Last Run:</span> {new Date(rule.lastExecutedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors text-sm">
                        <Edit2 className="w-4 h-4 inline mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="flex-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 inline mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <div className="space-y-4">
              {showNewWorkflowForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Workflow</h2>
                  <input
                    type="text"
                    placeholder="Workflow Name"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <textarea
                    placeholder="Description"
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                  <select
                    value={newWorkflow.triggerType}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, triggerType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="manual">Manual</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="event-based">Event-based</option>
                  </select>
                  <textarea
                    placeholder="Steps (JSON)"
                    value={newWorkflow.steps}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, steps: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateWorkflow}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewWorkflowForm(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Workflows List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{workflow.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{workflow.description}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          workflow.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {workflow.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Trigger Type:</span> {workflow.triggerType}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Version:</span> {workflow.version}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 transition-colors text-sm">
                        <Play className="w-4 h-4 inline mr-1" /> Execute
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="flex-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 inline mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Tab */}
          {activeTab === 'scheduled' && (
            <div className="space-y-4">
              {showNewScheduledForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Scheduled Automation</h2>
                  <input
                    type="text"
                    placeholder="Automation Name"
                    value={newScheduled.name}
                    onChange={(e) => setNewScheduled({ ...newScheduled, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <textarea
                    placeholder="Description"
                    value={newScheduled.description}
                    onChange={(e) => setNewScheduled({ ...newScheduled, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                  <input
                    type="text"
                    placeholder="Cron Schedule (e.g., 0 9 * * * for 9 AM daily)"
                    value={newScheduled.schedule}
                    onChange={(e) => setNewScheduled({ ...newScheduled, schedule: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <textarea
                    placeholder="Action (JSON)"
                    value={newScheduled.action}
                    onChange={(e) => setNewScheduled({ ...newScheduled, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateScheduled}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewScheduledForm(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Scheduled List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scheduled.map((auto) => (
                  <div key={auto.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{auto.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{auto.description}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          auto.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {auto.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                        <span className="font-medium">Schedule:</span> {auto.schedule}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Next Run:</span> {new Date(auto.nextRun).toLocaleString()}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Executions:</span> {auto.executionCount}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors text-sm">
                        <Edit2 className="w-4 h-4 inline mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteScheduled(auto.id)}
                        className="flex-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 inline mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && stats && (
            <div className="space-y-6">
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow">
                  <Toggle2 className="w-5 h-5 mb-2 opacity-80" />
                  <p className="text-3xl font-bold">{stats.totalRules}</p>
                  <p className="text-sm opacity-90">Total Rules</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow">
                  <Activity className="w-5 h-5 mb-2 opacity-80" />
                  <p className="text-3xl font-bold">{stats.enabledRules}</p>
                  <p className="text-sm opacity-90">Enabled Rules</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow">
                  <Zap className="w-5 h-5 mb-2 opacity-80" />
                  <p className="text-3xl font-bold">{stats.totalWorkflows}</p>
                  <p className="text-sm opacity-90">Workflows</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow">
                  <Clock className="w-5 h-5 mb-2 opacity-80" />
                  <p className="text-3xl font-bold">{stats.totalExecutions}</p>
                  <p className="text-sm opacity-90">Executions</p>
                </div>
              </div>

              {/* Execution Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Execution Statistics</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.successfulExecutions}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Successful</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failedExecutions}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {stats.totalExecutions > 0
                        ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
                        : 0}
                      %
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Success Rate</p>
                  </div>
                </div>
              </div>

              {/* Recent History */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
                <div className="space-y-2">
                  {history.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                      <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.automationName} ({item.automationType})
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {item.action} • {new Date(item.executedAt).toLocaleString()}
                        </p>
                        {item.error && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{item.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

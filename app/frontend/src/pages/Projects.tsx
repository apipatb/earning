import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Layers,
  MoreVertical,
  Calendar,
  User,
  Flag,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  clientId?: string;
  budget?: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
  tasks: Task[];
  milestones: Milestone[];
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'blocked' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  dueDate?: string;
  estimatedHours?: number;
}

interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
}

interface ProjectAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: string;
  totalBudget: number;
}

const Projects: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard' || activeTab === 'projects') {
        const res = await apiClient.get('/projects/projects');
        setProjects(res.data);
      }
      if (activeTab === 'dashboard') {
        const analyticsRes = await apiClient.get('/projects/analytics');
        setAnalytics(analyticsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (formData: any) => {
    try {
      await apiClient.post('/projects/projects', formData);
      setShowCreateProject(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await apiClient.delete(`/projects/projects/${projectId}`);
        fetchAllData();
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || project.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getTaskProgress = (project: Project) => {
    if (project.tasks.length === 0) return 0;
    const completed = project.tasks.filter((t) => t.status === 'completed').length;
    return Math.round((completed / project.tasks.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Project Management</h1>
          <p className="text-slate-400">Organize, track, and manage your projects effectively</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="inline mr-2 w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'projects'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="inline mr-2 w-5 h-5" />
            All Projects
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {analytics ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-80">Total Projects</p>
                    <p className="text-3xl font-bold">{analytics.totalProjects}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-80">Active</p>
                    <p className="text-3xl font-bold">{analytics.activeProjects}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-80">Completed</p>
                    <p className="text-3xl font-bold">{analytics.completedProjects}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-80">On Hold</p>
                    <p className="text-3xl font-bold">{analytics.onHoldProjects}</p>
                  </div>
                </div>

                {/* Task Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-slate-400">Total Tasks</p>
                      <Layers className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.totalTasks}</p>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-slate-400">Completed</p>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.completedTasks}</p>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-slate-400">In Progress</p>
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.inProgressTasks}</p>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-slate-400">Pending</p>
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.pendingTasks}</p>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-slate-400">Completion</p>
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.completionRate}%</p>
                  </div>
                </div>

                {/* Budget */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <p className="text-slate-400 mb-2">Total Project Budget</p>
                  <p className="text-3xl font-bold text-white">
                    ${analytics.totalBudget?.toLocaleString() || '0'}
                  </p>
                </div>

                {/* Project Status Breakdown */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Project Status Breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Planning', count: analytics.totalProjects - analytics.activeProjects - analytics.completedProjects - analytics.onHoldProjects, color: 'bg-blue-500' },
                      { label: 'Active', count: analytics.activeProjects, color: 'bg-green-500' },
                      { label: 'On Hold', count: analytics.onHoldProjects, color: 'bg-yellow-500' },
                      { label: 'Completed', count: analytics.completedProjects, color: 'bg-purple-500' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-slate-300">{label}</span>
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-700 rounded-full h-2 w-40">
                            <div
                              className={`${color} h-2 rounded-full`}
                              style={{
                                width: `${
                                  analytics.totalProjects > 0
                                    ? (count / analytics.totalProjects) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-slate-400 text-sm w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 py-12">
                {loading ? 'Loading dashboard...' : 'No analytics data available'}
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setShowCreateProject(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                New Project
              </button>
              <div className="flex gap-2 flex-1 min-w-[300px]">
                <div className="flex items-center bg-slate-700 rounded-lg px-4 flex-1">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent text-white placeholder-slate-400 outline-none ml-2 w-full"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-700 text-white px-4 rounded-lg outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-slate-700 text-white px-4 rounded-lg outline-none"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => {
                  const progress = getTaskProgress(project);
                  return (
                    <div
                      key={project.id}
                      className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700/50 transition group"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2">{project.name}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              project.status
                            )}`}
                          >
                            {project.status}
                          </span>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition">
                          <MoreVertical className="w-5 h-5 text-slate-400 hover:text-white" />
                        </button>
                      </div>

                      {/* Description */}
                      {project.description && (
                        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{project.description}</p>
                      )}

                      {/* Priority and Tasks */}
                      <div className="flex items-center gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Flag className={`w-4 h-4 ${getPriorityColor(project.priority)}`} />
                          <span className="text-slate-400">{project.priority}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Layers className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-400">{project.tasks?.length || 0} tasks</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400">Progress</span>
                          <span className="text-xs font-semibold text-white">{progress}%</span>
                        </div>
                        <div className="bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Dates */}
                      {project.startDate && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(project.startDate).toLocaleDateString()} -
                            {project.endDate
                              ? ' ' + new Date(project.endDate).toLocaleDateString()
                              : ' TBD'}
                          </span>
                        </div>
                      )}

                      {/* Budget */}
                      {project.budget && (
                        <p className="text-xs text-slate-400 mt-2">
                          Budget: ${project.budget.toLocaleString()}
                        </p>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="w-full mt-4 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center text-slate-400 py-12">
                  No projects found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full max-h-96 overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Project</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateProject({
                    name: formData.get('name'),
                    description: formData.get('description'),
                    priority: formData.get('priority'),
                    category: formData.get('category'),
                    budget: formData.get('budget') ? parseInt(formData.get('budget') as string) : null,
                    startDate: formData.get('startDate'),
                    endDate: formData.get('endDate'),
                  });
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  name="name"
                  placeholder="Project Name"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <textarea
                  name="description"
                  placeholder="Description (optional)"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none h-20"
                />
                <select
                  name="priority"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium" selected>
                    Medium Priority
                  </option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical</option>
                </select>
                <select
                  name="category"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                >
                  <option value="development">Development</option>
                  <option value="design">Design</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="number"
                  name="budget"
                  placeholder="Budget (optional)"
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="date"
                    name="startDate"
                    className="bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                  />
                  <input
                    type="date"
                    name="endDate"
                    className="bg-slate-700 text-white px-4 py-2 rounded-lg outline-none"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateProject(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;

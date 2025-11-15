import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Share2,
  Activity,
  BarChart3,
  Mail,
  Shield,
  LogOut,
  Settings,
  FileText,
} from 'lucide-react';
import { collaborationAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  members: WorkspaceMember[];
  createdAt: string;
}

interface WorkspaceMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: string;
  joinedAt: string;
}

interface WorkspaceProject {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  status: string;
  tasks: Array<any>;
  createdAt: string;
}

interface WorkspaceStats {
  totalMembers: number;
  membersByRole: {
    owner: number;
    admin: number;
    member: number;
    viewer: number;
  };
  totalProjects: number;
  totalSharedDashboards: number;
  recentActivity: number;
}

interface WorkspaceActivity {
  id: string;
  action: string;
  entityType: string;
  description: string;
  user: { name: string; email: string };
  timestamp: string;
}

export default function Collaboration() {
  const [activeTab, setActiveTab] = useState<'workspaces' | 'team' | 'projects' | 'activity'>('workspaces');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [activity, setActivity] = useState<WorkspaceActivity[]>([]);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [showNewWorkspaceForm, setShowNewWorkspaceForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '', icon: '📊', color: '#3B82F6' });
  const [inviteEmails, setInviteEmails] = useState('');

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceData();
    }
  }, [selectedWorkspace, activeTab]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const data = await collaborationAPI.getWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(data[0].id);
      }
    } catch (error) {
      notify.error('Error', 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceData = async () => {
    if (!selectedWorkspace) return;

    try {
      setLoading(true);
      if (activeTab === 'team') {
        const workspace = await collaborationAPI.getWorkspaceById(selectedWorkspace);
        setMembers(workspace.members);
      } else if (activeTab === 'projects') {
        const proj = await collaborationAPI.getWorkspaceProjects(selectedWorkspace);
        setProjects(proj);
      } else if (activeTab === 'activity') {
        const act = await collaborationAPI.getWorkspaceActivity(selectedWorkspace);
        setActivity(act);
      }

      const ws = await collaborationAPI.getWorkspaceById(selectedWorkspace);
      setStats(await collaborationAPI.getWorkspaceStats(selectedWorkspace));
    } catch (error) {
      console.error('Failed to load workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name) {
      notify.error('Error', 'Workspace name is required');
      return;
    }

    try {
      const created = await collaborationAPI.createWorkspace(newWorkspace);
      setWorkspaces([...workspaces, created]);
      setSelectedWorkspace(created.id);
      setNewWorkspace({ name: '', description: '', icon: '📊', color: '#3B82F6' });
      setShowNewWorkspaceForm(false);
      notify.success('Success', 'Workspace created');
    } catch (error) {
      notify.error('Error', 'Failed to create workspace');
    }
  };

  const handleInviteMembers = async () => {
    if (!selectedWorkspace || !inviteEmails) {
      notify.error('Error', 'Please enter email addresses');
      return;
    }

    try {
      const emails = inviteEmails.split(',').map((e) => e.trim());
      await collaborationAPI.inviteMembers(selectedWorkspace, emails);
      setInviteEmails('');
      setShowInviteForm(false);
      notify.success('Success', 'Invitations sent');
      loadWorkspaceData();
    } catch (error) {
      notify.error('Error', 'Failed to send invitations');
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workspace?')) return;

    try {
      await collaborationAPI.deleteWorkspace(id);
      setWorkspaces(workspaces.filter((w) => w.id !== id));
      setSelectedWorkspace(null);
      notify.success('Success', 'Workspace deleted');
    } catch (error) {
      notify.error('Error', 'Failed to delete workspace');
    }
  };

  const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspace);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Collaboration</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage workspaces and team collaboration</p>
        </div>
        {selectedWorkspace && (
          <button
            onClick={() => setShowNewWorkspaceForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </button>
        )}
      </div>

      {/* New Workspace Form */}
      {showNewWorkspaceForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Workspace</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Workspace Name"
              value={newWorkspace.name}
              onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Icon (emoji)"
              value={newWorkspace.icon}
              onChange={(e) => setNewWorkspace({ ...newWorkspace, icon: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <textarea
            placeholder="Description"
            value={newWorkspace.description}
            onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateWorkspace}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewWorkspaceForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Workspaces List */}
      {!selectedWorkspace ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setSelectedWorkspace(workspace.id)}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{workspace.icon}</span>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: workspace.color }}
                ></span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{workspace.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                {workspace.description || 'No description'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                {workspace.members.length} members
              </p>
            </button>
          ))}
          <button
            onClick={() => setShowNewWorkspaceForm(true)}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-all border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center"
          >
            <div className="text-center">
              <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">New Workspace</p>
            </div>
          </button>
        </div>
      ) : (
        <>
          {/* Workspace Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.icon} {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {['workspaces', 'team', 'projects', 'activity'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab === 'workspaces' && <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Workspace</span>}
                {tab === 'team' && <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Team</span>}
                {tab === 'projects' && <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Projects</span>}
                {tab === 'activity' && <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Activity</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
            </div>
          ) : (
            <>
              {/* Workspace Overview */}
              {activeTab === 'workspaces' && currentWorkspace && (
                <div className="space-y-6">
                  {/* Workspace Info */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Workspace Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Name
                        </label>
                        <p className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white">
                          {currentWorkspace.name}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Icon
                        </label>
                        <p className="text-3xl">{currentWorkspace.icon}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <p className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white">
                        {currentWorkspace.description || 'No description'}
                      </p>
                    </div>
                  </div>

                  {/* Statistics */}
                  {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow">
                        <BarChart3 className="w-5 h-5 mb-2 opacity-80" />
                        <p className="text-3xl font-bold">{stats.totalMembers}</p>
                        <p className="text-sm opacity-90">Members</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow">
                        <FileText className="w-5 h-5 mb-2 opacity-80" />
                        <p className="text-3xl font-bold">{stats.totalProjects}</p>
                        <p className="text-sm opacity-90">Projects</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow">
                        <Share2 className="w-5 h-5 mb-2 opacity-80" />
                        <p className="text-3xl font-bold">{stats.totalSharedDashboards}</p>
                        <p className="text-sm opacity-90">Shared Dashboards</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow">
                        <Activity className="w-5 h-5 mb-2 opacity-80" />
                        <p className="text-3xl font-bold">{stats.recentActivity}</p>
                        <p className="text-sm opacity-90">This Week</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team Members */}
              {activeTab === 'team' && (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Invite Members
                  </button>

                  {showInviteForm && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
                      <textarea
                        placeholder="Enter email addresses (comma separated)"
                        value={inviteEmails}
                        onChange={(e) => setInviteEmails(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleInviteMembers}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors"
                        >
                          Send Invites
                        </button>
                        <button
                          onClick={() => setShowInviteForm(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Members Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {members.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {member.user.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                {member.user.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  <Shield className="w-3 h-3 mr-1" />
                                  {member.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                {new Date(member.joinedAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Projects */}
              {activeTab === 'projects' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-3xl">{project.icon}</span>
                        <span
                          className="px-2 py-1 text-xs font-semibold rounded"
                          style={{
                            backgroundColor: project.color + '20',
                            color: project.color,
                          }}
                        >
                          {project.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {project.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                        {project.tasks?.length || 0} tasks
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Activity Feed */}
              {activeTab === 'activity' && (
                <div className="space-y-2">
                  {activity.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex items-start gap-4">
                      <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.user.name} {item.action} {item.entityType}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

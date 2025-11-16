import { useEffect, useState } from 'react';
import { Plus, Users, Settings, UserPlus, Mail, BarChart2 } from 'lucide-react';
import { notify } from '../store/notification.store';
import TeamForm from '../components/TeamForm';
import InvitationForm from '../components/InvitationForm';
import MembersList from '../components/MembersList';

interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    name: string | null;
  };
  members: Array<{
    id: string;
    role: 'OWNER' | 'MANAGER' | 'MEMBER';
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }>;
  _count?: {
    members: number;
  };
}

interface TeamAnalytics {
  totalMembers: number;
  pendingInvitations: number;
  roleDistribution: Array<{
    role: 'OWNER' | 'MANAGER' | 'MEMBER';
    _count: number;
  }>;
  teamAge: number;
}

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [view, setView] = useState<'list' | 'details'>('list');
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/teams', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load teams');
      }

      const data = await response.json();
      setTeams(data);
    } catch (error) {
      notify.error('Error', 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamDetails = async (teamId: string) => {
    try {
      const token = localStorage.getItem('token');
      const [teamResponse, analyticsResponse] = await Promise.all([
        fetch(`http://localhost:5000/api/v1/teams/${teamId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:5000/api/v1/teams/${teamId}/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!teamResponse.ok || !analyticsResponse.ok) {
        throw new Error('Failed to load team details');
      }

      const team = await teamResponse.json();
      const analyticsData = await analyticsResponse.json();

      setSelectedTeam(team);
      setAnalytics(analyticsData);
      setView('details');
    } catch (error) {
      notify.error('Error', 'Failed to load team details');
    }
  };

  const handleCreateTeam = async (name: string, description: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to create team');
      }

      const team = await response.json();
      setTeams([team, ...teams]);
      setShowTeamForm(false);
      notify.success('Success', 'Team created successfully');
    } catch (error) {
      notify.error('Error', 'Failed to create team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/v1/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete team');
      }

      setTeams(teams.filter((t) => t.id !== teamId));
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
        setView('list');
      }
      notify.success('Success', 'Team deleted successfully');
    } catch (error) {
      notify.error('Error', 'Failed to delete team');
    }
  };

  const handleInviteMember = async (email: string, role: 'OWNER' | 'MANAGER' | 'MEMBER') => {
    if (!selectedTeam) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/v1/teams/${selectedTeam.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation');
      }

      setShowInvitationForm(false);
      notify.success('Success', 'Invitation sent successfully');
    } catch (error) {
      notify.error('Error', error instanceof Error ? error.message : 'Failed to send invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (view === 'details' && selectedTeam) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                setView('list');
                setSelectedTeam(null);
              }}
              className="text-gray-600 hover:text-gray-900 mb-2"
            >
              ← Back to Teams
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{selectedTeam.name}</h1>
            {selectedTeam.description && (
              <p className="mt-1 text-gray-600">{selectedTeam.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowInvitationForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-5 h-5" />
            Invite Member
          </button>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalMembers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Mail className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Pending Invites</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.pendingInvitations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <BarChart2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Team Age</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.teamAge} days</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Managers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.roleDistribution.find((r) => r.role === 'MANAGER')?._count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        <MembersList
          teamId={selectedTeam.id}
          onMemberRemoved={() => loadTeamDetails(selectedTeam.id)}
          onRoleUpdated={() => loadTeamDetails(selectedTeam.id)}
        />

        {/* Invitation Form Modal */}
        {showInvitationForm && (
          <InvitationForm
            onSubmit={handleInviteMember}
            onClose={() => setShowInvitationForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="mt-1 text-gray-600">Manage your teams and collaborate with members</p>
        </div>
        <button
          onClick={() => setShowTeamForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create Team
        </button>
      </div>

      {/* Teams List */}
      {teams.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No teams yet</h3>
          <p className="text-gray-600 mb-4">Create your first team to start collaborating</p>
          <button
            onClick={() => setShowTeamForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{team.name}</h3>
                    {team.description && (
                      <p className="text-gray-600 text-sm line-clamp-2">{team.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{team._count?.members || team.members?.length || 0} members</span>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {team.members?.find((m) => m.user.id === team.ownerId)?.role || 'MEMBER'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => loadTeamDetails(team.id)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    View Details
                  </button>
                  {team.ownerId === localStorage.getItem('userId') && (
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Form Modal */}
      {showTeamForm && (
        <TeamForm
          onSubmit={handleCreateTeam}
          onClose={() => setShowTeamForm(false)}
        />
      )}
    </div>
  );
}

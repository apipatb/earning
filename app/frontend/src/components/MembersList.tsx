import { useEffect, useState } from 'react';
import { User, Crown, Shield, UserMinus, Edit2 } from 'lucide-react';
import { notify } from '../store/notification.store';

interface Member {
  id: string;
  role: 'OWNER' | 'MANAGER' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  permissions: Array<{
    id: string;
    permission: 'MANAGE' | 'VIEW' | 'EDIT';
    resource: string;
  }>;
}

interface MembersListProps {
  teamId: string;
  onMemberRemoved: () => void;
  onRoleUpdated: () => void;
}

export default function MembersList({ teamId, onMemberRemoved, onRoleUpdated }: MembersListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'MANAGER' | 'MEMBER'>('MEMBER');

  useEffect(() => {
    loadMembers();
  }, [teamId]);

  const loadMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/v1/teams/${teamId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load members');
      }

      const data = await response.json();
      setMembers(data);
    } catch (error) {
      notify.error('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/v1/teams/${teamId}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      notify.success('Success', 'Member removed successfully');
      onMemberRemoved();
    } catch (error) {
      notify.error('Error', error instanceof Error ? error.message : 'Failed to remove member');
    }
  };

  const handleUpdateRole = async (memberId: string, userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/v1/teams/${teamId}/members/${userId}/role`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: selectedRole }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      notify.success('Success', 'Member role updated successfully');
      setEditingMemberId(null);
      onRoleUpdated();
    } catch (error) {
      notify.error('Error', error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const getRoleIcon = (role: 'OWNER' | 'MANAGER' | 'MEMBER') => {
    switch (role) {
      case 'OWNER':
        return <Crown className="w-5 h-5 text-yellow-600" />;
      case 'MANAGER':
        return <Shield className="w-5 h-5 text-blue-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleBadgeClass = (role: 'OWNER' | 'MANAGER' | 'MEMBER') => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-100 text-yellow-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
        <p className="text-sm text-gray-600 mt-1">{members.length} total members</p>
      </div>

      <div className="divide-y">
        {members.map((member) => (
          <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                </div>

                {/* Member Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {member.user.name || member.user.email}
                    </h3>
                    {getRoleIcon(member.role)}
                  </div>
                  <p className="text-sm text-gray-600">{member.user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Role Badge */}
                <div className="flex items-center gap-2">
                  {editingMemberId === member.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedRole}
                        onChange={(e) =>
                          setSelectedRole(e.target.value as 'OWNER' | 'MANAGER' | 'MEMBER')
                        }
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="MANAGER">Manager</option>
                      </select>
                      <button
                        onClick={() => handleUpdateRole(member.id, member.user.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(
                          member.role
                        )}`}
                      >
                        {member.role}
                      </span>

                      {/* Actions */}
                      {member.role !== 'OWNER' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingMemberId(member.id);
                              setSelectedRole(member.role);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remove member"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions */}
            {member.permissions && member.permissions.length > 0 && (
              <div className="mt-3 pl-16">
                <p className="text-xs font-medium text-gray-700 mb-2">Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {member.permissions.map((perm) => (
                    <span
                      key={perm.id}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      {perm.permission} - {perm.resource}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No members in this team yet</p>
        </div>
      )}
    </div>
  );
}

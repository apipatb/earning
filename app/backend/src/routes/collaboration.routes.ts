import { Router } from 'express';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  inviteMembers,
  acceptInvitation,
  updateMemberRole,
  removeMember,
  shareWorkspaceDashboard,
  getSharedDashboards,
  createWorkspaceProject,
  getWorkspaceProjects,
  getWorkspaceActivity,
  getWorkspaceStats,
  leaveWorkspace,
} from '../controllers/collaboration.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Workspace CRUD
router.post('/', auth, createWorkspace);
router.get('/', auth, getWorkspaces);
router.get('/:workspaceId', auth, getWorkspaceById);
router.put('/:workspaceId', auth, updateWorkspace);
router.delete('/:workspaceId', auth, deleteWorkspace);
router.post('/:workspaceId/leave', auth, leaveWorkspace);

// Members & Invitations
router.post('/:workspaceId/invite', auth, inviteMembers);
router.post('/:workspaceId/invitations/:invitationId/accept', auth, acceptInvitation);
router.put('/:workspaceId/members/:memberId/role', auth, updateMemberRole);
router.delete('/:workspaceId/members/:memberId', auth, removeMember);

// Shared Dashboards
router.post('/:workspaceId/dashboards/share', auth, shareWorkspaceDashboard);
router.get('/:workspaceId/dashboards/shared', auth, getSharedDashboards);

// Projects
router.post('/:workspaceId/projects', auth, createWorkspaceProject);
router.get('/:workspaceId/projects', auth, getWorkspaceProjects);

// Activity & Analytics
router.get('/:workspaceId/activity', auth, getWorkspaceActivity);
router.get('/:workspaceId/stats', auth, getWorkspaceStats);

export default router;

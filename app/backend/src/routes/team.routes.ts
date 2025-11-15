import { Router } from 'express';
import {
  createWorkspace,
  getUserWorkspaces,
  inviteUserToWorkspace,
  removeMemberFromWorkspace,
  updateMemberRole,
  getAuditLog,
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from '../controllers/team.controller';
import { auth } from '../middleware/auth.middleware';
import { requirePaidTier } from '../middleware/tier.middleware';

const router = Router();

// Workspace routes
router.post('/workspace', auth, requirePaidTier, createWorkspace);
router.get('/workspace', auth, getUserWorkspaces);
router.get('/workspace/:workspaceId/settings', auth, getWorkspaceSettings);
router.put('/workspace/:workspaceId/settings', auth, updateWorkspaceSettings);

// Member management
router.post('/workspace/invite', auth, inviteUserToWorkspace);
router.delete('/workspace/member', auth, removeMemberFromWorkspace);
router.put('/workspace/member/role', auth, updateMemberRole);

// Audit log
router.get('/workspace/audit', auth, getAuditLog);

export default router;

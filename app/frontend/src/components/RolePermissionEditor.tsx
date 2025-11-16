import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';
import PermissionMatrix from './PermissionMatrix';

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  rolePermissions?: {
    id: string;
    permission: Permission;
  }[];
  _count?: {
    userRoles: number;
  };
}

interface User {
  id: string;
  email: string;
  name?: string;
}

interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: string;
  expiresAt?: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  role: Role;
}

const RolePermissionEditor: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    displayName: '',
    description: '',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [assignExpiry, setAssignExpiry] = useState('');

  const [tabValue, setTabValue] = useState(0);
  const [inheritanceView, setInheritanceView] = useState(false);

  // Load roles
  useEffect(() => {
    loadRoles();
    loadUsers();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/roles');
      setRoles(response.data.data);
    } catch (err: any) {
      console.error('Error loading roles:', err);
      setError(err.response?.data?.message || 'Error loading roles');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadUserRoles = async (roleId: string) => {
    try {
      const response = await axios.get(`/api/roles/${roleId}/users`);
      setUserRoles(response.data.data || []);
    } catch (err) {
      console.error('Error loading user roles:', err);
    }
  };

  // Role CRUD
  const handleCreateRole = () => {
    setRoleForm({ name: '', displayName: '', description: '' });
    setShowRoleDialog(true);
  };

  const handleEditRole = (role: Role) => {
    if (role.isSystem) {
      setError('Cannot edit system roles');
      return;
    }
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
    });
    setSelectedRole(role);
    setShowRoleDialog(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name || !roleForm.displayName) {
      setError('Name and display name are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (selectedRole) {
        await axios.put(`/api/roles/${selectedRole.id}`, roleForm);
        setSuccess('Role updated successfully');
      } else {
        await axios.post('/api/roles', roleForm);
        setSuccess('Role created successfully');
      }

      setShowRoleDialog(false);
      setSelectedRole(null);
      loadRoles();
    } catch (err: any) {
      console.error('Error saving role:', err);
      setError(err.response?.data?.message || 'Error saving role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      setError('Cannot delete system roles');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the role "${role.displayName}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.delete(`/api/roles/${role.id}`);
      setSuccess('Role deleted successfully');
      loadRoles();
    } catch (err: any) {
      console.error('Error deleting role:', err);
      setError(err.response?.data?.message || 'Error deleting role');
    } finally {
      setLoading(false);
    }
  };

  // Permission management
  const handleEditPermissions = (role: Role) => {
    setSelectedRole(role);
    setShowPermissionDialog(true);
  };

  const handlePermissionsUpdated = () => {
    setShowPermissionDialog(false);
    setSelectedRole(null);
    loadRoles();
    setSuccess('Permissions updated successfully');
  };

  // User assignment
  const handleManageUsers = async (role: Role) => {
    setSelectedRole(role);
    await loadUserRoles(role.id);
    setShowUsersDialog(true);
  };

  const handleAssignUser = () => {
    setShowAssignDialog(true);
  };

  const handleSaveUserAssignment = async () => {
    if (!selectedUser || !selectedRole) {
      setError('Please select a user');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: any = {
        userId: selectedUser,
        roleId: selectedRole.id,
      };

      if (assignExpiry) {
        data.expiresAt = new Date(assignExpiry).toISOString();
      }

      await axios.post('/api/roles/assign', data);
      setSuccess('User assigned to role successfully');
      setShowAssignDialog(false);
      setSelectedUser('');
      setAssignExpiry('');
      if (selectedRole) {
        loadUserRoles(selectedRole.id);
      }
    } catch (err: any) {
      console.error('Error assigning user:', err);
      setError(err.response?.data?.message || 'Error assigning user');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeUserRole = async (userRoleId: string) => {
    if (!window.confirm('Are you sure you want to revoke this role from the user?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.delete(`/api/roles/assignments/${userRoleId}`);
      setSuccess('Role revoked from user successfully');
      if (selectedRole) {
        loadUserRoles(selectedRole.id);
      }
    } catch (err: any) {
      console.error('Error revoking user role:', err);
      setError(err.response?.data?.message || 'Error revoking user role');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    if (role.isSystem) return 'primary';
    if (role._count && role._count.userRoles > 0) return 'success';
    return 'default';
  };

  const getPermissionCount = (role: Role) => {
    return role.rolePermissions?.length || 0;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Role & Permission Editor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage roles, assign permissions, and control user access
          </Typography>
        </Box>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={inheritanceView}
                onChange={(e) => setInheritanceView(e.target.checked)}
              />
            }
            label="Show Inheritance"
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateRole} sx={{ ml: 2 }}>
            Create Role
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Roles Grid */}
      {loading && !roles.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {roles.map((role) => (
            <Grid item xs={12} sm={6} md={4} key={role.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: role.isSystem ? 2 : 1,
                  borderColor: role.isSystem ? 'primary.main' : 'divider',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {role.displayName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip
                          label={role.name}
                          size="small"
                          color={getRoleBadgeColor(role)}
                          variant={role.isSystem ? 'filled' : 'outlined'}
                        />
                        {role.isSystem && (
                          <Chip label="System" size="small" color="primary" icon={<SecurityIcon />} />
                        )}
                      </Box>
                    </Box>
                    {!role.isSystem && (
                      <Box>
                        <IconButton size="small" onClick={() => handleEditRole(role)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteRole(role)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {role.description || 'No description'}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Stats */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary.main">
                          {getPermissionCount(role)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Permissions
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {role._count?.userRoles || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Users
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<AssignmentIcon />}
                      onClick={() => handleEditPermissions(role)}
                    >
                      Permissions
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<PeopleIcon />}
                      onClick={() => handleManageUsers(role)}
                    >
                      Users
                    </Button>
                  </Box>

                  {/* Inheritance Info */}
                  {inheritanceView && role.rolePermissions && role.rolePermissions.length > 0 && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                        <InfoIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Top permissions: {role.rolePermissions.slice(0, 3).map(rp => rp.permission.resource).join(', ')}
                        {role.rolePermissions.length > 3 && '...'}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}

          {roles.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <SecurityIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No roles found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first role to get started
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateRole}>
                  Create Role
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Create/Edit Role Dialog */}
      <Dialog open={showRoleDialog} onClose={() => setShowRoleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value.toUpperCase() })}
              fullWidth
              required
              disabled={!!selectedRole}
              helperText="Role identifier (uppercase, e.g., CUSTOM_ADMIN)"
            />
            <TextField
              label="Display Name"
              value={roleForm.displayName}
              onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRoleDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRole} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : selectedRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission Matrix Dialog */}
      <Dialog
        open={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Manage Permissions for {selectedRole?.displayName}
        </DialogTitle>
        <DialogContent>
          {selectedRole && (
            <PermissionMatrix
              role={selectedRole}
              onSubmit={handlePermissionsUpdated}
              onCancel={() => setShowPermissionDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Users Dialog */}
      <Dialog
        open={showUsersDialog}
        onClose={() => setShowUsersDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Manage Users for {selectedRole?.displayName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAssignUser}>
              Assign User
            </Button>
          </Box>

          {userRoles.length === 0 ? (
            <Alert severity="info">No users assigned to this role</Alert>
          ) : (
            <List>
              {userRoles.map((userRole) => (
                <ListItem key={userRole.id} divider>
                  <ListItemText
                    primary={userRole.user.name || userRole.user.email}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {userRole.user.email}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Assigned: {new Date(userRole.assignedAt).toLocaleDateString()}
                        </Typography>
                        {userRole.expiresAt && (
                          <Chip
                            label={`Expires: ${new Date(userRole.expiresAt).toLocaleDateString()}`}
                            size="small"
                            color="warning"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => handleRevokeUserRole(userRole.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUsersDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog
        open={showAssignDialog}
        onClose={() => setShowAssignDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign User to {selectedRole?.displayName}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="User"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="">Select a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email} ({user.email})
                </option>
              ))}
            </TextField>

            <TextField
              label="Expires At (Optional)"
              type="datetime-local"
              value={assignExpiry}
              onChange={(e) => setAssignExpiry(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty for permanent assignment"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAssignDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUserAssignment} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RolePermissionEditor;

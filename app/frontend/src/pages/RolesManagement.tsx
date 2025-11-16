import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tooltip,
  CircularProgress,
  Grid,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import RoleForm from '../components/RoleForm';
import PermissionMatrix from '../components/PermissionMatrix';
import axios from 'axios';

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
}

interface RolePermission {
  id: string;
  permission: Permission;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  rolePermissions: RolePermission[];
  _count: {
    userRoles: number;
  };
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [openPermissionDialog, setOpenPermissionDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch roles
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/roles');
      setRoles(response.data.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showSnackbar('Error fetching roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Show snackbar
  const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handle create role
  const handleCreateRole = () => {
    setSelectedRole(null);
    setOpenRoleDialog(true);
  };

  // Handle edit role
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setOpenRoleDialog(true);
  };

  // Handle manage permissions
  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setOpenPermissionDialog(true);
  };

  // Handle delete role
  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setOpenDeleteDialog(true);
  };

  // Confirm delete role
  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      await axios.delete(`/api/roles/${roleToDelete.id}`);
      showSnackbar('Role deleted successfully', 'success');
      fetchRoles();
      setOpenDeleteDialog(false);
      setRoleToDelete(null);
    } catch (error: any) {
      console.error('Error deleting role:', error);
      const message = error.response?.data?.message || 'Error deleting role';
      showSnackbar(message, 'error');
    }
  };

  // Handle role form submit
  const handleRoleFormSubmit = () => {
    setOpenRoleDialog(false);
    fetchRoles();
    showSnackbar(
      selectedRole ? 'Role updated successfully' : 'Role created successfully',
      'success'
    );
  };

  // Handle permission matrix submit
  const handlePermissionMatrixSubmit = () => {
    setOpenPermissionDialog(false);
    fetchRoles();
    showSnackbar('Permissions updated successfully', 'success');
  };

  // Filter roles based on search query
  const filteredRoles = roles.filter(
    (role) =>
      role.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get role color based on name
  const getRoleColor = (roleName: string): 'primary' | 'secondary' | 'success' | 'warning' => {
    switch (roleName) {
      case 'ADMIN':
        return 'primary';
      case 'MANAGER':
        return 'secondary';
      case 'AGENT':
        return 'success';
      case 'CUSTOMER':
        return 'warning';
      default:
        return 'primary';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SecurityIcon sx={{ mr: 1, fontSize: 36 }} />
          Role-Based Access Control
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage user roles and permissions for your organization
        </Typography>
      </Box>

      {/* Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={8} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchRoles}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateRole}>
                Create Role
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredRoles.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                {searchQuery ? 'No roles found matching your search' : 'No roles created yet'}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Role</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="center">Users</TableCell>
                    <TableCell align="center">Permissions</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow key={role.id} hover>
                      <TableCell>
                        <Box>
                          <Chip
                            label={role.name}
                            color={getRoleColor(role.name)}
                            size="small"
                            sx={{ mb: 0.5 }}
                          />
                          <Typography variant="body2" fontWeight="medium">
                            {role.displayName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {role.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={<PeopleIcon />}
                          label={role._count.userRoles}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={role.rolePermissions.length}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {role.isSystem ? (
                          <Chip label="System" color="default" size="small" />
                        ) : (
                          <Chip label="Custom" color="info" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Manage Permissions">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleManagePermissions(role)}
                          >
                            <SecurityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Role">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditRole(role)}
                            disabled={role.isSystem}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={role.isSystem ? 'Cannot delete system role' : 'Delete Role'}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRole(role)}
                              disabled={role.isSystem}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Role Form Dialog */}
      <Dialog
        open={openRoleDialog}
        onClose={() => setOpenRoleDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedRole ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogContent>
          <RoleForm
            role={selectedRole}
            onSubmit={handleRoleFormSubmit}
            onCancel={() => setOpenRoleDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Permission Matrix Dialog */}
      <Dialog
        open={openPermissionDialog}
        onClose={() => setOpenPermissionDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Manage Permissions - {selectedRole?.displayName}
        </DialogTitle>
        <DialogContent>
          {selectedRole && (
            <PermissionMatrix
              role={selectedRole}
              onSubmit={handlePermissionMatrixSubmit}
              onCancel={() => setOpenPermissionDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to delete the role "{roleToDelete?.displayName}"?
          </Alert>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. Make sure no users are assigned to this role before
            deleting.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeleteRole} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RolesManagement;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Switch,
  FormControlLabel,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  VpnKey as KeyIcon,
  Schedule as ScheduleIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PermissionMatrix from '../components/PermissionMatrix';
import RolePermissionEditor from '../components/RolePermissionEditor';

// Types
interface User {
  id: string;
  email: string;
  name?: string;
}

interface ResourcePermission {
  id: string;
  userId: string;
  resource: string;
  action: string;
  condition?: any;
  grantedBy: string;
  expiresAt?: string;
  createdAt: string;
  user?: User;
}

interface TeamPermission {
  id: string;
  teamId: string;
  userId?: string;
  permission: string;
  resource: string;
  level: 'OWNER' | 'ADMIN' | 'EDIT' | 'VIEW' | 'NONE';
  scope: 'OWN' | 'TEAM' | 'ORGANIZATION' | 'ALL';
  conditions?: any;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const RESOURCES = [
  'tickets',
  'chat',
  'reports',
  'customers',
  'settings',
  'users',
  'team',
  'billing',
  'earnings',
  'products',
  'invoices',
];

const ACTIONS = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'EXPORT',
  'ASSIGN',
  'MANAGE',
];

const PERMISSION_LEVELS = ['OWNER', 'ADMIN', 'EDIT', 'VIEW', 'NONE'];
const DATA_SCOPES = ['OWN', 'TEAM', 'ORGANIZATION', 'ALL'];

const PermissionsManager: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resource Permissions State
  const [resourcePermissions, setResourcePermissions] = useState<ResourcePermission[]>([]);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [editingResourcePerm, setEditingResourcePerm] = useState<ResourcePermission | null>(null);

  // Team Permissions State
  const [teamPermissions, setTeamPermissions] = useState<TeamPermission[]>([]);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [editingTeamPerm, setEditingTeamPerm] = useState<TeamPermission | null>(null);

  // Form State
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('VIEW');
  const [selectedScope, setSelectedScope] = useState<string>('OWN');
  const [expiresAt, setExpiresAt] = useState('');
  const [conditionsEnabled, setConditionsEnabled] = useState(false);
  const [conditionFilters, setConditionFilters] = useState('{}');

  // Load data
  useEffect(() => {
    loadData();
  }, [tabValue]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (tabValue === 0) {
        // Load resource permissions
        const response = await axios.get('/api/permissions/resources');
        setResourcePermissions(response.data.data);
      } else if (tabValue === 1) {
        // Load team permissions
        const response = await axios.get('/api/permissions/teams');
        setTeamPermissions(response.data.data);
      }

      // Load users and teams for dropdowns
      const [usersRes, teamsRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/teams'),
      ]);

      setUsers(usersRes.data.data || []);
      setTeams(teamsRes.data.data || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.message || 'Error loading permissions');
    } finally {
      setLoading(false);
    }
  };

  // Resource Permission Handlers
  const handleCreateResourcePermission = () => {
    setEditingResourcePerm(null);
    setShowResourceDialog(true);
  };

  const handleSaveResourcePermission = async () => {
    if (!selectedUser || !selectedResource || !selectedAction) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: any = {
        userId: selectedUser.id,
        resource: selectedResource,
        action: selectedAction,
      };

      if (conditionsEnabled) {
        try {
          data.condition = {
            scope: selectedScope,
            filters: JSON.parse(conditionFilters),
          };
        } catch (e) {
          setError('Invalid JSON in condition filters');
          setLoading(false);
          return;
        }
      }

      if (expiresAt) {
        data.expiresAt = new Date(expiresAt).toISOString();
      }

      if (editingResourcePerm) {
        await axios.put(`/api/permissions/resources/${editingResourcePerm.id}`, data);
      } else {
        await axios.post('/api/permissions/resources', data);
      }

      setShowResourceDialog(false);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error('Error saving permission:', err);
      setError(err.response?.data?.message || 'Error saving permission');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResourcePermission = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this permission?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.delete(`/api/permissions/resources/${id}`);
      loadData();
    } catch (err: any) {
      console.error('Error deleting permission:', err);
      setError(err.response?.data?.message || 'Error deleting permission');
    } finally {
      setLoading(false);
    }
  };

  // Team Permission Handlers
  const handleCreateTeamPermission = () => {
    setEditingTeamPerm(null);
    setShowTeamDialog(true);
  };

  const handleSaveTeamPermission = async () => {
    if (!selectedTeam || !selectedResource || !selectedAction) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: any = {
        teamId: selectedTeam.id,
        userId: selectedUser?.id,
        permission: selectedAction,
        resource: selectedResource,
        level: selectedLevel,
        scope: selectedScope,
      };

      if (conditionsEnabled) {
        try {
          data.conditions = {
            scope: selectedScope,
            filters: JSON.parse(conditionFilters),
          };
        } catch (e) {
          setError('Invalid JSON in condition filters');
          setLoading(false);
          return;
        }
      }

      if (editingTeamPerm) {
        await axios.put(`/api/permissions/teams/${editingTeamPerm.id}`, data);
      } else {
        await axios.post('/api/permissions/teams', data);
      }

      setShowTeamDialog(false);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error('Error saving team permission:', err);
      setError(err.response?.data?.message || 'Error saving team permission');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeamPermission = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this team permission?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.delete(`/api/permissions/teams/${id}`);
      loadData();
    } catch (err: any) {
      console.error('Error deleting team permission:', err);
      setError(err.response?.data?.message || 'Error deleting team permission');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setSelectedTeam(null);
    setSelectedResource('');
    setSelectedAction('');
    setSelectedLevel('VIEW');
    setSelectedScope('OWN');
    setExpiresAt('');
    setConditionsEnabled(false);
    setConditionFilters('{}');
  };

  const getResourceColor = (resource: string) => {
    const colors: Record<string, any> = {
      tickets: 'primary',
      chat: 'secondary',
      reports: 'info',
      customers: 'success',
      settings: 'warning',
      users: 'error',
      team: 'primary',
      billing: 'warning',
    };
    return colors[resource] || 'default';
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SecurityIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Permissions Manager
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage granular resource and team permissions with conditions and inheritance
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <KeyIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">{resourcePermissions.length}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Resource Permissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <GroupIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">{teamPermissions.length}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Team Permissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">{users.length}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduleIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">
                  {resourcePermissions.filter((p) => p.expiresAt).length}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Time-Limited
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Resource Permissions" icon={<KeyIcon />} iconPosition="start" />
          <Tab label="Team Permissions" icon={<GroupIcon />} iconPosition="start" />
          <Tab label="Role Matrix" icon={<SecurityIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Resource Permissions Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Resource Permissions</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateResourcePermission}
          >
            Grant Permission
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Conditions</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resourcePermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No resource permissions found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  resourcePermissions.map((perm) => {
                    const condition = perm.condition ? JSON.parse(perm.condition) : null;
                    return (
                      <TableRow key={perm.id} hover>
                        <TableCell>
                          <Typography variant="body2">{perm.user?.name || perm.user?.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {perm.user?.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={perm.resource}
                            size="small"
                            color={getResourceColor(perm.resource)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={perm.action} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={condition?.scope || 'ALL'}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {perm.expiresAt ? (
                            <Tooltip title={new Date(perm.expiresAt).toLocaleString()}>
                              <Chip
                                label="Expires"
                                size="small"
                                color="warning"
                                icon={<ScheduleIcon />}
                              />
                            </Tooltip>
                          ) : (
                            <Chip label="Permanent" size="small" color="success" />
                          )}
                        </TableCell>
                        <TableCell>
                          {condition ? (
                            <Tooltip title={JSON.stringify(condition, null, 2)}>
                              <Chip
                                label="Has Conditions"
                                size="small"
                                color="secondary"
                                icon={<FilterIcon />}
                              />
                            </Tooltip>
                          ) : (
                            <Chip label="No Conditions" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteResourcePermission(perm.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Team Permissions Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Team Permissions</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTeamPermission}
          >
            Grant Team Permission
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Permission</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No team permissions found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  teamPermissions.map((perm) => (
                    <TableRow key={perm.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {teams.find((t) => t.id === perm.teamId)?.name || 'Unknown Team'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {perm.userId ? (
                          <Typography variant="body2">
                            {users.find((u) => u.id === perm.userId)?.email || 'Unknown User'}
                          </Typography>
                        ) : (
                          <Chip label="All Team Members" size="small" color="info" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={perm.resource}
                          size="small"
                          color={getResourceColor(perm.resource)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={perm.permission} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={perm.level} size="small" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Chip label={perm.scope} size="small" color="secondary" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteTeamPermission(perm.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Role Matrix Tab */}
      <TabPanel value={tabValue} index={2}>
        <RolePermissionEditor />
      </TabPanel>

      {/* Resource Permission Dialog */}
      <Dialog
        open={showResourceDialog}
        onClose={() => setShowResourceDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingResourcePerm ? 'Edit Resource Permission' : 'Grant Resource Permission'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={users}
              getOptionLabel={(user) => `${user.name || user.email} (${user.email})`}
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              renderInput={(params) => <TextField {...params} label="User *" />}
            />

            <FormControl fullWidth>
              <InputLabel>Resource *</InputLabel>
              <Select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                label="Resource *"
              >
                {RESOURCES.map((resource) => (
                  <MenuItem key={resource} value={resource}>
                    {resource}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Action *</InputLabel>
              <Select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                label="Action *"
              >
                {ACTIONS.map((action) => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Expires At"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              helperText="Leave empty for permanent permission"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={conditionsEnabled}
                  onChange={(e) => setConditionsEnabled(e.target.checked)}
                />
              }
              label="Enable Conditions"
            />

            {conditionsEnabled && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Scope</InputLabel>
                  <Select
                    value={selectedScope}
                    onChange={(e) => setSelectedScope(e.target.value)}
                    label="Scope"
                  >
                    {DATA_SCOPES.map((scope) => (
                      <MenuItem key={scope} value={scope}>
                        {scope}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Custom Filters (JSON)"
                  value={conditionFilters}
                  onChange={(e) => setConditionFilters(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                  helperText='e.g., {"department": "sales", "region": "west"}'
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResourceDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveResourcePermission}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Permission Dialog */}
      <Dialog
        open={showTeamDialog}
        onClose={() => setShowTeamDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTeamPerm ? 'Edit Team Permission' : 'Grant Team Permission'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={teams}
              getOptionLabel={(team) => team.name}
              value={selectedTeam}
              onChange={(_, value) => setSelectedTeam(value)}
              renderInput={(params) => <TextField {...params} label="Team *" />}
            />

            <Autocomplete
              options={users}
              getOptionLabel={(user) => `${user.name || user.email} (${user.email})`}
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              renderInput={(params) => (
                <TextField {...params} label="User (optional)" helperText="Leave empty for all team members" />
              )}
            />

            <FormControl fullWidth>
              <InputLabel>Resource *</InputLabel>
              <Select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                label="Resource *"
              >
                {RESOURCES.map((resource) => (
                  <MenuItem key={resource} value={resource}>
                    {resource}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Permission *</InputLabel>
              <Select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                label="Permission *"
              >
                {ACTIONS.map((action) => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Level *</InputLabel>
              <Select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                label="Level *"
              >
                {PERMISSION_LEVELS.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Scope *</InputLabel>
              <Select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                label="Scope *"
              >
                {DATA_SCOPES.map((scope) => (
                  <MenuItem key={scope} value={scope}>
                    {scope}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={conditionsEnabled}
                  onChange={(e) => setConditionsEnabled(e.target.checked)}
                />
              }
              label="Enable Custom Conditions"
            />

            {conditionsEnabled && (
              <TextField
                label="Custom Conditions (JSON)"
                value={conditionFilters}
                onChange={(e) => setConditionFilters(e.target.value)}
                multiline
                rows={4}
                fullWidth
                helperText='e.g., {"timeRestriction": {"startTime": "09:00", "endTime": "17:00"}}'
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTeamDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveTeamPermission}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PermissionsManager;

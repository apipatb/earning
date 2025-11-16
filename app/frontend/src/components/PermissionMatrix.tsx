import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import axios from 'axios';

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
}

interface PermissionMatrixProps {
  role: Role;
  onSubmit: () => void;
  onCancel: () => void;
}

type GroupedPermissions = Record<string, Permission[]>;

const PERMISSION_ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'];

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ role, onSubmit, onCancel }) => {
  const [permissions, setPermissions] = useState<GroupedPermissions>({});
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/permissions?grouped=true');
        setPermissions(response.data.data);

        // Initialize selected permissions from role
        if (role.rolePermissions) {
          const selected = new Set(role.rolePermissions.map((rp) => rp.permission.id));
          setSelectedPermissions(selected);
        }
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError('Error loading permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [role]);

  // Toggle permission
  const togglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  // Toggle all permissions for a resource
  const toggleResourcePermissions = (resource: string, checked: boolean) => {
    const newSelected = new Set(selectedPermissions);
    const resourcePermissions = permissions[resource] || [];

    resourcePermissions.forEach((permission) => {
      if (checked) {
        newSelected.add(permission.id);
      } else {
        newSelected.delete(permission.id);
      }
    });

    setSelectedPermissions(newSelected);
  };

  // Toggle all permissions for an action across all resources
  const toggleActionPermissions = (action: string, checked: boolean) => {
    const newSelected = new Set(selectedPermissions);

    Object.values(permissions).forEach((resourcePermissions) => {
      resourcePermissions
        .filter((p) => p.action === action)
        .forEach((permission) => {
          if (checked) {
            newSelected.add(permission.id);
          } else {
            newSelected.delete(permission.id);
          }
        });
    });

    setSelectedPermissions(newSelected);
  };

  // Check if all permissions for a resource are selected
  const isResourceFullySelected = (resource: string): boolean => {
    const resourcePermissions = permissions[resource] || [];
    return resourcePermissions.every((p) => selectedPermissions.has(p.id));
  };

  // Check if some permissions for a resource are selected
  const isResourcePartiallySelected = (resource: string): boolean => {
    const resourcePermissions = permissions[resource] || [];
    const selectedCount = resourcePermissions.filter((p) => selectedPermissions.has(p.id)).length;
    return selectedCount > 0 && selectedCount < resourcePermissions.length;
  };

  // Check if all permissions for an action are selected
  const isActionFullySelected = (action: string): boolean => {
    let total = 0;
    let selected = 0;

    Object.values(permissions).forEach((resourcePermissions) => {
      resourcePermissions
        .filter((p) => p.action === action)
        .forEach((permission) => {
          total++;
          if (selectedPermissions.has(permission.id)) {
            selected++;
          }
        });
    });

    return total > 0 && selected === total;
  };

  // Get permission by resource and action
  const getPermission = (resource: string, action: string): Permission | undefined => {
    const resourcePermissions = permissions[resource] || [];
    return resourcePermissions.find((p) => p.action === action);
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Get current role permissions
      const currentPermissions = new Set(
        role.rolePermissions?.map((rp) => rp.permission.id) || []
      );

      // Calculate permissions to add and remove
      const toAdd = Array.from(selectedPermissions).filter((id) => !currentPermissions.has(id));
      const toRemove = Array.from(currentPermissions).filter((id) => !selectedPermissions.has(id));

      // Remove permissions
      if (toRemove.length > 0) {
        await axios.delete(`/api/roles/${role.id}/permissions`, {
          data: { permissionIds: toRemove },
        });
      }

      // Add permissions
      if (toAdd.length > 0) {
        await axios.post(`/api/roles/${role.id}/permissions`, {
          permissionIds: toAdd,
        });
      }

      onSubmit();
    } catch (err: any) {
      console.error('Error saving permissions:', err);
      const message = err.response?.data?.message || 'Error saving permissions';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const resources = Object.keys(permissions).sort();

  return (
    <Box sx={{ mt: 2 }}>
      {/* Summary */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>{selectedPermissions.size}</strong> permission(s) selected for{' '}
          <strong>{role.displayName}</strong>
        </Typography>
      </Alert>

      {/* Quick Actions */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ width: '100%', mb: 1 }}>
          Quick Select by Action:
        </Typography>
        {PERMISSION_ACTIONS.map((action) => (
          <FormControlLabel
            key={action}
            control={
              <Checkbox
                checked={isActionFullySelected(action)}
                onChange={(e) => toggleActionPermissions(action, e.target.checked)}
                size="small"
              />
            }
            label={
              <Chip
                label={action}
                size="small"
                color={isActionFullySelected(action) ? 'primary' : 'default'}
              />
            }
          />
        ))}
      </Box>

      {/* Permission Matrix */}
      <Box sx={{ mb: 3 }}>
        {resources.map((resource) => {
          const isFullySelected = isResourceFullySelected(resource);
          const isPartiallySelected = isResourcePartiallySelected(resource);

          return (
            <Accordion key={resource} defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: isFullySelected ? 'action.selected' : 'inherit',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Checkbox
                    checked={isFullySelected}
                    indeterminate={isPartiallySelected}
                    onChange={(e) => toggleResourcePermissions(resource, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    icon={<CheckBoxOutlineBlankIcon />}
                    checkedIcon={<CheckBoxIcon />}
                  />
                  <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', ml: 1 }}>
                    {resource}
                  </Typography>
                  <Chip
                    label={`${permissions[resource].filter((p) => selectedPermissions.has(p.id)).length}/${permissions[resource].length}`}
                    size="small"
                    color={isFullySelected ? 'primary' : 'default'}
                    sx={{ ml: 2 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Action</TableCell>
                        <TableCell>Permission</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="center">Enabled</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {PERMISSION_ACTIONS.map((action) => {
                        const permission = getPermission(resource, action);
                        if (!permission) return null;

                        return (
                          <TableRow
                            key={permission.id}
                            hover
                            sx={{
                              backgroundColor: selectedPermissions.has(permission.id)
                                ? 'action.selected'
                                : 'inherit',
                            }}
                          >
                            <TableCell>
                              <Chip label={action} size="small" color="primary" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {permission.displayName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {permission.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {permission.description || 'No description'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip
                                title={
                                  selectedPermissions.has(permission.id)
                                    ? 'Click to disable'
                                    : 'Click to enable'
                                }
                              >
                                <Checkbox
                                  checked={selectedPermissions.has(permission.id)}
                                  onChange={() => togglePermission(permission.id)}
                                  color="primary"
                                />
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving && <CircularProgress size={20} />}
        >
          Save Permissions
        </Button>
      </Box>
    </Box>
  );
};

export default PermissionMatrix;

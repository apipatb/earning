import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import axios from 'axios';

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
}

interface RoleFormProps {
  role: Role | null;
  onSubmit: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  displayName: string;
  description: string;
}

interface FormErrors {
  name?: string;
  displayName?: string;
  description?: string;
}

const ROLE_NAMES = ['ADMIN', 'MANAGER', 'AGENT', 'CUSTOMER'];

const RoleForm: React.FC<RoleFormProps> = ({ role, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    name: role?.name || '',
    displayName: role?.displayName || '',
    description: role?.description || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        displayName: role.displayName,
        description: role.description || '',
      });
    }
  }, [role]);

  // Handle input change
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (role) {
        // Update existing role
        await axios.put(`/api/roles/${role.id}`, {
          displayName: formData.displayName,
          description: formData.description,
        });
      } else {
        // Create new role
        await axios.post('/api/roles', formData);
      }

      onSubmit();
    } catch (err: any) {
      console.error('Error saving role:', err);
      const message = err.response?.data?.message || 'Error saving role';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Role Name - only editable for new roles */}
        <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.name} disabled={!!role}>
            <InputLabel>Role Name</InputLabel>
            <Select
              value={formData.name}
              label="Role Name"
              onChange={(e) => handleChange('name', e.target.value)}
            >
              {ROLE_NAMES.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
            {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
            {role && (
              <FormHelperText>Role name cannot be changed after creation</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Display Name */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Display Name"
            value={formData.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            error={!!errors.displayName}
            helperText={errors.displayName || 'User-friendly name for the role'}
            required
          />
        </Grid>

        {/* Description */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            error={!!errors.description}
            helperText={errors.description || 'Brief description of the role and its purpose'}
            multiline
            rows={3}
          />
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {role ? 'Update Role' : 'Create Role'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RoleForm;

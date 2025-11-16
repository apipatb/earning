import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  IconButton,
  Grid,
  Paper,
  Divider,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface SegmentRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
}

interface MLConfig {
  type: 'rfm' | 'behavioral' | 'engagement';
  clusters: number;
  features: string[];
}

interface SegmentCriteria {
  rules?: SegmentRule[];
  conditions?: 'AND' | 'OR';
  mlConfig?: MLConfig;
}

interface Segment {
  id?: string;
  name: string;
  description?: string;
  criteria: any;
  segmentType: 'manual' | 'rule-based' | 'ml-clustering';
}

interface SegmentBuilderProps {
  segment: Segment | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const FIELD_OPTIONS = [
  { value: 'totalPurchases', label: 'Total Purchases', type: 'number' },
  { value: 'purchaseCount', label: 'Purchase Count', type: 'number' },
  { value: 'lastPurchase', label: 'Last Purchase Date', type: 'date' },
  { value: 'createdAt', label: 'Customer Since', type: 'date' },
  { value: 'name', label: 'Name', type: 'string' },
  { value: 'email', label: 'Email', type: 'string' },
  { value: 'city', label: 'City', type: 'string' },
  { value: 'country', label: 'Country', type: 'string' },
  { value: 'isActive', label: 'Is Active', type: 'boolean' },
];

const OPERATOR_OPTIONS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater Than or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less Than or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'in', label: 'In List' },
  { value: 'between', label: 'Between' },
];

const ML_TYPE_OPTIONS = [
  { value: 'rfm', label: 'RFM (Recency, Frequency, Monetary)' },
  { value: 'behavioral', label: 'Behavioral Patterns' },
  { value: 'engagement', label: 'Engagement Level' },
];

const SegmentBuilder: React.FC<SegmentBuilderProps> = ({ segment, onSave, onCancel }) => {
  const [name, setName] = useState(segment?.name || '');
  const [description, setDescription] = useState(segment?.description || '');
  const [segmentType, setSegmentType] = useState<'manual' | 'rule-based' | 'ml-clustering'>(
    segment?.segmentType || 'manual'
  );
  const [rules, setRules] = useState<SegmentRule[]>([]);
  const [conditions, setConditions] = useState<'AND' | 'OR'>('AND');
  const [mlType, setMLType] = useState<'rfm' | 'behavioral' | 'engagement'>('rfm');
  const [clusters, setClusters] = useState(3);
  const [error, setError] = useState('');

  useEffect(() => {
    if (segment?.criteria) {
      try {
        const criteria = typeof segment.criteria === 'string'
          ? JSON.parse(segment.criteria)
          : segment.criteria;

        if (criteria.rules) {
          setRules(criteria.rules);
        }
        if (criteria.conditions) {
          setConditions(criteria.conditions);
        }
        if (criteria.mlConfig) {
          setMLType(criteria.mlConfig.type);
          setClusters(criteria.mlConfig.clusters || 3);
        }
      } catch (err) {
        console.error('Failed to parse criteria:', err);
      }
    }
  }, [segment]);

  const handleAddRule = () => {
    setRules([
      ...rules,
      { field: 'totalPurchases', operator: 'gte', value: '' },
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, field: keyof SegmentRule, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const handleSubmit = () => {
    setError('');

    if (!name.trim()) {
      setError('Segment name is required');
      return;
    }

    let criteria: SegmentCriteria = {};

    if (segmentType === 'rule-based') {
      if (rules.length === 0) {
        setError('At least one rule is required for rule-based segments');
        return;
      }
      criteria = { rules, conditions };
    } else if (segmentType === 'ml-clustering') {
      criteria = {
        mlConfig: {
          type: mlType,
          clusters,
          features: [],
        },
      };
    }

    const data = {
      name,
      description,
      segmentType,
      criteria,
    };

    onSave(data);
  };

  const getFieldType = (fieldName: string) => {
    const field = FIELD_OPTIONS.find((f) => f.value === fieldName);
    return field?.type || 'string';
  };

  const renderValueInput = (rule: SegmentRule, index: number) => {
    const fieldType = getFieldType(rule.field);

    if (rule.operator === 'between') {
      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            type={fieldType === 'date' ? 'date' : 'number'}
            value={rule.value?.[0] || ''}
            onChange={(e) => {
              const newValue = [e.target.value, rule.value?.[1] || ''];
              handleRuleChange(index, 'value', newValue);
            }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type={fieldType === 'date' ? 'date' : 'number'}
            value={rule.value?.[1] || ''}
            onChange={(e) => {
              const newValue = [rule.value?.[0] || '', e.target.value];
              handleRuleChange(index, 'value', newValue);
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      );
    }

    if (fieldType === 'boolean') {
      return (
        <Select
          size="small"
          value={rule.value}
          onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
        >
          <MenuItem value="true">True</MenuItem>
          <MenuItem value="false">False</MenuItem>
        </Select>
      );
    }

    if (fieldType === 'date') {
      return (
        <TextField
          size="small"
          type="date"
          value={rule.value}
          onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      );
    }

    if (fieldType === 'number') {
      return (
        <TextField
          size="small"
          type="number"
          value={rule.value}
          onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
        />
      );
    }

    return (
      <TextField
        size="small"
        value={rule.value}
        onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
      />
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Segment Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Segment Type</InputLabel>
            <Select
              value={segmentType}
              onChange={(e) => setSegmentType(e.target.value as any)}
              label="Segment Type"
            >
              <MenuItem value="manual">Manual</MenuItem>
              <MenuItem value="rule-based">Rule-Based (Auto)</MenuItem>
              <MenuItem value="ml-clustering">ML Clustering (Auto)</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {segmentType === 'rule-based' && (
          <>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Rules</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Condition</InputLabel>
                  <Select
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value as 'AND' | 'OR')}
                    label="Condition"
                  >
                    <MenuItem value="AND">AND (All)</MenuItem>
                    <MenuItem value="OR">OR (Any)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>

            {rules.map((rule, index) => (
              <Grid item xs={12} key={index}>
                <Paper sx={{ p: 2, position: 'relative' }}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveRule(index)}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Field</InputLabel>
                        <Select
                          value={rule.field}
                          onChange={(e) => handleRuleChange(index, 'field', e.target.value)}
                          label="Field"
                        >
                          {FIELD_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Operator</InputLabel>
                        <Select
                          value={rule.operator}
                          onChange={(e) => handleRuleChange(index, 'operator', e.target.value)}
                          label="Operator"
                        >
                          {OPERATOR_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={5}>
                      {renderValueInput(rule, index)}
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddRule}
                fullWidth
              >
                Add Rule
              </Button>
            </Grid>
          </>
        )}

        {segmentType === 'ml-clustering' && (
          <>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>
                ML Configuration
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Clustering Type</InputLabel>
                <Select
                  value={mlType}
                  onChange={(e) => setMLType(e.target.value as any)}
                  label="Clustering Type"
                >
                  {ML_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Number of Clusters"
                value={clusters}
                onChange={(e) => setClusters(parseInt(e.target.value) || 3)}
                inputProps={{ min: 2, max: 10 }}
                helperText="Number of customer groups to create (2-10)"
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                ML clustering will automatically group customers based on {mlType === 'rfm' ? 'Recency, Frequency, and Monetary value' : mlType === 'behavioral' ? 'purchase patterns and support tickets' : 'engagement metrics'}.
                The system will identify the most valuable cluster automatically.
              </Alert>
            </Grid>
          </>
        )}

        {segmentType === 'manual' && (
          <Grid item xs={12}>
            <Alert severity="info">
              Manual segments allow you to add and remove customers individually.
              Use the segment details page to manage members.
            </Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {segment ? 'Update' : 'Create'} Segment
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SegmentBuilder;

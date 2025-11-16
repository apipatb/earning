import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  TrendingUp,
  People,
  Warning,
  CheckCircle,
  Analytics,
} from '@mui/icons-material';
import api from '../services/api';
import SegmentBuilder from '../components/SegmentBuilder';
import SegmentAnalytics from '../components/SegmentAnalytics';

interface Segment {
  id: string;
  name: string;
  description?: string;
  criteria: any;
  memberCount: number;
  isAuto: boolean;
  segmentType: 'manual' | 'rule-based' | 'ml-clustering';
  isActive: boolean;
  lastUpdated: string;
  createdAt: string;
  analysis?: SegmentAnalysis;
  _count?: {
    members: number;
  };
}

interface SegmentAnalysis {
  totalMembers: number;
  avgLifetimeValue: number;
  totalLifetimeValue: number;
  avgChurnRisk: number;
  avgEngagementScore: number;
  avgPurchaseFrequency: number;
  avgRecency: number;
  avgTicketCount: number;
  conversionRate: number;
  retentionRate: number;
  lastCalculated: string;
}

const CustomerSegmentation: React.FC = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAnalytics, setOpenAnalytics] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/segments?includeAnalysis=true');
      setSegments(response.data.segments || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch segments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSegment = () => {
    setSelectedSegment(null);
    setOpenDialog(true);
  };

  const handleEditSegment = (segment: Segment) => {
    setSelectedSegment(segment);
    setOpenDialog(true);
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this segment?')) {
      return;
    }

    try {
      await api.delete(`/api/v1/segments/${segmentId}`);
      setSuccess('Segment deleted successfully');
      fetchSegments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete segment');
    }
  };

  const handleRefreshSegment = async (segmentId: string) => {
    try {
      await api.post(`/api/v1/segments/${segmentId}/refresh`);
      setSuccess('Segment refreshed successfully');
      fetchSegments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to refresh segment');
    }
  };

  const handleRefreshAll = async () => {
    try {
      await api.post('/api/v1/segments/refresh-all');
      setSuccess('All auto segments refreshed successfully');
      fetchSegments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to refresh segments');
    }
  };

  const handleCreatePredefined = async () => {
    try {
      await api.post('/api/v1/segments/predefined');
      setSuccess('Predefined segments created successfully');
      fetchSegments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create predefined segments');
    }
  };

  const handleSaveSegment = async (segmentData: any) => {
    try {
      if (selectedSegment) {
        await api.put(`/api/v1/segments/${selectedSegment.id}`, segmentData);
        setSuccess('Segment updated successfully');
      } else {
        await api.post('/api/v1/segments', segmentData);
        setSuccess('Segment created successfully');
      }
      setOpenDialog(false);
      fetchSegments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save segment');
    }
  };

  const handleViewAnalytics = (segment: Segment) => {
    setSelectedSegment(segment);
    setOpenAnalytics(true);
  };

  const getSegmentTypeColor = (type: string) => {
    switch (type) {
      case 'manual':
        return 'default';
      case 'rule-based':
        return 'primary';
      case 'ml-clustering':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getChurnRiskColor = (risk: number) => {
    if (risk >= 70) return 'error';
    if (risk >= 40) return 'warning';
    return 'success';
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'error';
  };

  const filteredSegments = segments.filter((segment) => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return segment.segmentType === 'manual';
    if (tabValue === 2) return segment.segmentType === 'rule-based';
    if (tabValue === 3) return segment.segmentType === 'ml-clustering';
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Customer Segmentation
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
            disabled={loading}
          >
            Refresh All
          </Button>
          <Button
            variant="outlined"
            onClick={handleCreatePredefined}
            disabled={loading}
          >
            Create Predefined
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateSegment}
          >
            Create Segment
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="All Segments" />
        <Tab label="Manual" />
        <Tab label="Rule-Based" />
        <Tab label="ML Clustering" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredSegments.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No segments found. Create your first segment to get started.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredSegments.map((segment) => (
            <Grid item xs={12} md={6} lg={4} key={segment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" component="h2">
                      {segment.name}
                    </Typography>
                    <Box>
                      {segment.segmentType !== 'manual' && (
                        <Tooltip title="Refresh">
                          <IconButton
                            size="small"
                            onClick={() => handleRefreshSegment(segment.id)}
                          >
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditSegment(segment)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSegment(segment.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {segment.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {segment.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={segment.segmentType.replace('-', ' ').toUpperCase()}
                      color={getSegmentTypeColor(segment.segmentType)}
                      size="small"
                    />
                    {segment.isAuto && <Chip label="AUTO" color="info" size="small" />}
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <People fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>{segment.memberCount}</strong> members
                      </Typography>
                    </Box>
                  </Box>

                  {segment.analysis && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Avg LTV
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            ${Number(segment.analysis.avgLifetimeValue).toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Churn Risk
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {Number(segment.analysis.avgChurnRisk).toFixed(1)}%
                            </Typography>
                            {Number(segment.analysis.avgChurnRisk) >= 70 ? (
                              <Warning fontSize="small" color="error" />
                            ) : Number(segment.analysis.avgChurnRisk) >= 40 ? (
                              <Warning fontSize="small" color="warning" />
                            ) : (
                              <CheckCircle fontSize="small" color="success" />
                            )}
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Engagement
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {Number(segment.analysis.avgEngagementScore).toFixed(1)}%
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Retention
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {Number(segment.analysis.retentionRate).toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<Analytics />}
                      onClick={() => handleViewAnalytics(segment)}
                    >
                      View Analytics
                    </Button>
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Last updated: {new Date(segment.lastUpdated).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Segment Builder Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedSegment ? 'Edit Segment' : 'Create New Segment'}
        </DialogTitle>
        <DialogContent>
          <SegmentBuilder
            segment={selectedSegment}
            onSave={handleSaveSegment}
            onCancel={() => setOpenDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog
        open={openAnalytics}
        onClose={() => setOpenAnalytics(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedSegment?.name} - Analytics
        </DialogTitle>
        <DialogContent>
          {selectedSegment && (
            <SegmentAnalytics segmentId={selectedSegment.id} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnalytics(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerSegmentation;

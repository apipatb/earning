import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  AlertTitle,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import SlackConnect from '../components/SlackConnect';
import TeamsConnect from '../components/TeamsConnect';
import axios from 'axios';

interface SlackIntegration {
  id: string;
  teamId: string;
  teamName: string;
  channelId: string;
  channelName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TeamsIntegration {
  id: string;
  teamId: string;
  teamName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BotNotification {
  id: string;
  platform: 'SLACK' | 'TEAMS';
  messageId: string;
  content: string;
  sentAt: string;
  deliveryStatus: string;
  error?: string;
}

const BotIntegrations: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [slackIntegrations, setSlackIntegrations] = useState<SlackIntegration[]>([]);
  const [teamsIntegrations, setTeamsIntegrations] = useState<TeamsIntegration[]>([]);
  const [notifications, setNotifications] = useState<BotNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [showSlackConnect, setShowSlackConnect] = useState(false);
  const [showTeamsConnect, setShowTeamsConnect] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    integrationId: string | null;
    platform: 'slack' | 'teams' | null;
  }>({
    open: false,
    integrationId: null,
    platform: null,
  });

  useEffect(() => {
    fetchIntegrations();
    fetchNotifications();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/bot/integrations');
      setSlackIntegrations(response.data.slack || []);
      setTeamsIntegrations(response.data.teams || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (platform?: 'slack' | 'teams') => {
    try {
      const params = platform ? { platform } : {};
      const response = await axios.get('/api/v1/bot/notifications', { params });
      setNotifications(response.data.notifications || []);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleToggleIntegration = async (
    integrationId: string,
    platform: 'slack' | 'teams',
    isActive: boolean
  ) => {
    try {
      await axios.patch(`/api/v1/bot/integrations/${platform}/${integrationId}/toggle`, {
        isActive,
      });
      setSuccess(`Integration ${isActive ? 'enabled' : 'disabled'} successfully`);
      fetchIntegrations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle integration');
    }
  };

  const handleDeleteIntegration = async () => {
    if (!deleteConfirmDialog.integrationId || !deleteConfirmDialog.platform) return;

    try {
      await axios.delete(
        `/api/v1/bot/integrations/${deleteConfirmDialog.platform}/${deleteConfirmDialog.integrationId}`
      );
      setSuccess('Integration deleted successfully');
      fetchIntegrations();
      setDeleteConfirmDialog({ open: false, integrationId: null, platform: null });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete integration');
      setDeleteConfirmDialog({ open: false, integrationId: null, platform: null });
    }
  };

  const handleSlackConnected = () => {
    setShowSlackConnect(false);
    setSuccess('Slack integration connected successfully!');
    fetchIntegrations();
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleTeamsConnected = () => {
    setShowTeamsConnect(false);
    setSuccess('Teams integration connected successfully!');
    fetchIntegrations();
    setTimeout(() => setSuccess(null), 3000);
  };

  const renderSlackIntegrations = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Slack Workspaces</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowSlackConnect(true)}
        >
          Connect Slack Workspace
        </Button>
      </Box>

      {slackIntegrations.length === 0 ? (
        <Alert severity="info">
          <AlertTitle>No Slack integrations</AlertTitle>
          Connect a Slack workspace to receive ticket notifications and manage tickets directly from Slack.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {slackIntegrations.map((integration) => (
            <Grid item xs={12} md={6} key={integration.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{integration.teamName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        #{integration.channelName || 'No channel'}
                      </Typography>
                    </Box>
                    <Chip
                      label={integration.isActive ? 'Active' : 'Inactive'}
                      color={integration.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary" display="block">
                    Team ID: {integration.teamId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Connected: {new Date(integration.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={integration.isActive}
                        onChange={(e) =>
                          handleToggleIntegration(integration.id, 'slack', e.target.checked)
                        }
                      />
                    }
                    label="Enabled"
                  />
                  <IconButton
                    color="error"
                    onClick={() =>
                      setDeleteConfirmDialog({
                        open: true,
                        integrationId: integration.id,
                        platform: 'slack',
                      })
                    }
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderTeamsIntegrations = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Microsoft Teams</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowTeamsConnect(true)}
        >
          Connect Teams
        </Button>
      </Box>

      {teamsIntegrations.length === 0 ? (
        <Alert severity="info">
          <AlertTitle>No Teams integrations</AlertTitle>
          Connect Microsoft Teams to receive ticket notifications and manage tickets directly from Teams.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {teamsIntegrations.map((integration) => (
            <Grid item xs={12} md={6} key={integration.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{integration.teamName || 'Unnamed Team'}</Typography>
                    </Box>
                    <Chip
                      label={integration.isActive ? 'Active' : 'Inactive'}
                      color={integration.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary" display="block">
                    Team ID: {integration.teamId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Connected: {new Date(integration.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={integration.isActive}
                        onChange={(e) =>
                          handleToggleIntegration(integration.id, 'teams', e.target.checked)
                        }
                      />
                    }
                    label="Enabled"
                  />
                  <IconButton
                    color="error"
                    onClick={() =>
                      setDeleteConfirmDialog({
                        open: true,
                        integrationId: integration.id,
                        platform: 'teams',
                      })
                    }
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderNotifications = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Notification History</Typography>
        <IconButton onClick={() => fetchNotifications()}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {notifications.length === 0 ? (
        <Alert severity="info">
          <AlertTitle>No notifications sent yet</AlertTitle>
          Once you have active integrations, notification history will appear here.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Platform</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sent At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell>
                    <Chip
                      label={notification.platform}
                      size="small"
                      color={notification.platform === 'SLACK' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                      {notification.content}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {notification.deliveryStatus === 'sent' ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Sent"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<ErrorIcon />}
                        label="Failed"
                        color="error"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(notification.sentAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Bot Integrations
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Connect Slack and Microsoft Teams to manage support tickets directly from your communication platforms.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Slack" />
          <Tab label="Microsoft Teams" />
          <Tab label="Notification History" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderSlackIntegrations()}
        {activeTab === 1 && renderTeamsIntegrations()}
        {activeTab === 2 && renderNotifications()}
      </Box>

      {/* Slack Connect Dialog */}
      <Dialog open={showSlackConnect} onClose={() => setShowSlackConnect(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connect Slack Workspace</DialogTitle>
        <DialogContent>
          <SlackConnect onSuccess={handleSlackConnected} onCancel={() => setShowSlackConnect(false)} />
        </DialogContent>
      </Dialog>

      {/* Teams Connect Dialog */}
      <Dialog open={showTeamsConnect} onClose={() => setShowTeamsConnect(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connect Microsoft Teams</DialogTitle>
        <DialogContent>
          <TeamsConnect onSuccess={handleTeamsConnected} onCancel={() => setShowTeamsConnect(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.open} onClose={() => setDeleteConfirmDialog({ open: false, integrationId: null, platform: null })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this integration? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog({ open: false, integrationId: null, platform: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteIntegration} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BotIntegrations;

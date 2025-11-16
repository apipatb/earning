import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
} from '@mui/material';
import axios from 'axios';

interface SlackConnectProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const SlackConnect: React.FC<SlackConnectProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthWindow, setOauthWindow] = useState<Window | null>(null);

  useEffect(() => {
    // Listen for OAuth callback
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'slack-oauth-callback') {
        const { code, error: oauthError } = event.data;

        if (oauthWindow) {
          oauthWindow.close();
          setOauthWindow(null);
        }

        if (oauthError) {
          setError(`OAuth error: ${oauthError}`);
          setLoading(false);
          return;
        }

        if (code) {
          await completeOAuth(code);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [oauthWindow]);

  const completeOAuth = async (code: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post('/api/v1/integrations/slack', {
        code,
        userId: localStorage.getItem('userId'), // Or get from auth context
      });

      if (response.data.success) {
        onSuccess();
      } else {
        setError('Failed to complete Slack integration');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect Slack');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSlack = () => {
    setLoading(true);
    setError(null);

    const clientId = process.env.REACT_APP_SLACK_CLIENT_ID || '';
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/oauth/slack/callback`
    );
    const scopes = encodeURIComponent(
      [
        'chat:write',
        'chat:write.public',
        'channels:read',
        'groups:read',
        'im:read',
        'mpim:read',
        'users:read',
        'commands',
        'reactions:read',
        'reactions:write',
        'files:write',
        'incoming-webhook',
      ].join(',')
    );

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;

    // Open OAuth popup
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'Slack OAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (popup) {
      setOauthWindow(popup);

      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setLoading(false);
          setOauthWindow(null);
        }
      }, 1000);
    } else {
      setError('Failed to open OAuth popup. Please allow popups for this site.');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="body1" paragraph>
        Connect your Slack workspace to receive real-time notifications about support tickets,
        customer messages, and more.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          What you'll get:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="New ticket notifications"
              secondary="Get notified instantly when new support tickets are created"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Interactive ticket management"
              secondary="Assign, close, and respond to tickets directly from Slack"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="SLA alerts"
              secondary="Receive alerts when tickets are approaching their SLA deadline"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Customer feedback requests"
              secondary="Send and collect customer feedback via Slack"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Slash commands"
              secondary="Use /ticket command to create and manage tickets"
            />
          </ListItem>
        </List>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConnectSlack}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{
            bgcolor: '#4A154B',
            '&:hover': {
              bgcolor: '#611f69',
            },
          }}
        >
          {loading ? 'Connecting...' : 'Connect to Slack'}
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        By connecting, you authorize EarnTrack to send notifications and interact with your Slack
        workspace. You can disconnect at any time.
      </Typography>
    </Box>
  );
};

export default SlackConnect;

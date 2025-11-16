import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';

const SlackOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'slack-oauth-callback',
            error: errorParam,
          },
          window.location.origin
        );
        setTimeout(() => window.close(), 2000);
      }
      return;
    }

    if (code) {
      // Send code to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'slack-oauth-callback',
            code,
          },
          window.location.origin
        );
        // Close popup window
        setTimeout(() => window.close(), 1000);
      } else {
        // If not in popup, redirect to integrations page
        navigate('/integrations/bots');
      }
    } else {
      setError('No authorization code received');
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          OAuth Error: {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          This window will close automatically...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="h6">Completing Slack integration...</Typography>
      <Typography variant="body2" color="text.secondary">
        Please wait while we finalize your connection.
      </Typography>
    </Box>
  );
};

export default SlackOAuthCallback;

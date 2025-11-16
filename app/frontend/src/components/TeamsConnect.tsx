import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Link,
} from '@mui/material';
import axios from 'axios';

interface TeamsConnectProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const TeamsConnect: React.FC<TeamsConnectProps> = ({ onSuccess, onCancel }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    webhookUrl: '',
    teamName: '',
    teamId: '',
    botId: '',
    botAppPassword: '',
    tenantId: '',
  });

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post('/api/v1/integrations/teams', {
        userId: localStorage.getItem('userId'), // Or get from auth context
        ...formData,
      });

      if (response.data.success) {
        onSuccess();
      } else {
        setError('Failed to complete Teams integration');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect Microsoft Teams');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      label: 'Create Incoming Webhook',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            To receive notifications in Microsoft Teams, you need to create an Incoming Webhook:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="1. Open Microsoft Teams and navigate to your desired channel"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Click the three dots (...) next to the channel name"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. Select 'Connectors' from the menu"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="4. Search for 'Incoming Webhook' and click 'Configure'"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="5. Provide a name (e.g., 'EarnTrack Notifications') and click 'Create'"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="6. Copy the webhook URL"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <Link
              href="https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more about Incoming Webhooks
            </Link>
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Enter Webhook URL',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            Paste the webhook URL you copied from Microsoft Teams:
          </Typography>
          <TextField
            fullWidth
            label="Webhook URL"
            value={formData.webhookUrl}
            onChange={handleInputChange('webhookUrl')}
            placeholder="https://outlook.office.com/webhook/..."
            required
            error={!formData.webhookUrl}
            helperText={
              !formData.webhookUrl
                ? 'Webhook URL is required'
                : 'This URL will be used to send notifications to your Teams channel'
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Team Name (Optional)"
            value={formData.teamName}
            onChange={handleInputChange('teamName')}
            placeholder="My Team"
            helperText="Friendly name for this integration"
          />
        </Box>
      ),
    },
    {
      label: 'Advanced Configuration (Optional)',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            For advanced bot features like interactive commands, you can configure a bot
            application. This is optional and only needed for two-way communication.
          </Typography>
          <TextField
            fullWidth
            label="Bot Application ID"
            value={formData.botId}
            onChange={handleInputChange('botId')}
            placeholder="12345678-1234-1234-1234-123456789012"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Bot Application Password"
            type="password"
            value={formData.botAppPassword}
            onChange={handleInputChange('botAppPassword')}
            placeholder="Enter bot app password"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Tenant ID"
            value={formData.tenantId}
            onChange={handleInputChange('tenantId')}
            placeholder="12345678-1234-1234-1234-123456789012"
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            These fields are optional. Leave them blank if you only want to receive notifications
            via webhook.
          </Typography>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="body1" paragraph>
        Connect Microsoft Teams to receive real-time notifications about support tickets,
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
              primary="Rich adaptive cards"
              secondary="Interactive cards with ticket details and action buttons"
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
              secondary="Send and collect customer feedback via Teams"
            />
          </ListItem>
        </List>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              {step.content}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                  disabled={loading || (index === 1 && !formData.webhookUrl)}
                >
                  {index === steps.length - 1 ? 'Complete Setup' : 'Continue'}
                </Button>
                <Button disabled={index === 0 || loading} onClick={handleBack} sx={{ ml: 1 }}>
                  Back
                </Button>
                {index === 0 && (
                  <Button onClick={onCancel} sx={{ ml: 1 }}>
                    Cancel
                  </Button>
                )}
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {activeStep === steps.length && (
        <Paper square elevation={0} sx={{ p: 3 }}>
          <Typography>All steps completed - you're ready to use Teams integration!</Typography>
          <Button onClick={onSuccess} sx={{ mt: 1, mr: 1 }}>
            Finish
          </Button>
        </Paper>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        By connecting, you authorize EarnTrack to send notifications to your Microsoft Teams
        workspace. You can disconnect at any time.
      </Typography>
    </Box>
  );
};

export default TeamsConnect;

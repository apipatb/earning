# Slack and Microsoft Teams Bot Integration Setup Guide

This guide walks you through setting up Slack and Microsoft Teams bot integrations for EarnTrack.

## Overview

The bot integration system allows you to:
- Receive real-time notifications about support tickets
- Manage tickets directly from Slack or Teams
- Send customer feedback requests
- Get SLA alerts
- Use slash commands and interactive buttons

## Architecture

### Backend Components

1. **Prisma Schema** (`/app/backend/prisma/schema.prisma`)
   - `SlackIntegration` - Stores Slack workspace connections
   - `TeamsIntegration` - Stores Microsoft Teams connections
   - `BotNotification` - Logs all notifications sent through bots

2. **Services**
   - `slack.service.ts` - Handles all Slack API interactions
   - `teams.service.ts` - Handles Microsoft Teams/Bot Framework interactions

3. **Controllers**
   - `bot.controller.ts` - API endpoints for webhooks and OAuth

### Frontend Components

1. **Pages**
   - `BotIntegrations.tsx` - Main page for managing integrations
   - `SlackOAuthCallback.tsx` - OAuth callback handler

2. **Components**
   - `SlackConnect.tsx` - Slack OAuth flow
   - `TeamsConnect.tsx` - Teams webhook setup wizard

## Setup Instructions

### Prerequisites

1. Install dependencies:
```bash
cd /home/user/earning/app/backend
npm install @slack/bolt botbuilder --legacy-peer-deps
```

2. Run database migration:
```bash
cd /home/user/earning/app/backend
npx prisma migrate dev --name add_bot_integrations
npx prisma generate
```

### Slack Integration Setup

#### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Enter app name (e.g., "EarnTrack Bot") and select workspace
4. Click "Create App"

#### 2. Configure OAuth & Permissions

1. Navigate to "OAuth & Permissions" in the sidebar
2. Add the following **Bot Token Scopes**:
   - `chat:write` - Send messages
   - `chat:write.public` - Send messages to channels without joining
   - `channels:read` - View channels
   - `groups:read` - View private channels
   - `im:read` - View direct messages
   - `mpim:read` - View group messages
   - `users:read` - View users
   - `commands` - Add slash commands
   - `reactions:read` - View reactions
   - `reactions:write` - Add reactions
   - `files:write` - Upload files
   - `incoming-webhook` - Post messages via webhook

3. Add **Redirect URLs**:
   - Development: `http://localhost:3000/oauth/slack/callback`
   - Production: `https://yourdomain.com/oauth/slack/callback`

#### 3. Enable Events

1. Navigate to "Event Subscriptions"
2. Toggle "Enable Events" to On
3. Set Request URL: `https://yourdomain.com/api/v1/bot/slack/events`
4. Subscribe to bot events:
   - `app_mention` - Bot is mentioned
   - `message.channels` - Message in channels
   - `message.im` - Direct messages
   - `reaction_added` - Reaction added

#### 4. Add Slash Commands

1. Navigate to "Slash Commands"
2. Click "Create New Command"
3. Add the following commands:
   - Command: `/ticket`
   - Request URL: `https://yourdomain.com/api/v1/bot/slack/command`
   - Short Description: "Create or manage support tickets"

#### 5. Enable Interactivity

1. Navigate to "Interactivity & Shortcuts"
2. Toggle "Interactivity" to On
3. Set Request URL: `https://yourdomain.com/api/v1/bot/slack/interactions`

#### 6. Configure Environment Variables

Add to `/home/user/earning/app/backend/.env`:

```bash
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_SIGNING_SECRET=your_signing_secret_here
SLACK_REDIRECT_URI=http://localhost:3000/oauth/slack/callback
```

Add to `/home/user/earning/app/frontend/.env`:

```bash
REACT_APP_SLACK_CLIENT_ID=your_client_id_here
```

### Microsoft Teams Integration Setup

#### Option 1: Incoming Webhook Only (Simple)

This option allows one-way notifications from EarnTrack to Teams.

1. Open Microsoft Teams
2. Navigate to the desired channel
3. Click the three dots (...) next to the channel name
4. Select "Connectors"
5. Search for "Incoming Webhook" and click "Configure"
6. Give it a name (e.g., "EarnTrack Notifications")
7. Click "Create"
8. Copy the webhook URL
9. Use this URL in the Teams Connect component

#### Option 2: Bot Framework (Advanced)

For two-way communication and interactive features:

1. Go to https://dev.botframework.com/
2. Create a new bot registration
3. Note the Microsoft App ID
4. Generate a new password/secret
5. Add messaging endpoint: `https://yourdomain.com/api/v1/bot/teams/events`
6. Configure channels → Microsoft Teams
7. Use App ID and Password in Teams Connect component

Add to `/home/user/earning/app/backend/.env`:

```bash
MICROSOFT_APP_ID=your_app_id_here
MICROSOFT_APP_PASSWORD=your_app_password_here
FRONTEND_URL=http://localhost:3000
```

## API Routes Setup

Add these routes to your Express app (`/home/user/earning/app/backend/src/index.ts` or routes file):

```typescript
import {
  handleSlackEvents,
  handleSlackCommand,
  handleSlackInteraction,
  handleTeamsEvents,
  connectSlackIntegration,
  connectTeamsIntegration,
  getBotIntegrations,
  deleteBotIntegration,
  toggleBotIntegration,
  getBotNotifications,
} from './controllers/bot.controller';

// Slack routes
app.post('/api/v1/bot/slack/events', handleSlackEvents);
app.post('/api/v1/bot/slack/command', handleSlackCommand);
app.post('/api/v1/bot/slack/interactions', handleSlackInteraction);

// Teams routes
app.post('/api/v1/bot/teams/events', handleTeamsEvents);

// Integration management routes
app.post('/api/v1/integrations/slack', connectSlackIntegration);
app.post('/api/v1/integrations/teams', connectTeamsIntegration);
app.get('/api/v1/bot/integrations', authenticateToken, getBotIntegrations);
app.delete('/api/v1/bot/integrations/:platform/:integrationId', authenticateToken, deleteBotIntegration);
app.patch('/api/v1/bot/integrations/:platform/:integrationId/toggle', authenticateToken, toggleBotIntegration);
app.get('/api/v1/bot/notifications', authenticateToken, getBotNotifications);
```

## Frontend Routes Setup

Add to your React Router configuration:

```typescript
import BotIntegrations from './pages/BotIntegrations';
import SlackOAuthCallback from './pages/SlackOAuthCallback';

// In your routes
<Route path="/integrations/bots" element={<BotIntegrations />} />
<Route path="/oauth/slack/callback" element={<SlackOAuthCallback />} />
```

## Usage Examples

### Sending a Ticket Notification (Slack)

```typescript
import { createSlackServiceForUser } from './services/slack.service';

const slackService = await createSlackServiceForUser(userId);
if (slackService) {
  await slackService.sendTicketNotification(
    integration.channelId,
    {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      customerName: customer?.name,
    },
    userId,
    integration.id
  );
}
```

### Sending a Ticket Notification (Teams)

```typescript
import { createTeamsServiceForUser } from './services/teams.service';

const teamsService = await createTeamsServiceForUser(userId);
if (teamsService) {
  await teamsService.sendTicketNotification(
    {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      customerName: customer?.name,
    },
    userId,
    integration.id
  );
}
```

### Sending SLA Alerts

```typescript
// Slack
await slackService.sendSLAAlert(
  channelId,
  {
    ticketId: ticket.id,
    subject: ticket.subject,
    timeRemaining: '2 hours',
    severity: 'critical',
  },
  userId,
  integrationId
);

// Teams
await teamsService.sendSLAAlert(
  {
    ticketId: ticket.id,
    subject: ticket.subject,
    timeRemaining: '2 hours',
    severity: 'warning',
  },
  userId,
  integrationId
);
```

### Sending Customer Feedback

```typescript
import { sendFeedbackRequest } from './services/slack.service';

await sendFeedbackRequest(
  slackService,
  channelId,
  {
    ticketId: ticket.id,
    customerName: customer.name,
  },
  userId,
  integrationId
);
```

## Features

### Slack Features

- **Message Sending**: Send formatted messages with blocks
- **Interactive Buttons**: Assign, view, close tickets
- **Thread Replies**: Reply in message threads
- **File Uploads**: Share files and attachments
- **Slash Commands**: `/ticket` command for quick actions
- **Event Handling**: Respond to mentions, DMs, reactions
- **Rich Formatting**: Use Slack's Block Kit for beautiful messages

### Teams Features

- **Adaptive Cards**: Rich, interactive card messages
- **Webhook Integration**: Simple one-way notifications
- **Bot Commands**: Text-based commands
- **Action Buttons**: Submit forms, open URLs
- **Hero Cards**: Cards with images and buttons
- **Message Updates**: Update existing messages

## Troubleshooting

### Slack Issues

1. **OAuth fails**: Check that redirect URI matches exactly
2. **Events not received**: Verify Request URL is publicly accessible and returns 200
3. **Commands not working**: Ensure signing secret is correct

### Teams Issues

1. **Webhook fails**: Verify webhook URL is still active in Teams
2. **Cards not rendering**: Check adaptive card schema version (use 1.4)
3. **Bot not responding**: Verify App ID and Password are correct

## Security Considerations

1. **Token Storage**: All tokens are stored encrypted in the database
2. **Webhook Verification**: Slack events are verified using signing secret
3. **OAuth**: Standard OAuth 2.0 flow for secure authorization
4. **Environment Variables**: Never commit secrets to version control

## Next Steps

1. Set up background jobs to send notifications when:
   - New tickets are created
   - Tickets are updated
   - SLA deadlines are approaching
   - Customer feedback is needed

2. Implement webhook verification middleware for security

3. Add analytics to track bot usage and engagement

4. Create custom slash commands for specific workflows

5. Implement sentiment analysis alerts through bots

## Support

For issues or questions:
- Check the [Slack API documentation](https://api.slack.com/)
- Check the [Microsoft Teams documentation](https://docs.microsoft.com/en-us/microsoftteams/)
- Review the Bot Framework documentation for advanced Teams features

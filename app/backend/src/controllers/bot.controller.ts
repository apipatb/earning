import { Request, Response } from 'express';
import { PrismaClient, BotPlatform } from '@prisma/client';
import { SlackService, createSlackServiceForUser } from '../services/slack.service';
import { TeamsService, createTeamsServiceForUser } from '../services/teams.service';
import crypto from 'crypto';
import axios from 'axios';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Slack Events Webhook
 * Handles incoming events from Slack (mentions, reactions, messages, etc.)
 */
export async function handleSlackEvents(req: Request, res: Response): Promise<void> {
  try {
    const { type, challenge, event, team_id } = req.body;

    // Handle URL verification challenge
    if (type === 'url_verification') {
      res.json({ challenge });
      return;
    }

    // Handle event callbacks
    if (type === 'event_callback') {
      // Acknowledge the event immediately
      res.status(200).send();

      // Process event asynchronously
      processSlackEvent(event, team_id);
      return;
    }

    res.status(200).send();
  } catch (error) {
    logger.error('Error handling Slack events', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Process Slack event asynchronously
 */
async function processSlackEvent(event: any, teamId: string): Promise<void> {
  try {
    // Find integration by team ID
    const integration = await prisma.slackIntegration.findFirst({
      where: {
        teamId,
        isActive: true,
      },
    });

    if (!integration) {
      logger.info('No active integration found for team', { teamId });
      return;
    }

    const slackService = new SlackService({
      botToken: integration.botToken,
    });

    // Handle different event types
    switch (event.type) {
      case 'app_mention':
        await handleSlackMention(slackService, event, integration);
        break;

      case 'message':
        await handleSlackMessage(slackService, event, integration);
        break;

      case 'reaction_added':
        await handleSlackReaction(slackService, event, integration);
        break;

      default:
        logger.debug('Unhandled Slack event type', { eventType: event.type });
    }
  } catch (error) {
    logger.error('Error processing Slack event', error as Error);
  }
}

/**
 * Handle Slack mention events
 */
async function handleSlackMention(
  slackService: SlackService,
  event: any,
  integration: any
): Promise<void> {
  const message = event.text.toLowerCase();

  if (message.includes('help')) {
    await slackService.sendMessage(
      {
        channel: event.channel,
        text: `Hi! I can help you with:\n- Creating tickets\n- Checking ticket status\n- Listing your tickets\n\nUse the /ticket command to get started!`,
        threadTs: event.ts,
      },
      integration.userId,
      integration.id
    );
  }
}

/**
 * Handle Slack message events
 */
async function handleSlackMessage(
  slackService: SlackService,
  event: any,
  integration: any
): Promise<void> {
  // Handle direct messages to the bot
  if (event.channel_type === 'im') {
    await slackService.sendMessage(
      {
        channel: event.channel,
        text: 'Hello! How can I help you today? Type "help" for available commands.',
      },
      integration.userId,
      integration.id
    );
  }
}

/**
 * Handle Slack reaction events
 */
async function handleSlackReaction(
  slackService: SlackService,
  event: any,
  integration: any
): Promise<void> {
  logger.debug('Reaction added', { reaction: event.reaction, messageTs: event.item.ts });
  // Handle reactions - could be used for ticket feedback, quick actions, etc.
}

/**
 * Slack Slash Commands
 * Handles slash commands like /ticket, /status, etc.
 */
export async function handleSlackCommand(req: Request, res: Response): Promise<void> {
  try {
    const { command, text, user_id, team_id, response_url } = req.body;

    // Find integration
    const integration = await prisma.slackIntegration.findFirst({
      where: {
        teamId: team_id,
        isActive: true,
      },
    });

    if (!integration) {
      res.json({
        text: 'Slack integration not found. Please reconnect your workspace.',
        response_type: 'ephemeral',
      });
      return;
    }

    const slackService = new SlackService({
      botToken: integration.botToken,
    });

    switch (command) {
      case '/ticket':
        res.json({
          response_type: 'ephemeral',
          text: 'Opening ticket creation form...',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Click the button below to create a new support ticket.',
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Create Ticket',
                  },
                  url: `${process.env.FRONTEND_URL}/tickets/new`,
                  style: 'primary',
                },
              ],
            },
          ],
        });
        break;

      case '/ticket-status':
        if (!text) {
          res.json({
            response_type: 'ephemeral',
            text: 'Please provide a ticket ID. Example: /ticket-status TICKET-123',
          });
        } else {
          // Fetch ticket status
          res.json({
            response_type: 'ephemeral',
            text: `Fetching status for ticket: ${text}...`,
          });
        }
        break;

      default:
        res.json({
          response_type: 'ephemeral',
          text: `Unknown command: ${command}`,
        });
    }
  } catch (error) {
    logger.error('Error handling Slack command', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Slack Interactive Actions
 * Handles button clicks, menu selections, etc.
 */
export async function handleSlackInteraction(req: Request, res: Response): Promise<void> {
  try {
    const payload = JSON.parse(req.body.payload);
    const { type, user, team, actions, response_url } = payload;

    // Find integration
    const integration = await prisma.slackIntegration.findFirst({
      where: {
        teamId: team.id,
        isActive: true,
      },
    });

    if (!integration) {
      res.json({ text: 'Integration not found' });
      return;
    }

    if (type === 'block_actions' && actions && actions.length > 0) {
      const action = actions[0];

      switch (action.action_id) {
        case 'assign_ticket':
          // Handle ticket assignment
          await axios.post(response_url, {
            text: `Ticket ${action.value} has been assigned to <@${user.id}>`,
            replace_original: false,
          });
          break;

        case 'close_ticket':
          // Handle ticket closure
          await axios.post(response_url, {
            text: `Ticket ${action.value} has been closed by <@${user.id}>`,
            replace_original: true,
          });
          break;

        case 'view_ticket':
          // Just acknowledge - button opens URL
          break;

        default:
          logger.debug('Unhandled action', { actionId: action.action_id });
      }
    }

    res.status(200).send();
  } catch (error) {
    logger.error('Error handling Slack interaction', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Teams Events Webhook
 * Handles incoming activities from Microsoft Teams
 */
export async function handleTeamsEvents(req: Request, res: Response): Promise<void> {
  try {
    const activity = req.body;

    // Find integration based on service URL or other identifier
    const integration = await prisma.teamsIntegration.findFirst({
      where: {
        isActive: true,
        // You might need to match based on specific fields
      },
    });

    if (!integration) {
      res.status(404).json({ error: 'Integration not found' });
      return;
    }

    const teamsService = new TeamsService({
      appId: integration.botId || '',
      appPassword: integration.botAppPassword,
      webhookUrl: integration.webhookUrl,
    });

    // Process the activity
    await teamsService.processActivity(req, res, async (context) => {
      const { type, text } = context.activity;

      if (type === 'message' && text) {
        await teamsService.handleCommand(context, text);
      }
    });
  } catch (error) {
    logger.error('Error handling Teams events', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Connect Slack Integration
 * Completes OAuth flow and stores integration details
 */
export async function connectSlackIntegration(req: Request, res: Response): Promise<void> {
  try {
    const { code, userId } = req.body;

    if (!code || !userId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Exchange code for token
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI,
      },
    });

    const data = response.data;

    if (!data.ok) {
      res.status(400).json({ error: data.error || 'OAuth failed' });
      return;
    }

    // Store integration
    const integration = await prisma.slackIntegration.upsert({
      where: {
        userId_teamId: {
          userId,
          teamId: data.team.id,
        },
      },
      update: {
        teamName: data.team.name,
        botToken: data.access_token,
        accessToken: data.access_token,
        scope: data.scope,
        botUserId: data.bot_user_id,
        isActive: true,
      },
      create: {
        userId,
        teamId: data.team.id,
        teamName: data.team.name,
        botToken: data.access_token,
        accessToken: data.access_token,
        scope: data.scope,
        botUserId: data.bot_user_id,
        channelId: data.incoming_webhook?.channel_id || '',
        channelName: data.incoming_webhook?.channel || '',
        webhookUrl: data.incoming_webhook?.url,
        isActive: true,
      },
    });

    res.json({
      success: true,
      integration: {
        id: integration.id,
        teamName: integration.teamName,
        channelName: integration.channelName,
      },
    });
  } catch (error: any) {
    logger.error('Error connecting Slack integration', error as Error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Connect Teams Integration
 * Stores Teams webhook and bot configuration
 */
export async function connectTeamsIntegration(req: Request, res: Response): Promise<void> {
  try {
    const { userId, webhookUrl, teamId, teamName, botId, botAppPassword, tenantId } = req.body;

    if (!userId || !webhookUrl) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Store integration
    const integration = await prisma.teamsIntegration.upsert({
      where: {
        userId_teamId: {
          userId,
          teamId: teamId || crypto.randomUUID(),
        },
      },
      update: {
        teamName,
        webhookUrl,
        botId,
        botAppPassword,
        tenantId,
        isActive: true,
      },
      create: {
        userId,
        teamId: teamId || crypto.randomUUID(),
        teamName,
        webhookUrl,
        botId,
        botAppPassword: botAppPassword || '',
        tenantId,
        isActive: true,
      },
    });

    res.json({
      success: true,
      integration: {
        id: integration.id,
        teamName: integration.teamName,
      },
    });
  } catch (error: any) {
    logger.error('Error connecting Teams integration', error as Error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Get user's bot integrations
 */
export async function getBotIntegrations(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [slackIntegrations, teamsIntegrations] = await Promise.all([
      prisma.slackIntegration.findMany({
        where: { userId },
        select: {
          id: true,
          teamId: true,
          teamName: true,
          channelId: true,
          channelName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.teamsIntegration.findMany({
        where: { userId },
        select: {
          id: true,
          teamId: true,
          teamName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    res.json({
      slack: slackIntegrations,
      teams: teamsIntegrations,
    });
  } catch (error: any) {
    logger.error('Error fetching bot integrations', error as Error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Delete bot integration
 */
export async function deleteBotIntegration(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { integrationId, platform } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (platform === 'slack') {
      await prisma.slackIntegration.deleteMany({
        where: {
          id: integrationId,
          userId,
        },
      });
    } else if (platform === 'teams') {
      await prisma.teamsIntegration.deleteMany({
        where: {
          id: integrationId,
          userId,
        },
      });
    } else {
      res.status(400).json({ error: 'Invalid platform' });
      return;
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting bot integration', error as Error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Toggle bot integration status
 */
export async function toggleBotIntegration(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { integrationId, platform } = req.params;
    const { isActive } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (platform === 'slack') {
      await prisma.slackIntegration.updateMany({
        where: {
          id: integrationId,
          userId,
        },
        data: { isActive },
      });
    } else if (platform === 'teams') {
      await prisma.teamsIntegration.updateMany({
        where: {
          id: integrationId,
          userId,
        },
        data: { isActive },
      });
    } else {
      res.status(400).json({ error: 'Invalid platform' });
      return;
    }

    res.json({ success: true, isActive });
  } catch (error: any) {
    logger.error('Error toggling bot integration', error as Error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Get bot notification history
 */
export async function getBotNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { platform, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const where: any = { userId };
    if (platform) {
      where.platform = platform === 'slack' ? BotPlatform.SLACK : BotPlatform.TEAMS;
    }

    const notifications = await prisma.botNotification.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      select: {
        id: true,
        platform: true,
        messageId: true,
        content: true,
        sentAt: true,
        deliveryStatus: true,
        error: true,
      },
    });

    const total = await prisma.botNotification.count({ where });

    res.json({
      notifications,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    logger.error('Error fetching bot notifications', error as Error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

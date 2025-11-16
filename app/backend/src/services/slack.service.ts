import { App, ExpressReceiver, LogLevel } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { PrismaClient, BotPlatform } from '@prisma/client';

const prisma = new PrismaClient();

interface SlackConfig {
  botToken: string;
  signingSecret?: string;
  appToken?: string;
}

interface SlackMessagePayload {
  channel: string;
  text: string;
  blocks?: any[];
  threadTs?: string;
  attachments?: any[];
}

interface SlackFileUpload {
  channels: string;
  file: Buffer;
  filename: string;
  title?: string;
  initialComment?: string;
}

interface InteractiveButton {
  actionId: string;
  text: string;
  value: string;
  style?: 'primary' | 'danger';
}

export class SlackService {
  private client: WebClient;
  private app?: App;

  constructor(config: SlackConfig) {
    this.client = new WebClient(config.botToken);

    // Initialize Slack app if signing secret is provided
    if (config.signingSecret) {
      const receiver = new ExpressReceiver({
        signingSecret: config.signingSecret,
      });

      this.app = new App({
        token: config.botToken,
        receiver,
        logLevel: LogLevel.INFO,
      });

      this.setupEventHandlers();
    }
  }

  /**
   * Send a simple text message to a Slack channel
   */
  async sendMessage(payload: SlackMessagePayload, userId: string, integrationId: string): Promise<any> {
    try {
      const result = await this.client.chat.postMessage({
        channel: payload.channel,
        text: payload.text,
        blocks: payload.blocks,
        thread_ts: payload.threadTs,
        attachments: payload.attachments,
      });

      // Log notification to database
      await this.logNotification({
        userId,
        integrationId,
        messageId: result.ts as string,
        threadId: payload.threadTs,
        content: payload.text,
      });

      return result;
    } catch (error: any) {
      console.error('Error sending Slack message:', error);
      await this.logNotification({
        userId,
        integrationId,
        messageId: 'error',
        content: payload.text,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send a message with interactive buttons
   */
  async sendInteractiveMessage(
    channel: string,
    text: string,
    buttons: InteractiveButton[],
    userId: string,
    integrationId: string
  ): Promise<any> {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
      {
        type: 'actions',
        elements: buttons.map((button) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: button.text,
          },
          action_id: button.actionId,
          value: button.value,
          style: button.style,
        })),
      },
    ];

    return this.sendMessage(
      {
        channel,
        text,
        blocks,
      },
      userId,
      integrationId
    );
  }

  /**
   * Send a ticket notification with action buttons
   */
  async sendTicketNotification(
    channel: string,
    ticket: {
      id: string;
      subject: string;
      description: string;
      priority: string;
      status: string;
      customerName?: string;
    },
    userId: string,
    integrationId: string
  ): Promise<any> {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🎫 New Support Ticket: ${ticket.subject}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${ticket.priority}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${ticket.status}`,
          },
          {
            type: 'mrkdwn',
            text: `*Customer:*\n${ticket.customerName || 'N/A'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Ticket ID:*\n${ticket.id}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${ticket.description}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Assign to Me',
            },
            action_id: 'assign_ticket',
            value: ticket.id,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Ticket',
            },
            action_id: 'view_ticket',
            value: ticket.id,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Close',
            },
            action_id: 'close_ticket',
            value: ticket.id,
            style: 'danger',
          },
        ],
      },
    ];

    return this.sendMessage(
      {
        channel,
        text: `New Support Ticket: ${ticket.subject}`,
        blocks,
      },
      userId,
      integrationId
    );
  }

  /**
   * Send SLA alert notification
   */
  async sendSLAAlert(
    channel: string,
    alert: {
      ticketId: string;
      subject: string;
      timeRemaining: string;
      severity: 'warning' | 'critical';
    },
    userId: string,
    integrationId: string
  ): Promise<any> {
    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
    const color = alert.severity === 'critical' ? '#ff0000' : '#ffa500';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} SLA Alert: ${alert.subject}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Ticket ID:*\n${alert.ticketId}`,
          },
          {
            type: 'mrkdwn',
            text: `*Time Remaining:*\n${alert.timeRemaining}`,
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${alert.severity.toUpperCase()}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Ticket',
            },
            action_id: 'view_ticket',
            value: alert.ticketId,
            style: 'primary',
          },
        ],
      },
    ];

    return this.sendMessage(
      {
        channel,
        text: `${emoji} SLA Alert: ${alert.subject}`,
        blocks,
      },
      userId,
      integrationId
    );
  }

  /**
   * Reply to a message in a thread
   */
  async replyInThread(
    channel: string,
    threadTs: string,
    text: string,
    userId: string,
    integrationId: string
  ): Promise<any> {
    return this.sendMessage(
      {
        channel,
        text,
        threadTs,
      },
      userId,
      integrationId
    );
  }

  /**
   * Upload a file to Slack
   */
  async uploadFile(upload: SlackFileUpload): Promise<any> {
    try {
      const result = await this.client.files.uploadV2({
        channels: upload.channels,
        file: upload.file,
        filename: upload.filename,
        title: upload.title,
        initial_comment: upload.initialComment,
      });

      return result;
    } catch (error) {
      console.error('Error uploading file to Slack:', error);
      throw error;
    }
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    channel: string,
    timestamp: string,
    text: string,
    blocks?: any[]
  ): Promise<any> {
    try {
      const result = await this.client.chat.update({
        channel,
        ts: timestamp,
        text,
        blocks,
      });

      return result;
    } catch (error) {
      console.error('Error updating Slack message:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(channel: string, timestamp: string): Promise<any> {
    try {
      const result = await this.client.chat.delete({
        channel,
        ts: timestamp,
      });

      return result;
    } catch (error) {
      console.error('Error deleting Slack message:', error);
      throw error;
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(channel: string, timestamp: string, emoji: string): Promise<any> {
    try {
      const result = await this.client.reactions.add({
        channel,
        timestamp,
        name: emoji,
      });

      return result;
    } catch (error) {
      console.error('Error adding reaction to Slack message:', error);
      throw error;
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<any> {
    try {
      const result = await this.client.users.info({
        user: userId,
      });

      return result.user;
    } catch (error) {
      console.error('Error getting Slack user info:', error);
      throw error;
    }
  }

  /**
   * Get channel info
   */
  async getChannelInfo(channelId: string): Promise<any> {
    try {
      const result = await this.client.conversations.info({
        channel: channelId,
      });

      return result.channel;
    } catch (error) {
      console.error('Error getting Slack channel info:', error);
      throw error;
    }
  }

  /**
   * List all channels
   */
  async listChannels(): Promise<any[]> {
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
      });

      return result.channels || [];
    } catch (error) {
      console.error('Error listing Slack channels:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers for Slack app
   */
  private setupEventHandlers(): void {
    if (!this.app) return;

    // Handle app mentions
    this.app.event('app_mention', async ({ event, say }) => {
      console.log('Bot was mentioned:', event);
      await say({
        text: `Hi <@${event.user}>! I'm here to help with your support tickets. Use /ticket to create a new ticket.`,
        thread_ts: event.ts,
      });
    });

    // Handle direct messages
    this.app.event('message', async ({ event, say }) => {
      console.log('Message received:', event);
      // Handle DMs to the bot
    });

    // Handle reactions
    this.app.event('reaction_added', async ({ event }) => {
      console.log('Reaction added:', event);
      // Handle reactions to messages
    });

    // Handle slash commands
    this.app.command('/ticket', async ({ command, ack, respond }) => {
      await ack();
      await respond({
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
                action_id: 'open_ticket_modal',
                style: 'primary',
              },
            ],
          },
        ],
      });
    });

    // Handle button interactions
    this.app.action('assign_ticket', async ({ ack, body, client }) => {
      await ack();
      console.log('Assign ticket action:', body);
      // Handle ticket assignment
    });

    this.app.action('view_ticket', async ({ ack, body }) => {
      await ack();
      console.log('View ticket action:', body);
      // Handle viewing ticket
    });

    this.app.action('close_ticket', async ({ ack, body, client }) => {
      await ack();
      console.log('Close ticket action:', body);
      // Handle closing ticket
    });
  }

  /**
   * Log notification to database
   */
  private async logNotification(data: {
    userId: string;
    integrationId: string;
    messageId: string;
    threadId?: string;
    content: string;
    error?: string;
  }): Promise<void> {
    try {
      await prisma.botNotification.create({
        data: {
          userId: data.userId,
          slackIntegrationId: data.integrationId,
          platform: BotPlatform.SLACK,
          messageId: data.messageId,
          threadId: data.threadId,
          content: data.content,
          deliveryStatus: data.error ? 'failed' : 'sent',
          error: data.error,
        },
      });
    } catch (error) {
      console.error('Error logging Slack notification:', error);
    }
  }

  /**
   * Get the Express receiver for mounting routes
   */
  getReceiver(): ExpressReceiver | undefined {
    return this.app?.receiver as ExpressReceiver | undefined;
  }

  /**
   * Start the Slack app
   */
  async start(port?: number): Promise<void> {
    if (!this.app) {
      throw new Error('Slack app not initialized with signing secret');
    }

    await this.app.start(port || 3001);
    console.log(`⚡️ Slack bot is running on port ${port || 3001}!`);
  }

  /**
   * Stop the Slack app
   */
  async stop(): Promise<void> {
    if (!this.app) return;
    await this.app.stop();
    console.log('Slack bot stopped');
  }
}

/**
 * Create a Slack service instance for a specific user
 */
export async function createSlackServiceForUser(userId: string): Promise<SlackService | null> {
  try {
    const integration = await prisma.slackIntegration.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!integration) {
      return null;
    }

    return new SlackService({
      botToken: integration.botToken,
    });
  } catch (error) {
    console.error('Error creating Slack service for user:', error);
    return null;
  }
}

/**
 * Send customer feedback request via Slack
 */
export async function sendFeedbackRequest(
  slackService: SlackService,
  channel: string,
  feedback: {
    ticketId: string;
    customerName: string;
  },
  userId: string,
  integrationId: string
): Promise<any> {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⭐ Customer Feedback Request',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Please rate your experience with ticket #${feedback.ticketId}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '⭐' },
          action_id: 'rating_1',
          value: `${feedback.ticketId}:1`,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '⭐⭐' },
          action_id: 'rating_2',
          value: `${feedback.ticketId}:2`,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '⭐⭐⭐' },
          action_id: 'rating_3',
          value: `${feedback.ticketId}:3`,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '⭐⭐⭐⭐' },
          action_id: 'rating_4',
          value: `${feedback.ticketId}:4`,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '⭐⭐⭐⭐⭐' },
          action_id: 'rating_5',
          value: `${feedback.ticketId}:5`,
        },
      ],
    },
  ];

  return slackService.sendMessage(
    {
      channel,
      text: 'Customer Feedback Request',
      blocks,
    },
    userId,
    integrationId
  );
}

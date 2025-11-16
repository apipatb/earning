import {
  BotFrameworkAdapter,
  TurnContext,
  ActivityTypes,
  CardFactory,
  TeamsInfo,
  Activity,
} from 'botbuilder';
import axios from 'axios';
import { PrismaClient, BotPlatform } from '@prisma/client';

const prisma = new PrismaClient();

interface TeamsConfig {
  appId: string;
  appPassword: string;
  webhookUrl?: string;
}

interface TeamsMessagePayload {
  text: string;
  title?: string;
  subtitle?: string;
  card?: any;
}

interface AdaptiveCard {
  type: string;
  body: any[];
  actions?: any[];
}

export class TeamsService {
  private adapter: BotFrameworkAdapter;
  private webhookUrl?: string;

  constructor(config: TeamsConfig) {
    this.adapter = new BotFrameworkAdapter({
      appId: config.appId,
      appPassword: config.appPassword,
    });

    this.webhookUrl = config.webhookUrl;

    // Error handling
    this.adapter.onTurnError = async (context, error) => {
      console.error('Teams Bot Error:', error);
      await context.sendActivity('Sorry, an error occurred. Please try again later.');
    };
  }

  /**
   * Send a simple text message via webhook
   */
  async sendWebhookMessage(text: string, userId: string, integrationId: string): Promise<any> {
    if (!this.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    try {
      const payload = {
        type: 'message',
        text,
      };

      const response = await axios.post(this.webhookUrl, payload);

      // Log notification
      await this.logNotification({
        userId,
        integrationId,
        messageId: response.data?.id || 'webhook',
        content: text,
      });

      return response.data;
    } catch (error: any) {
      console.error('Error sending Teams webhook message:', error);
      await this.logNotification({
        userId,
        integrationId,
        messageId: 'error',
        content: text,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send an adaptive card via webhook
   */
  async sendAdaptiveCard(card: AdaptiveCard, userId: string, integrationId: string): Promise<any> {
    if (!this.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    try {
      const payload = {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.4',
              ...card,
            },
          },
        ],
      };

      const response = await axios.post(this.webhookUrl, payload);

      // Log notification
      await this.logNotification({
        userId,
        integrationId,
        messageId: response.data?.id || 'webhook',
        content: JSON.stringify(card),
      });

      return response.data;
    } catch (error: any) {
      console.error('Error sending Teams adaptive card:', error);
      await this.logNotification({
        userId,
        integrationId,
        messageId: 'error',
        content: JSON.stringify(card),
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create a ticket notification adaptive card
   */
  createTicketNotificationCard(ticket: {
    id: string;
    subject: string;
    description: string;
    priority: string;
    status: string;
    customerName?: string;
  }): AdaptiveCard {
    return {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'TextBlock',
          text: '🎫 New Support Ticket',
          weight: 'Bolder',
          size: 'Large',
          color: 'Accent',
        },
        {
          type: 'TextBlock',
          text: ticket.subject,
          weight: 'Bolder',
          size: 'Medium',
          wrap: true,
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: 'Priority:',
              value: ticket.priority,
            },
            {
              title: 'Status:',
              value: ticket.status,
            },
            {
              title: 'Customer:',
              value: ticket.customerName || 'N/A',
            },
            {
              title: 'Ticket ID:',
              value: ticket.id,
            },
          ],
        },
        {
          type: 'TextBlock',
          text: 'Description:',
          weight: 'Bolder',
          spacing: 'Medium',
        },
        {
          type: 'TextBlock',
          text: ticket.description,
          wrap: true,
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Assign to Me',
          data: {
            action: 'assign_ticket',
            ticketId: ticket.id,
          },
          style: 'positive',
        },
        {
          type: 'Action.OpenUrl',
          title: 'View Ticket',
          url: `${process.env.FRONTEND_URL}/tickets/${ticket.id}`,
        },
        {
          type: 'Action.Submit',
          title: 'Close',
          data: {
            action: 'close_ticket',
            ticketId: ticket.id,
          },
          style: 'destructive',
        },
      ],
    };
  }

  /**
   * Send ticket notification
   */
  async sendTicketNotification(
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
    const card = this.createTicketNotificationCard(ticket);
    return this.sendAdaptiveCard(card, userId, integrationId);
  }

  /**
   * Create SLA alert adaptive card
   */
  createSLAAlertCard(alert: {
    ticketId: string;
    subject: string;
    timeRemaining: string;
    severity: 'warning' | 'critical';
  }): AdaptiveCard {
    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
    const color = alert.severity === 'critical' ? 'Attention' : 'Warning';

    return {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'TextBlock',
          text: `${emoji} SLA Alert`,
          weight: 'Bolder',
          size: 'Large',
          color,
        },
        {
          type: 'TextBlock',
          text: alert.subject,
          weight: 'Bolder',
          size: 'Medium',
          wrap: true,
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: 'Ticket ID:',
              value: alert.ticketId,
            },
            {
              title: 'Time Remaining:',
              value: alert.timeRemaining,
            },
            {
              title: 'Severity:',
              value: alert.severity.toUpperCase(),
            },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Ticket',
          url: `${process.env.FRONTEND_URL}/tickets/${alert.ticketId}`,
        },
      ],
    };
  }

  /**
   * Send SLA alert
   */
  async sendSLAAlert(
    alert: {
      ticketId: string;
      subject: string;
      timeRemaining: string;
      severity: 'warning' | 'critical';
    },
    userId: string,
    integrationId: string
  ): Promise<any> {
    const card = this.createSLAAlertCard(alert);
    return this.sendAdaptiveCard(card, userId, integrationId);
  }

  /**
   * Create feedback request adaptive card
   */
  createFeedbackCard(feedback: { ticketId: string; customerName: string }): AdaptiveCard {
    return {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'TextBlock',
          text: '⭐ Customer Feedback Request',
          weight: 'Bolder',
          size: 'Large',
          color: 'Accent',
        },
        {
          type: 'TextBlock',
          text: `Please rate your experience with ticket #${feedback.ticketId}`,
          wrap: true,
        },
        {
          type: 'Input.ChoiceSet',
          id: 'rating',
          style: 'expanded',
          choices: [
            { title: '⭐ (1 star)', value: '1' },
            { title: '⭐⭐ (2 stars)', value: '2' },
            { title: '⭐⭐⭐ (3 stars)', value: '3' },
            { title: '⭐⭐⭐⭐ (4 stars)', value: '4' },
            { title: '⭐⭐⭐⭐⭐ (5 stars)', value: '5' },
          ],
        },
        {
          type: 'Input.Text',
          id: 'comment',
          placeholder: 'Additional comments (optional)',
          isMultiline: true,
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Submit Feedback',
          data: {
            action: 'submit_feedback',
            ticketId: feedback.ticketId,
          },
        },
      ],
    };
  }

  /**
   * Send feedback request
   */
  async sendFeedbackRequest(
    feedback: { ticketId: string; customerName: string },
    userId: string,
    integrationId: string
  ): Promise<any> {
    const card = this.createFeedbackCard(feedback);
    return this.sendAdaptiveCard(card, userId, integrationId);
  }

  /**
   * Create message update card
   */
  createMessageUpdateCard(
    title: string,
    message: string,
    color: 'Good' | 'Warning' | 'Attention' = 'Good'
  ): AdaptiveCard {
    return {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'TextBlock',
          text: title,
          weight: 'Bolder',
          size: 'Medium',
          color,
        },
        {
          type: 'TextBlock',
          text: message,
          wrap: true,
        },
      ],
    };
  }

  /**
   * Send a hero card (simple card with image and buttons)
   */
  async sendHeroCard(
    title: string,
    subtitle: string,
    text: string,
    imageUrl?: string,
    buttons?: { title: string; url: string }[],
    userId?: string,
    integrationId?: string
  ): Promise<any> {
    if (!this.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const card = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.hero',
          content: {
            title,
            subtitle,
            text,
            images: imageUrl
              ? [
                  {
                    url: imageUrl,
                  },
                ]
              : [],
            buttons:
              buttons?.map((btn) => ({
                type: 'openUrl',
                title: btn.title,
                value: btn.url,
              })) || [],
          },
        },
      ],
    };

    try {
      const response = await axios.post(this.webhookUrl, card);

      if (userId && integrationId) {
        await this.logNotification({
          userId,
          integrationId,
          messageId: response.data?.id || 'webhook',
          content: `${title}: ${text}`,
        });
      }

      return response.data;
    } catch (error: any) {
      console.error('Error sending Teams hero card:', error);
      if (userId && integrationId) {
        await this.logNotification({
          userId,
          integrationId,
          messageId: 'error',
          content: `${title}: ${text}`,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Handle incoming activity (for bot framework integration)
   */
  async processActivity(req: any, res: any, logic: (context: TurnContext) => Promise<void>): Promise<void> {
    await this.adapter.process(req, res, logic);
  }

  /**
   * Handle bot commands
   */
  async handleCommand(context: TurnContext, command: string): Promise<void> {
    const parts = command.toLowerCase().split(' ');
    const action = parts[0];

    switch (action) {
      case 'help':
        await context.sendActivity({
          type: ActivityTypes.Message,
          text: `
Available commands:
- **help**: Show this help message
- **ticket**: Create a new support ticket
- **status**: Check ticket status
- **list**: List your open tickets
          `,
        });
        break;

      case 'ticket':
        await this.sendTicketCreationPrompt(context);
        break;

      case 'status':
        await context.sendActivity('Please provide a ticket ID to check status.');
        break;

      case 'list':
        await context.sendActivity('Fetching your open tickets...');
        break;

      default:
        await context.sendActivity(
          `Unknown command: ${action}. Type "help" for available commands.`
        );
    }
  }

  /**
   * Send ticket creation prompt
   */
  private async sendTicketCreationPrompt(context: TurnContext): Promise<void> {
    const card = CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: 'Create a New Support Ticket',
          weight: 'Bolder',
          size: 'Large',
        },
        {
          type: 'Input.Text',
          id: 'subject',
          placeholder: 'Ticket Subject',
          maxLength: 200,
        },
        {
          type: 'Input.Text',
          id: 'description',
          placeholder: 'Description',
          isMultiline: true,
        },
        {
          type: 'Input.ChoiceSet',
          id: 'priority',
          label: 'Priority',
          choices: [
            { title: 'Low', value: 'LOW' },
            { title: 'Medium', value: 'MEDIUM' },
            { title: 'High', value: 'HIGH' },
            { title: 'Urgent', value: 'URGENT' },
          ],
          value: 'MEDIUM',
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Create Ticket',
          data: {
            action: 'create_ticket',
          },
        },
      ],
    });

    await context.sendActivity({ attachments: [card] });
  }

  /**
   * Get team members
   */
  async getTeamMembers(context: TurnContext): Promise<any[]> {
    try {
      const members = await TeamsInfo.getMembers(context);
      return members;
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
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
          teamsIntegrationId: data.integrationId,
          platform: BotPlatform.TEAMS,
          messageId: data.messageId,
          threadId: data.threadId,
          content: data.content,
          deliveryStatus: data.error ? 'failed' : 'sent',
          error: data.error,
        },
      });
    } catch (error) {
      console.error('Error logging Teams notification:', error);
    }
  }
}

/**
 * Create a Teams service instance for a specific user
 */
export async function createTeamsServiceForUser(userId: string): Promise<TeamsService | null> {
  try {
    const integration = await prisma.teamsIntegration.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!integration) {
      return null;
    }

    return new TeamsService({
      appId: integration.botId || '',
      appPassword: integration.botAppPassword,
      webhookUrl: integration.webhookUrl,
    });
  } catch (error) {
    console.error('Error creating Teams service for user:', error);
    return null;
  }
}

/**
 * Send a simple notification via Teams webhook
 */
export async function sendSimpleTeamsNotification(
  webhookUrl: string,
  title: string,
  message: string,
  userId: string,
  integrationId: string
): Promise<any> {
  const teamsService = new TeamsService({
    appId: '',
    appPassword: '',
    webhookUrl,
  });

  return teamsService.sendWebhookMessage(`**${title}**\n\n${message}`, userId, integrationId);
}

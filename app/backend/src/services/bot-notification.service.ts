/**
 * Bot Notification Service
 *
 * This service provides high-level functions to send notifications
 * through Slack and Teams when various events occur in the system.
 *
 * Usage:
 * Import this service in your ticket/customer service controllers
 * and call the appropriate notification functions.
 */

import { PrismaClient } from '@prisma/client';
import { SlackService, createSlackServiceForUser } from './slack.service';
import { TeamsService, createTeamsServiceForUser } from './teams.service';

const prisma = new PrismaClient();

interface TicketData {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  customerName?: string;
  userId: string;
}

interface SLAAlertData {
  ticketId: string;
  subject: string;
  timeRemaining: string;
  severity: 'warning' | 'critical';
  userId: string;
}

interface FeedbackData {
  ticketId: string;
  customerName: string;
  userId: string;
}

/**
 * Send new ticket notification to all active bot integrations
 */
export async function notifyNewTicket(ticket: TicketData): Promise<void> {
  try {
    // Get all active integrations for the user
    const [slackIntegrations, teamsIntegrations] = await Promise.all([
      prisma.slackIntegration.findMany({
        where: {
          userId: ticket.userId,
          isActive: true,
        },
      }),
      prisma.teamsIntegration.findMany({
        where: {
          userId: ticket.userId,
          isActive: true,
        },
      }),
    ]);

    // Send to Slack
    for (const integration of slackIntegrations) {
      try {
        const slackService = new SlackService({
          botToken: integration.botToken,
        });

        await slackService.sendTicketNotification(
          integration.channelId,
          {
            id: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            priority: ticket.priority,
            status: ticket.status,
            customerName: ticket.customerName,
          },
          ticket.userId,
          integration.id
        );

        console.log(`Sent ticket notification to Slack: ${integration.teamName}`);
      } catch (error) {
        console.error(`Failed to send Slack notification to ${integration.teamName}:`, error);
      }
    }

    // Send to Teams
    for (const integration of teamsIntegrations) {
      try {
        const teamsService = new TeamsService({
          appId: integration.botId || '',
          appPassword: integration.botAppPassword,
          webhookUrl: integration.webhookUrl,
        });

        await teamsService.sendTicketNotification(
          {
            id: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            priority: ticket.priority,
            status: ticket.status,
            customerName: ticket.customerName,
          },
          ticket.userId,
          integration.id
        );

        console.log(`Sent ticket notification to Teams: ${integration.teamName}`);
      } catch (error) {
        console.error(`Failed to send Teams notification to ${integration.teamName}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in notifyNewTicket:', error);
  }
}

/**
 * Send SLA alert to all active bot integrations
 */
export async function notifySLAAlert(alert: SLAAlertData): Promise<void> {
  try {
    const [slackIntegrations, teamsIntegrations] = await Promise.all([
      prisma.slackIntegration.findMany({
        where: {
          userId: alert.userId,
          isActive: true,
        },
      }),
      prisma.teamsIntegration.findMany({
        where: {
          userId: alert.userId,
          isActive: true,
        },
      }),
    ]);

    // Send to Slack
    for (const integration of slackIntegrations) {
      try {
        const slackService = new SlackService({
          botToken: integration.botToken,
        });

        await slackService.sendSLAAlert(
          integration.channelId,
          {
            ticketId: alert.ticketId,
            subject: alert.subject,
            timeRemaining: alert.timeRemaining,
            severity: alert.severity,
          },
          alert.userId,
          integration.id
        );

        console.log(`Sent SLA alert to Slack: ${integration.teamName}`);
      } catch (error) {
        console.error(`Failed to send Slack SLA alert:`, error);
      }
    }

    // Send to Teams
    for (const integration of teamsIntegrations) {
      try {
        const teamsService = new TeamsService({
          appId: integration.botId || '',
          appPassword: integration.botAppPassword,
          webhookUrl: integration.webhookUrl,
        });

        await teamsService.sendSLAAlert(
          {
            ticketId: alert.ticketId,
            subject: alert.subject,
            timeRemaining: alert.timeRemaining,
            severity: alert.severity,
          },
          alert.userId,
          integration.id
        );

        console.log(`Sent SLA alert to Teams: ${integration.teamName}`);
      } catch (error) {
        console.error(`Failed to send Teams SLA alert:`, error);
      }
    }
  } catch (error) {
    console.error('Error in notifySLAAlert:', error);
  }
}

/**
 * Send customer feedback request
 */
export async function sendCustomerFeedbackRequest(feedback: FeedbackData): Promise<void> {
  try {
    const [slackIntegrations, teamsIntegrations] = await Promise.all([
      prisma.slackIntegration.findMany({
        where: {
          userId: feedback.userId,
          isActive: true,
        },
      }),
      prisma.teamsIntegration.findMany({
        where: {
          userId: feedback.userId,
          isActive: true,
        },
      }),
    ]);

    // Send to Slack
    for (const integration of slackIntegrations) {
      try {
        const slackService = new SlackService({
          botToken: integration.botToken,
        });

        const { sendFeedbackRequest } = await import('./slack.service');
        await sendFeedbackRequest(
          slackService,
          integration.channelId,
          {
            ticketId: feedback.ticketId,
            customerName: feedback.customerName,
          },
          feedback.userId,
          integration.id
        );

        console.log(`Sent feedback request to Slack: ${integration.teamName}`);
      } catch (error) {
        console.error(`Failed to send Slack feedback request:`, error);
      }
    }

    // Send to Teams
    for (const integration of teamsIntegrations) {
      try {
        const teamsService = new TeamsService({
          appId: integration.botId || '',
          appPassword: integration.botAppPassword,
          webhookUrl: integration.webhookUrl,
        });

        await teamsService.sendFeedbackRequest(
          {
            ticketId: feedback.ticketId,
            customerName: feedback.customerName,
          },
          feedback.userId,
          integration.id
        );

        console.log(`Sent feedback request to Teams: ${integration.teamName}`);
      } catch (error) {
        console.error(`Failed to send Teams feedback request:`, error);
      }
    }
  } catch (error) {
    console.error('Error in sendCustomerFeedbackRequest:', error);
  }
}

/**
 * Send ticket status update notification
 */
export async function notifyTicketUpdate(
  ticket: TicketData,
  updateMessage: string
): Promise<void> {
  try {
    const [slackIntegrations, teamsIntegrations] = await Promise.all([
      prisma.slackIntegration.findMany({
        where: {
          userId: ticket.userId,
          isActive: true,
        },
      }),
      prisma.teamsIntegration.findMany({
        where: {
          userId: ticket.userId,
          isActive: true,
        },
      }),
    ]);

    // Send to Slack
    for (const integration of slackIntegrations) {
      try {
        const slackService = new SlackService({
          botToken: integration.botToken,
        });

        await slackService.sendMessage(
          {
            channel: integration.channelId,
            text: `🔔 Ticket Update: ${ticket.subject}`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '🔔 Ticket Update',
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${ticket.subject}* (${ticket.id})`,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: updateMessage,
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Status:* ${ticket.status}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Priority:* ${ticket.priority}`,
                  },
                ],
              },
            ],
          },
          ticket.userId,
          integration.id
        );

        console.log(`Sent ticket update to Slack: ${integration.teamName}`);
      } catch (error) {
        console.error(`Failed to send Slack update:`, error);
      }
    }

    // Send to Teams
    for (const integration of teamsIntegrations) {
      try {
        const teamsService = new TeamsService({
          appId: integration.botId || '',
          appPassword: integration.botAppPassword,
          webhookUrl: integration.webhookUrl,
        });

        const card = teamsService.createMessageUpdateCard(
          `Ticket Update: ${ticket.subject}`,
          updateMessage,
          'Good'
        );

        await teamsService.sendAdaptiveCard(card, ticket.userId, integration.id);

        console.log(`Sent ticket update to Teams: ${integration.teamName}`);
      } catch (error) {
        console.error(`Failed to send Teams update:`, error);
      }
    }
  } catch (error) {
    console.error('Error in notifyTicketUpdate:', error);
  }
}

/**
 * Send message reply notification
 */
export async function notifyNewMessage(
  ticketId: string,
  ticketSubject: string,
  senderName: string,
  messageContent: string,
  userId: string
): Promise<void> {
  try {
    const [slackIntegrations, teamsIntegrations] = await Promise.all([
      prisma.slackIntegration.findMany({
        where: {
          userId,
          isActive: true,
        },
      }),
      prisma.teamsIntegration.findMany({
        where: {
          userId,
          isActive: true,
        },
      }),
    ]);

    // Send to Slack
    for (const integration of slackIntegrations) {
      try {
        const slackService = new SlackService({
          botToken: integration.botToken,
        });

        await slackService.sendMessage(
          {
            channel: integration.channelId,
            text: `💬 New message on ticket: ${ticketSubject}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `💬 *New message on ticket:* ${ticketSubject}`,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*From:* ${senderName}\n\n${messageContent}`,
                },
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
                    value: ticketId,
                  },
                ],
              },
            ],
          },
          userId,
          integration.id
        );
      } catch (error) {
        console.error(`Failed to send Slack message notification:`, error);
      }
    }

    // Send to Teams
    for (const integration of teamsIntegrations) {
      try {
        const teamsService = new TeamsService({
          appId: integration.botId || '',
          appPassword: integration.botAppPassword,
          webhookUrl: integration.webhookUrl,
        });

        await teamsService.sendWebhookMessage(
          `💬 **New message on ticket:** ${ticketSubject}\n\n**From:** ${senderName}\n\n${messageContent}`,
          userId,
          integration.id
        );
      } catch (error) {
        console.error(`Failed to send Teams message notification:`, error);
      }
    }
  } catch (error) {
    console.error('Error in notifyNewMessage:', error);
  }
}

/**
 * Check if user has any active bot integrations
 */
export async function hasActiveBotIntegrations(userId: string): Promise<boolean> {
  try {
    const count = await prisma.$transaction([
      prisma.slackIntegration.count({
        where: {
          userId,
          isActive: true,
        },
      }),
      prisma.teamsIntegration.count({
        where: {
          userId,
          isActive: true,
        },
      }),
    ]);

    return count[0] + count[1] > 0;
  } catch (error) {
    console.error('Error checking bot integrations:', error);
    return false;
  }
}

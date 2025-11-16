import crypto from 'crypto';
import { WebhookEventType } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

// Webhook retry delays (in milliseconds)
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s
const MAX_RETRY_ATTEMPTS = 3;

interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: any;
}

interface WebhookDelivery {
  webhookId: string;
  eventId: string;
  url: string;
  secret: string;
  payload: WebhookPayload;
  attempt: number;
}

// In-memory queue for webhook deliveries
class WebhookQueue {
  private queue: WebhookDelivery[] = [];
  private processing = false;

  add(delivery: WebhookDelivery): void {
    this.queue.push(delivery);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const delivery = this.queue.shift();
      if (delivery) {
        await this.deliverWebhook(delivery);
      }
    }

    this.processing = false;
  }

  private async deliverWebhook(delivery: WebhookDelivery): Promise<void> {
    const { webhookId, eventId, url, secret, payload, attempt } = delivery;

    try {
      // Sign the payload with HMAC-SHA256
      const signature = this.signPayload(payload, secret);
      const requestBody = JSON.stringify(payload);

      // Send HTTP POST request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': payload.timestamp,
          'User-Agent': 'EarnTrack-Webhooks/1.0',
        },
        body: requestBody,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseText = await response.text();
      const httpStatus = response.status;

      // Log the webhook delivery
      await prisma.webhookLog.create({
        data: {
          webhookId,
          eventId,
          request: requestBody,
          response: responseText,
          httpStatus,
        },
      });

      // Update webhook event
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          statusCode: httpStatus,
          attempts: attempt,
          lastAttemptAt: new Date(),
        },
      });

      // Update webhook last triggered time
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastTriggeredAt: new Date(),
          retryCount: httpStatus >= 200 && httpStatus < 300 ? 0 : delivery.attempt,
        },
      });

      // Retry on failure (non-2xx status codes)
      if (httpStatus < 200 || httpStatus >= 300) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          logger.warn(`Webhook delivery failed with status ${httpStatus}. Retrying in ${delay}ms...`, {
            webhookId,
            eventId,
            attempt,
          });

          setTimeout(() => {
            this.add({
              ...delivery,
              attempt: attempt + 1,
            });
          }, delay);
        } else {
          logger.error('Webhook delivery failed after max retries', {
            webhookId,
            eventId,
            httpStatus,
          });
        }
      } else {
        logger.info('Webhook delivered successfully', {
          webhookId,
          eventId,
          httpStatus,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Webhook delivery error:', {
        error: errorMessage,
        webhookId,
        eventId,
        attempt,
      });

      // Log the failed attempt
      await prisma.webhookLog.create({
        data: {
          webhookId,
          eventId,
          request: JSON.stringify(payload),
          response: errorMessage,
          httpStatus: 0,
        },
      });

      // Update webhook event
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          statusCode: 0,
          attempts: attempt,
          lastAttemptAt: new Date(),
        },
      });

      // Retry on error
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.warn(`Webhook delivery error. Retrying in ${delay}ms...`, {
          webhookId,
          eventId,
          attempt,
        });

        setTimeout(() => {
          this.add({
            ...delivery,
            attempt: attempt + 1,
          });
        }, delay);
      }
    }
  }

  private signPayload(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }
}

const webhookQueue = new WebhookQueue();

export class WebhookService {
  /**
   * Register a new webhook
   */
  static async registerWebhook(
    userId: string,
    url: string,
    events: WebhookEventType[]
  ): Promise<any> {
    // Generate a secure secret for HMAC signing
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        userId,
        url,
        events: events.join(','),
        secret,
        status: 'ACTIVE',
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events.split(','),
      secret: webhook.secret,
      status: webhook.status,
      createdAt: webhook.createdAt,
    };
  }

  /**
   * Trigger webhooks for a specific event
   */
  static async triggerEvent(
    userId: string,
    eventType: WebhookEventType,
    data: any
  ): Promise<void> {
    try {
      // Find all active webhooks for this user that listen to this event
      const webhooks = await prisma.webhook.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      // Filter webhooks that subscribe to this event type
      const relevantWebhooks = webhooks.filter((webhook) =>
        webhook.events.split(',').includes(eventType)
      );

      if (relevantWebhooks.length === 0) {
        return;
      }

      // Create webhook payload
      const payload: WebhookPayload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data,
      };

      // Create webhook events and queue for delivery
      for (const webhook of relevantWebhooks) {
        const webhookEvent = await prisma.webhookEvent.create({
          data: {
            webhookId: webhook.id,
            eventType,
            payload: JSON.stringify(data),
            attempts: 0,
          },
        });

        // Queue for delivery
        webhookQueue.add({
          webhookId: webhook.id,
          eventId: webhookEvent.id,
          url: webhook.url,
          secret: webhook.secret,
          payload,
          attempt: 1,
        });
      }
    } catch (error) {
      logger.error('Error triggering webhook event:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get webhooks for a user
   */
  static async getUserWebhooks(userId: string): Promise<any[]> {
    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((webhook) => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events.split(','),
      status: webhook.status,
      retryCount: webhook.retryCount,
      lastTriggeredAt: webhook.lastTriggeredAt,
      createdAt: webhook.createdAt,
    }));
  }

  /**
   * Delete a webhook
   */
  static async deleteWebhook(userId: string, webhookId: string): Promise<boolean> {
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      return false;
    }

    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    return true;
  }

  /**
   * Get webhook logs
   */
  static async getWebhookLogs(
    userId: string,
    webhookId: string,
    limit = 50,
    offset = 0
  ): Promise<any> {
    // Verify webhook ownership
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      return null;
    }

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where: { webhookId },
        include: {
          event: {
            select: {
              eventType: true,
              createdAt: true,
            },
          },
        },
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.webhookLog.count({ where: { webhookId } }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        eventType: log.event.eventType,
        httpStatus: log.httpStatus,
        request: log.request,
        response: log.response,
        executedAt: log.executedAt,
        eventCreatedAt: log.event.createdAt,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Send test webhook event
   */
  static async sendTestEvent(userId: string, webhookId: string): Promise<boolean> {
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      return false;
    }

    // Create a test payload
    const payload: WebhookPayload = {
      event: 'EARNING_CREATED' as WebhookEventType,
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook event from EarnTrack',
        webhook_id: webhookId,
      },
    };

    // Create webhook event
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        webhookId: webhook.id,
        eventType: 'EARNING_CREATED',
        payload: JSON.stringify(payload.data),
        attempts: 0,
      },
    });

    // Queue for delivery
    webhookQueue.add({
      webhookId: webhook.id,
      eventId: webhookEvent.id,
      url: webhook.url,
      secret: webhook.secret,
      payload,
      attempt: 1,
    });

    return true;
  }

  /**
   * Validate webhook signature
   */
  static validateSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Update webhook status
   */
  static async updateWebhookStatus(
    userId: string,
    webhookId: string,
    status: 'ACTIVE' | 'INACTIVE'
  ): Promise<boolean> {
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      return false;
    }

    await prisma.webhook.update({
      where: { id: webhookId },
      data: { status },
    });

    return true;
  }
}

import twilio from 'twilio';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { SMSCampaignStatus, SMSLogStatus } from '@prisma/client';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

// Initialize Twilio client only if credentials are provided
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

// Rate limiting configuration (messages per second)
const RATE_LIMIT_PER_SECOND = 5;
const RATE_LIMIT_DELAY = 1000 / RATE_LIMIT_PER_SECOND;

/**
 * Validates phone number in E.164 format
 * E.164 format: +[country code][subscriber number]
 * Example: +14155552671
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
};

/**
 * Format phone number to E.164 format if needed
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters except leading +
  let cleaned = phoneNumber.trim();

  // If already starts with +, validate and return
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }

  // Otherwise, assume it needs a + prefix
  return '+' + cleaned.replace(/\D/g, '');
};

/**
 * Render template with variables
 */
export const renderTemplate = (template: string, variables: Record<string, string>): string => {
  let rendered = template;

  Object.entries(variables).forEach(([key, value]) => {
    // Support both {{variable}} and {variable} formats
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    rendered = rendered.replace(new RegExp(`{${key}}`, 'g'), value);
  });

  return rendered;
};

/**
 * Sleep function for rate limiting
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export class SMSService {
  /**
   * Send a single SMS message
   */
  async sendSMS(
    phoneNumber: string,
    message: string,
    campaignId?: string,
    userId?: string
  ): Promise<{
    success: boolean;
    logId?: string;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Validate Twilio configuration
      if (!twilioClient || !twilioPhoneNumber) {
        logger.error('Twilio not configured');
        return {
          success: false,
          error: 'SMS service is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER',
        };
      }

      // Validate and format phone number
      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!validatePhoneNumber(formattedPhone)) {
        return {
          success: false,
          error: 'Invalid phone number format. Please use E.164 format (e.g., +14155552671)',
        };
      }

      // Check if phone number is opted out
      if (userId) {
        const phoneRecord = await prisma.phoneNumber.findFirst({
          where: {
            userId,
            phoneNumber: formattedPhone,
          },
        });

        if (phoneRecord && !phoneRecord.isOptedIn) {
          return {
            success: false,
            error: 'Recipient has opted out of SMS messages',
          };
        }
      }

      // Create log entry before sending
      const log = await prisma.sMSLog.create({
        data: {
          campaignId,
          userId,
          phoneNumber: formattedPhone,
          message,
          status: SMSLogStatus.PENDING,
        },
      });

      // Send message via Twilio
      const twilioMessage = await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: formattedPhone,
      });

      // Update log with success
      await prisma.sMSLog.update({
        where: { id: log.id },
        data: {
          status: SMSLogStatus.SENT,
          messageId: twilioMessage.sid,
          sentAt: new Date(),
        },
      });

      logger.info('SMS sent successfully', {
        logId: log.id,
        messageId: twilioMessage.sid,
        phoneNumber: formattedPhone,
      });

      return {
        success: true,
        logId: log.id,
        messageId: twilioMessage.sid,
      };
    } catch (error) {
      logger.error('Failed to send SMS', error instanceof Error ? error : new Error(String(error)));

      // Update log with error if we have a log ID
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send bulk SMS messages with rate limiting
   */
  async sendBulkSMS(
    phoneNumbers: string[],
    message: string,
    campaignId: string,
    userId: string
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < phoneNumbers.length; i++) {
      const phoneNumber = phoneNumbers[i];

      try {
        const result = await this.sendSMS(phoneNumber, message, campaignId, userId);

        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push(`${phoneNumber}: ${result.error}`);
        }

        // Rate limiting: wait between messages
        if (i < phoneNumbers.length - 1) {
          await sleep(RATE_LIMIT_DELAY);
        }
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${phoneNumber}: ${errorMsg}`);
      }
    }

    return {
      success: sent > 0,
      sent,
      failed,
      errors,
    };
  }

  /**
   * Send campaign
   */
  async sendCampaign(campaignId: string, userId: string): Promise<{
    success: boolean;
    sent?: number;
    failed?: number;
    error?: string;
  }> {
    try {
      // Get campaign
      const campaign = await prisma.sMSCampaign.findFirst({
        where: {
          id: campaignId,
          userId,
        },
        include: {
          template: true,
        },
      });

      if (!campaign) {
        return {
          success: false,
          error: 'Campaign not found',
        };
      }

      if (campaign.status !== SMSCampaignStatus.DRAFT && campaign.status !== SMSCampaignStatus.SCHEDULED) {
        return {
          success: false,
          error: 'Campaign cannot be sent. Current status: ' + campaign.status,
        };
      }

      // Parse recipients
      const recipients: string[] = JSON.parse(campaign.recipients);

      if (recipients.length === 0) {
        return {
          success: false,
          error: 'No recipients found',
        };
      }

      // Get message content (from template if available)
      let message = '';
      if (campaign.template) {
        message = campaign.template.content;
      } else {
        return {
          success: false,
          error: 'No template associated with campaign',
        };
      }

      // Update campaign status to SENDING
      await prisma.sMSCampaign.update({
        where: { id: campaignId },
        data: {
          status: SMSCampaignStatus.SENDING,
          startedAt: new Date(),
        },
      });

      // Send messages
      const result = await this.sendBulkSMS(recipients, message, campaignId, userId);

      // Update campaign status to SENT
      await prisma.sMSCampaign.update({
        where: { id: campaignId },
        data: {
          status: SMSCampaignStatus.SENT,
          completedAt: new Date(),
        },
      });

      return {
        success: result.success,
        sent: result.sent,
        failed: result.failed,
      };
    } catch (error) {
      logger.error('Failed to send campaign', error instanceof Error ? error : new Error(String(error)));

      // Update campaign status to DRAFT on error
      await prisma.sMSCampaign.update({
        where: { id: campaignId },
        data: {
          status: SMSCampaignStatus.DRAFT,
        },
      }).catch(() => {});

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send campaign',
      };
    }
  }

  /**
   * Handle incoming SMS (for Twilio webhook)
   */
  async receiveInboundSMS(data: {
    From: string;
    To: string;
    Body: string;
    MessageSid: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const phoneNumber = formatPhoneNumber(data.From);

      // Check for unsubscribe keyword
      const body = data.Body.trim().toUpperCase();
      if (body === 'STOP' || body === 'UNSUBSCRIBE' || body === 'CANCEL') {
        await this.handleUnsubscribe(phoneNumber);
        logger.info('User unsubscribed via SMS', { phoneNumber });
      }

      // Log the inbound message
      logger.info('Inbound SMS received', {
        from: phoneNumber,
        to: data.To,
        body: data.Body,
        messageSid: data.MessageSid,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to receive inbound SMS', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process inbound SMS',
      };
    }
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(phoneNumber: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Update all phone number records for this number
      await prisma.phoneNumber.updateMany({
        where: {
          phoneNumber: formattedPhone,
        },
        data: {
          isOptedIn: false,
          optedOutAt: new Date(),
        },
      });

      logger.info('Phone number opted out', { phoneNumber: formattedPhone });

      return { success: true };
    } catch (error) {
      logger.error('Failed to handle unsubscribe', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process unsubscribe',
      };
    }
  }

  /**
   * Update message status from Twilio webhook
   */
  async updateMessageStatus(
    messageSid: string,
    status: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Map Twilio status to our status
      let smsStatus: SMSLogStatus;
      switch (status) {
        case 'sent':
        case 'queued':
          smsStatus = SMSLogStatus.SENT;
          break;
        case 'delivered':
          smsStatus = SMSLogStatus.DELIVERED;
          break;
        case 'failed':
        case 'undelivered':
          smsStatus = SMSLogStatus.FAILED;
          break;
        default:
          smsStatus = SMSLogStatus.PENDING;
      }

      // Update log status
      const updateData: any = { status: smsStatus };
      if (smsStatus === SMSLogStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
      }

      await prisma.sMSLog.updateMany({
        where: { messageId: messageSid },
        data: updateData,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to update message status', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
      };
    }
  }

  /**
   * Get message status from Twilio
   */
  async getMessageStatus(messageSid: string): Promise<{
    success: boolean;
    status?: SMSLogStatus;
    error?: string;
  }> {
    try {
      if (!twilioClient) {
        return {
          success: false,
          error: 'Twilio not configured',
        };
      }

      const message = await twilioClient.messages(messageSid).fetch();

      // Map Twilio status to our status
      let status: SMSLogStatus;
      switch (message.status) {
        case 'sent':
        case 'queued':
          status = SMSLogStatus.SENT;
          break;
        case 'delivered':
          status = SMSLogStatus.DELIVERED;
          break;
        case 'failed':
        case 'undelivered':
          status = SMSLogStatus.FAILED;
          break;
        default:
          status = SMSLogStatus.PENDING;
      }

      // Update status in database
      await this.updateMessageStatus(messageSid, message.status);

      return {
        success: true,
        status,
      };
    } catch (error) {
      logger.error('Failed to get message status', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      };
    }
  }

  /**
   * Verify phone number
   */
  async verifyPhoneNumber(
    userId: string,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);

      if (!validatePhoneNumber(formattedPhone)) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      await prisma.phoneNumber.upsert({
        where: {
          userId_phoneNumber: {
            userId,
            phoneNumber: formattedPhone,
          },
        },
        update: {
          isVerified: true,
          verifiedAt: new Date(),
        },
        create: {
          userId,
          phoneNumber: formattedPhone,
          isVerified: true,
          verifiedAt: new Date(),
          isOptedIn: true,
        },
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to verify phone number', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify phone number',
      };
    }
  }
}

export default new SMSService();

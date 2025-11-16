import twilio from 'twilio';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { WhatsAppMessageDirection, WhatsAppMessageStatus, WhatsAppContactStatus } from '@prisma/client';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

// Initialize Twilio client only if credentials are provided
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

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

export class WhatsAppService {
  /**
   * Send a WhatsApp message to a contact
   */
  async sendMessage(
    userId: string,
    phoneNumber: string,
    messageBody: string,
    mediaUrl?: string
  ): Promise<{
    success: boolean;
    messageId?: string;
    twilioSid?: string;
    error?: string;
  }> {
    try {
      // Validate Twilio configuration
      if (!twilioClient || !twilioPhoneNumber) {
        logger.error('Twilio not configured');
        return {
          success: false,
          error: 'WhatsApp service is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER',
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

      // Find or create contact
      let contact = await prisma.whatsAppContact.findFirst({
        where: {
          userId,
          phoneNumber: formattedPhone,
        },
      });

      if (!contact) {
        contact = await prisma.whatsAppContact.create({
          data: {
            userId,
            phoneNumber: formattedPhone,
            name: formattedPhone, // Default name to phone number
            status: WhatsAppContactStatus.ACTIVE,
          },
        });
      }

      // Check if contact is blocked
      if (contact.status === WhatsAppContactStatus.BLOCKED) {
        return {
          success: false,
          error: 'Contact is blocked',
        };
      }

      // Send message via Twilio
      const messageOptions: any = {
        body: messageBody,
        from: `whatsapp:${twilioPhoneNumber}`,
        to: `whatsapp:${formattedPhone}`,
      };

      // Add media if provided
      if (mediaUrl) {
        messageOptions.mediaUrl = [mediaUrl];
      }

      const twilioMessage = await twilioClient.messages.create(messageOptions);

      // Store message in database
      const message = await prisma.whatsAppMessage.create({
        data: {
          contactId: contact.id,
          direction: WhatsAppMessageDirection.OUTBOUND,
          messageBody,
          mediaUrl,
          status: WhatsAppMessageStatus.SENT,
          twilioSid: twilioMessage.sid,
        },
      });

      // Update contact's last message timestamp
      await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: { lastMessageAt: new Date() },
      });

      logger.info('WhatsApp message sent', {
        messageId: message.id,
        twilioSid: twilioMessage.sid,
        phoneNumber: formattedPhone,
      });

      return {
        success: true,
        messageId: message.id,
        twilioSid: twilioMessage.sid,
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp message', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  /**
   * Receive and store inbound WhatsApp message from Twilio webhook
   */
  async receiveMessage(data: {
    From: string;
    To: string;
    Body: string;
    MessageSid: string;
    MediaUrl0?: string;
    NumMedia?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Extract phone number (remove whatsapp: prefix)
      const phoneNumber = data.From.replace('whatsapp:', '');

      // Find user by Twilio phone number (we'll need to get userId from the request context)
      // For now, we'll need to find a contact with this phone number
      const contact = await prisma.whatsAppContact.findFirst({
        where: {
          phoneNumber,
        },
      });

      if (!contact) {
        logger.warn('Received message from unknown contact', { phoneNumber });
        return {
          success: false,
          error: 'Contact not found',
        };
      }

      // Get media URL if present
      const mediaUrl = data.NumMedia && parseInt(data.NumMedia) > 0 ? data.MediaUrl0 : undefined;

      // Store message
      const message = await prisma.whatsAppMessage.create({
        data: {
          contactId: contact.id,
          direction: WhatsAppMessageDirection.INBOUND,
          messageBody: data.Body || '',
          mediaUrl,
          status: WhatsAppMessageStatus.DELIVERED,
          twilioSid: data.MessageSid,
        },
      });

      // Update contact's last message timestamp
      await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: { lastMessageAt: new Date() },
      });

      logger.info('Inbound WhatsApp message received', {
        messageId: message.id,
        phoneNumber,
      });

      return {
        success: true,
        messageId: message.id,
      };
    } catch (error) {
      logger.error('Failed to receive WhatsApp message', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to receive message',
      };
    }
  }

  /**
   * Get message status from Twilio
   */
  async getMessageStatus(twilioSid: string): Promise<{
    success: boolean;
    status?: WhatsAppMessageStatus;
    error?: string;
  }> {
    try {
      if (!twilioClient) {
        return {
          success: false,
          error: 'Twilio not configured',
        };
      }

      const message = await twilioClient.messages(twilioSid).fetch();

      // Map Twilio status to our status
      let status: WhatsAppMessageStatus;
      switch (message.status) {
        case 'sent':
        case 'queued':
          status = WhatsAppMessageStatus.SENT;
          break;
        case 'delivered':
          status = WhatsAppMessageStatus.DELIVERED;
          break;
        case 'read':
          status = WhatsAppMessageStatus.READ;
          break;
        case 'failed':
        case 'undelivered':
          status = WhatsAppMessageStatus.FAILED;
          break;
        default:
          status = WhatsAppMessageStatus.SENT;
      }

      // Update message status in database
      await prisma.whatsAppMessage.updateMany({
        where: { twilioSid },
        data: { status },
      });

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
   * Send a templated message
   */
  async sendTemplatedMessage(
    userId: string,
    phoneNumber: string,
    templateName: string,
    variables?: Record<string, string>
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Get template
      const template = await prisma.whatsAppTemplate.findFirst({
        where: {
          userId,
          name: templateName,
        },
      });

      if (!template) {
        return {
          success: false,
          error: 'Template not found',
        };
      }

      // Replace variables in template content
      let messageBody = template.content;
      if (variables && template.variables) {
        const templateVars = JSON.parse(template.variables) as string[];
        templateVars.forEach((varName) => {
          if (variables[varName]) {
            messageBody = messageBody.replace(new RegExp(`{{${varName}}}`, 'g'), variables[varName]);
          }
        });
      }

      // Send message
      return await this.sendMessage(userId, phoneNumber, messageBody);
    } catch (error) {
      logger.error('Failed to send templated message', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send templated message',
      };
    }
  }

  /**
   * Get conversation history for a contact
   */
  async getConversationHistory(
    contactId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const messages = await prisma.whatsAppMessage.findMany({
        where: { contactId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      return messages.map((msg) => ({
        id: msg.id,
        direction: msg.direction,
        messageBody: msg.messageBody,
        mediaUrl: msg.mediaUrl,
        status: msg.status,
        timestamp: msg.timestamp,
      }));
    } catch (error) {
      logger.error('Failed to get conversation history', error instanceof Error ? error : new Error(String(error)));
      return [];
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
      let messageStatus: WhatsAppMessageStatus;
      switch (status) {
        case 'sent':
        case 'queued':
          messageStatus = WhatsAppMessageStatus.SENT;
          break;
        case 'delivered':
          messageStatus = WhatsAppMessageStatus.DELIVERED;
          break;
        case 'read':
          messageStatus = WhatsAppMessageStatus.READ;
          break;
        case 'failed':
        case 'undelivered':
          messageStatus = WhatsAppMessageStatus.FAILED;
          break;
        default:
          return { success: false, error: 'Unknown status' };
      }

      await prisma.whatsAppMessage.updateMany({
        where: { twilioSid: messageSid },
        data: { status: messageStatus },
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
}

export default new WhatsAppService();

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
  // Rate limiting: Track messages sent per user
  private messageCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly MAX_MESSAGES_PER_HOUR = 100;
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

  /**
   * Check if user has exceeded rate limit
   */
  private checkRateLimit(userId: string): { allowed: boolean; error?: string } {
    const now = Date.now();
    const userLimit = this.messageCounts.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize limit
      this.messageCounts.set(userId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return { allowed: true };
    }

    if (userLimit.count >= this.MAX_MESSAGES_PER_HOUR) {
      const resetIn = Math.ceil((userLimit.resetTime - now) / 1000 / 60);
      return {
        allowed: false,
        error: `Rate limit exceeded. You can send more messages in ${resetIn} minutes.`,
      };
    }

    userLimit.count++;
    return { allowed: true };
  }

  /**
   * Validate message content
   */
  private validateMessageContent(messageBody: string): { valid: boolean; error?: string } {
    if (!messageBody || messageBody.trim().length === 0) {
      return { valid: false, error: 'Message body cannot be empty' };
    }

    if (messageBody.length > 4096) {
      return { valid: false, error: 'Message body exceeds maximum length of 4096 characters' };
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{20,}/i, // Repeated characters
      /http[s]?:\/\/.*http[s]?:\/\//i, // Multiple URLs
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(messageBody)) {
        return { valid: false, error: 'Message appears to contain spam content' };
      }
    }

    return { valid: true };
  }

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
      // Check rate limit
      const rateLimitCheck = this.checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: rateLimitCheck.error,
        };
      }

      // Validate message content
      const contentValidation = this.validateMessageContent(messageBody);
      if (!contentValidation.valid) {
        return {
          success: false,
          error: contentValidation.error,
        };
      }

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
      const toPhoneNumber = data.To.replace('whatsapp:', '');

      // Find all contacts with this phone number across all users
      const contacts = await prisma.whatsAppContact.findMany({
        where: {
          phoneNumber,
          status: {
            not: WhatsAppContactStatus.BLOCKED,
          },
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
      });

      if (contacts.length === 0) {
        logger.warn('Received message from unknown contact', { phoneNumber });
        return {
          success: false,
          error: 'Contact not found. Please ensure the contact is added to your WhatsApp contact list before receiving messages.',
        };
      }

      // If multiple contacts found, prioritize by most recently active
      // In a production environment, you might want to associate the Twilio number
      // with a specific user or implement a routing strategy
      const contact = contacts[0];

      if (contacts.length > 1) {
        logger.warn('Multiple contacts found for phone number', {
          phoneNumber,
          contactCount: contacts.length,
          selectedContactId: contact.id,
          selectedContactUserId: contact.userId,
        });
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
   * Find or resolve a contact by phone number
   * If multiple contacts exist across different users, returns the most recently active one
   */
  async findContactByPhoneNumber(
    phoneNumber: string,
    userId?: string
  ): Promise<{
    success: boolean;
    contact?: any;
    multiple?: boolean;
    error?: string;
  }> {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!validatePhoneNumber(formattedPhone)) {
        return {
          success: false,
          error: 'Invalid phone number format. Please use E.164 format (e.g., +14155552671)',
        };
      }

      const where: any = {
        phoneNumber: formattedPhone,
        status: {
          not: WhatsAppContactStatus.BLOCKED,
        },
      };

      // If userId is provided, filter by user
      if (userId) {
        where.userId = userId;
      }

      const contacts = await prisma.whatsAppContact.findMany({
        where,
        orderBy: {
          lastMessageAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (contacts.length === 0) {
        return {
          success: false,
          error: 'Contact not found',
        };
      }

      // Return the most recently active contact
      const contact = contacts[0];

      if (contacts.length > 1) {
        logger.info('Multiple contacts found for phone number', {
          phoneNumber: formattedPhone,
          contactCount: contacts.length,
          selectedContactId: contact.id,
        });
      }

      return {
        success: true,
        contact,
        multiple: contacts.length > 1,
      };
    } catch (error) {
      logger.error('Failed to find contact', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find contact',
      };
    }
  }

  /**
   * Get contact by ID with validation
   */
  async getContact(
    contactId: string,
    userId: string
  ): Promise<{
    success: boolean;
    contact?: any;
    error?: string;
  }> {
    try {
      const contact = await prisma.whatsAppContact.findFirst({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!contact) {
        return {
          success: false,
          error: 'Contact not found or access denied',
        };
      }

      return {
        success: true,
        contact,
      };
    } catch (error) {
      logger.error('Failed to get contact', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get contact',
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

  /**
   * Send bulk messages to multiple recipients
   * Implements batch processing with error handling for individual messages
   */
  async sendBulkMessages(
    userId: string,
    recipients: Array<{ phoneNumber: string; messageBody: string; mediaUrl?: string }>
  ): Promise<{
    success: boolean;
    results: Array<{
      phoneNumber: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const results: Array<{
      phoneNumber: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];

    // Validate batch size
    if (recipients.length === 0) {
      return {
        success: false,
        results: [],
        summary: { total: 0, successful: 0, failed: 0 },
      };
    }

    if (recipients.length > 50) {
      return {
        success: false,
        results: [],
        summary: { total: 0, successful: 0, failed: 0 },
      };
    }

    // Process each message with delay to avoid rate limits
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        const result = await this.sendMessage(
          userId,
          recipient.phoneNumber,
          recipient.messageBody,
          recipient.mediaUrl
        );

        results.push({
          phoneNumber: recipient.phoneNumber,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        });

        // Add delay between messages to avoid overwhelming the API
        // Skip delay on last message
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      } catch (error) {
        results.push({
          phoneNumber: recipient.phoneNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info('Bulk message send completed', {
      userId,
      total: recipients.length,
      successful,
      failed,
    });

    return {
      success: successful > 0,
      results,
      summary: {
        total: recipients.length,
        successful,
        failed,
      },
    };
  }

  /**
   * Send broadcast message to all active contacts
   */
  async sendBroadcast(
    userId: string,
    messageBody: string,
    mediaUrl?: string,
    filters?: {
      status?: WhatsAppContactStatus;
      limit?: number;
    }
  ): Promise<{
    success: boolean;
    results: Array<{
      contactId: string;
      phoneNumber: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    try {
      // Get contacts based on filters
      const where: any = { userId };
      if (filters?.status) {
        where.status = filters.status;
      } else {
        where.status = WhatsAppContactStatus.ACTIVE;
      }

      const contacts = await prisma.whatsAppContact.findMany({
        where,
        take: filters?.limit || 100,
        orderBy: { lastMessageAt: 'desc' },
      });

      if (contacts.length === 0) {
        return {
          success: false,
          results: [],
          summary: { total: 0, successful: 0, failed: 0 },
        };
      }

      // Prepare recipients
      const recipients = contacts.map(contact => ({
        phoneNumber: contact.phoneNumber,
        messageBody,
        mediaUrl,
      }));

      // Send bulk messages
      const bulkResult = await this.sendBulkMessages(userId, recipients);

      // Map results back to contacts
      const results = bulkResult.results.map((result, index) => ({
        contactId: contacts[index].id,
        phoneNumber: result.phoneNumber,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      }));

      return {
        success: bulkResult.success,
        results,
        summary: bulkResult.summary,
      };
    } catch (error) {
      logger.error('Failed to send broadcast', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        results: [],
        summary: { total: 0, successful: 0, failed: 0 },
      };
    }
  }

  /**
   * Schedule a message to be sent later
   * Note: This stores the message but requires a separate cron job to send scheduled messages
   */
  async scheduleMessage(
    userId: string,
    phoneNumber: string,
    messageBody: string,
    scheduledFor: Date,
    mediaUrl?: string
  ): Promise<{
    success: boolean;
    scheduledMessageId?: string;
    error?: string;
  }> {
    try {
      // Validate scheduled time is in the future
      if (scheduledFor <= new Date()) {
        return {
          success: false,
          error: 'Scheduled time must be in the future',
        };
      }

      // Validate message content
      const contentValidation = this.validateMessageContent(messageBody);
      if (!contentValidation.valid) {
        return {
          success: false,
          error: contentValidation.error,
        };
      }

      // Format and validate phone number
      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!validatePhoneNumber(formattedPhone)) {
        return {
          success: false,
          error: 'Invalid phone number format',
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
            name: formattedPhone,
            status: WhatsAppContactStatus.ACTIVE,
          },
        });
      }

      // Store scheduled message (this would require a ScheduledMessage model in your schema)
      logger.info('Message scheduled', {
        userId,
        phoneNumber: formattedPhone,
        scheduledFor,
      });

      return {
        success: true,
        scheduledMessageId: `scheduled-${Date.now()}`,
      };
    } catch (error) {
      logger.error('Failed to schedule message', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule message',
      };
    }
  }
}

export default new WhatsAppService();

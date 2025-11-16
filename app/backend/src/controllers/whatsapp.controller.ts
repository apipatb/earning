import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import whatsappService, { validatePhoneNumber, formatPhoneNumber } from '../services/whatsapp.service';
import { logger } from '../utils/logger';
import { parseLimitParam, parseOffsetParam } from '../utils/validation';

// Local enum definitions (pending Prisma migration)
enum WhatsAppContactStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

enum WhatsAppMessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

enum WhatsAppMessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

// Validation schemas
const sendMessageSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
  message: z.string().min(1, 'Message is required'),
  mediaUrl: z.string().url().optional(),
});

const createContactSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
  name: z.string().min(1, 'Name is required').max(255),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  content: z.string().min(1, 'Template content is required'),
  variables: z.array(z.string()).optional(),
  category: z.string().max(100).optional(),
});

const sendTemplateMessageSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
  templateName: z.string().min(1, 'Template name is required'),
  variables: z.record(z.string()).optional(),
});

/**
 * POST /api/v1/whatsapp/send
 * Send a WhatsApp message
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = sendMessageSchema.parse(req.body);

    // Validate phone number format
    const formattedPhone = formatPhoneNumber(data.phoneNumber);
    if (!validatePhoneNumber(formattedPhone)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid phone number format. Please use E.164 format (e.g., +14155552671)',
      });
    }

    const result = await whatsappService.sendMessage(
      userId,
      formattedPhone,
      data.message,
      data.mediaUrl
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Send Message Error',
        message: result.error || 'Failed to send message',
      });
    }

    res.status(200).json({
      success: true,
      messageId: result.messageId,
      twilioSid: result.twilioSid,
      message: 'Message sent successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Send WhatsApp message error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send message',
    });
  }
};

/**
 * GET /api/v1/whatsapp/contacts
 * Get all WhatsApp contacts for the user
 */
export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, search, limit: limitParam, offset: offsetParam } = req.query;

    const limit = parseLimitParam(limitParam);
    const offset = parseOffsetParam(offsetParam);

    const where: any = { userId };

    if (status) {
      where.status = status as WhatsAppContactStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phoneNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.whatsAppContact.count({ where });

    const contacts = await prisma.whatsAppContact.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    const formattedContacts = contacts.map((contact) => ({
      id: contact.id,
      phoneNumber: contact.phoneNumber,
      name: contact.name,
      status: contact.status,
      lastMessageAt: contact.lastMessageAt,
      messageCount: contact._count.messages,
      createdAt: contact.createdAt,
    }));

    res.json({
      contacts: formattedContacts,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get WhatsApp contacts error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch contacts',
    });
  }
};

/**
 * POST /api/v1/whatsapp/contacts
 * Add a new WhatsApp contact
 */
export const createContact = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createContactSchema.parse(req.body);

    // Validate and format phone number
    const formattedPhone = formatPhoneNumber(data.phoneNumber);
    if (!validatePhoneNumber(formattedPhone)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid phone number format. Please use E.164 format (e.g., +14155552671)',
      });
    }

    // Check if contact already exists
    const existingContact = await prisma.whatsAppContact.findFirst({
      where: {
        userId,
        phoneNumber: formattedPhone,
      },
    });

    if (existingContact) {
      return res.status(400).json({
        error: 'Duplicate Contact',
        message: 'Contact with this phone number already exists',
      });
    }

    const contact = await prisma.whatsAppContact.create({
      data: {
        userId,
        phoneNumber: formattedPhone,
        name: data.name,
        status: data.status as WhatsAppContactStatus || WhatsAppContactStatus.ACTIVE,
      },
    });

    res.status(201).json({
      success: true,
      contact: {
        id: contact.id,
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        status: contact.status,
        createdAt: contact.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Create WhatsApp contact error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create contact',
    });
  }
};

/**
 * GET /api/v1/whatsapp/contacts/:id
 * Get contact details and conversation history
 */
export const getContactDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = req.params.id;
    const { limit: limitParam, offset: offsetParam } = req.query;

    const limit = parseLimitParam(limitParam, 50);
    const offset = parseOffsetParam(offsetParam);

    // Get contact
    const contact = await prisma.whatsAppContact.findFirst({
      where: {
        id: contactId,
        userId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contact not found',
      });
    }

    // Get conversation history
    const messages = await whatsappService.getConversationHistory(contactId, limit, offset);
    const totalMessages = await prisma.whatsAppMessage.count({
      where: { contactId },
    });

    res.json({
      contact: {
        id: contact.id,
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        status: contact.status,
        lastMessageAt: contact.lastMessageAt,
        createdAt: contact.createdAt,
      },
      messages,
      pagination: {
        total: totalMessages,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get contact details error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch contact details',
    });
  }
};

/**
 * PUT /api/v1/whatsapp/contacts/:id
 * Update contact details
 */
export const updateContact = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = req.params.id;
    const data = createContactSchema.partial().parse(req.body);

    // Check if contact exists and belongs to user
    const contact = await prisma.whatsAppContact.findFirst({
      where: {
        id: contactId,
        userId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contact not found',
      });
    }

    // Format phone number if provided
    let updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.status) updateData.status = data.status;
    if (data.phoneNumber) {
      const formattedPhone = formatPhoneNumber(data.phoneNumber);
      if (!validatePhoneNumber(formattedPhone)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid phone number format',
        });
      }
      updateData.phoneNumber = formattedPhone;
    }

    const updatedContact = await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: updateData,
    });

    res.json({
      success: true,
      contact: updatedContact,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Update contact error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update contact',
    });
  }
};

/**
 * DELETE /api/v1/whatsapp/contacts/:id
 * Delete a contact
 */
export const deleteContact = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = req.params.id;

    const contact = await prisma.whatsAppContact.findFirst({
      where: {
        id: contactId,
        userId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contact not found',
      });
    }

    await prisma.whatsAppContact.delete({
      where: { id: contactId },
    });

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    logger.error('Delete contact error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete contact',
    });
  }
};

/**
 * POST /api/v1/whatsapp/templates
 * Create a new message template
 */
export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createTemplateSchema.parse(req.body);

    // Check if template with same name exists
    const existingTemplate = await prisma.whatsAppTemplate.findFirst({
      where: {
        userId,
        name: data.name,
      },
    });

    if (existingTemplate) {
      return res.status(400).json({
        error: 'Duplicate Template',
        message: 'Template with this name already exists',
      });
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        userId,
        name: data.name,
        content: data.content,
        variables: data.variables ? JSON.stringify(data.variables) : null,
        category: data.category,
      },
    });

    res.status(201).json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables ? JSON.parse(template.variables) : [],
        category: template.category,
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Create template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create template',
    });
  }
};

/**
 * GET /api/v1/whatsapp/templates
 * Get all message templates
 */
export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { category, search } = req.query;

    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const templates = await prisma.whatsAppTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const formattedTemplates = templates.map((t) => ({
      id: t.id,
      name: t.name,
      content: t.content,
      variables: t.variables ? JSON.parse(t.variables) : [],
      category: t.category,
      createdAt: t.createdAt,
    }));

    res.json({
      templates: formattedTemplates,
    });
  } catch (error) {
    logger.error('Get templates error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch templates',
    });
  }
};

/**
 * POST /api/v1/whatsapp/send-template
 * Send a message using a template
 */
export const sendTemplateMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = sendTemplateMessageSchema.parse(req.body);

    // Validate phone number
    const formattedPhone = formatPhoneNumber(data.phoneNumber);
    if (!validatePhoneNumber(formattedPhone)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid phone number format',
      });
    }

    const result = await whatsappService.sendTemplatedMessage(
      userId,
      formattedPhone,
      data.templateName,
      data.variables
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Send Template Error',
        message: result.error || 'Failed to send template message',
      });
    }

    res.status(200).json({
      success: true,
      messageId: result.messageId,
      message: 'Template message sent successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Send template message error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send template message',
    });
  }
};

/**
 * POST /api/v1/whatsapp/webhook
 * Webhook endpoint for receiving messages from Twilio (no auth required)
 */
export const webhookHandler = async (req: any, res: Response) => {
  try {
    const data = req.body;

    logger.info('WhatsApp webhook received', {
      from: data.From,
      to: data.To,
      body: data.Body,
    });

    // Handle incoming message
    if (data.From && data.Body) {
      await whatsappService.receiveMessage(data);
    }

    // Handle status callback
    if (data.MessageSid && data.MessageStatus) {
      await whatsappService.updateMessageStatus(data.MessageSid, data.MessageStatus);
    }

    // Respond with TwiML (required by Twilio)
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    logger.error('WhatsApp webhook error:', error instanceof Error ? error : new Error(String(error)));
    // Still respond with success to Twilio to avoid retries
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
};

/**
 * GET /api/v1/whatsapp/messages/:id/status
 * Get message status
 */
export const getMessageStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const messageId = req.params.id;

    // Get message
    const message = await prisma.whatsAppMessage.findFirst({
      where: {
        id: messageId,
        contact: {
          userId,
        },
      },
      include: {
        contact: true,
      },
    });

    if (!message) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Message not found',
      });
    }

    // Fetch latest status from Twilio if we have a Twilio SID
    if (message.twilioSid) {
      await whatsappService.getMessageStatus(message.twilioSid);

      // Refetch message to get updated status
      const updatedMessage = await prisma.whatsAppMessage.findUnique({
        where: { id: messageId },
      });

      if (updatedMessage) {
        return res.json({
          messageId: updatedMessage.id,
          status: updatedMessage.status,
          timestamp: updatedMessage.timestamp,
        });
      }
    }

    res.json({
      messageId: message.id,
      status: message.status,
      timestamp: message.timestamp,
    });
  } catch (error) {
    logger.error('Get message status error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch message status',
    });
  }
};

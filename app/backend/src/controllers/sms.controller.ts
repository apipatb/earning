import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import smsService, { validatePhoneNumber, formatPhoneNumber, renderTemplate } from '../services/sms.service';
import { logger } from '../utils/logger';
import { parseLimitParam, parseOffsetParam } from '../utils/validation';
import { SMSCampaignStatus, SMSLogStatus } from '@prisma/client';

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  content: z.string().min(1, 'Template content is required'),
  variables: z.array(z.string()).optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255),
  templateId: z.string().uuid('Invalid template ID'),
  recipients: z.array(z.string()).min(1, 'At least one recipient is required'),
  scheduledFor: z.string().datetime().optional(),
});

const addContactSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
  name: z.string().max(255).optional(),
  notes: z.string().optional(),
});

const unsubscribeSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

/**
 * POST /api/v1/sms/templates
 * Create a new SMS template
 */
export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createTemplateSchema.parse(req.body);

    // Check if template with same name exists
    const existingTemplate = await prisma.sMSTemplate.findFirst({
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

    const template = await prisma.sMSTemplate.create({
      data: {
        userId,
        name: data.name,
        content: data.content,
        variables: data.variables ? JSON.stringify(data.variables) : null,
      },
    });

    res.status(201).json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables ? JSON.parse(template.variables) : [],
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
    logger.error('Create SMS template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create template',
    });
  }
};

/**
 * GET /api/v1/sms/templates
 * Get all SMS templates
 */
export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { search } = req.query;

    const where: any = { userId };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const templates = await prisma.sMSTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    const formattedTemplates = templates.map((t) => ({
      id: t.id,
      name: t.name,
      content: t.content,
      variables: t.variables ? JSON.parse(t.variables) : [],
      campaignCount: t._count.campaigns,
      createdAt: t.createdAt,
    }));

    res.json({
      templates: formattedTemplates,
    });
  } catch (error) {
    logger.error('Get SMS templates error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch templates',
    });
  }
};

/**
 * GET /api/v1/sms/templates/:id
 * Get template by ID
 */
export const getTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const templateId = req.params.id;

    const template = await prisma.sMSTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Template not found',
      });
    }

    res.json({
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables ? JSON.parse(template.variables) : [],
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get SMS template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch template',
    });
  }
};

/**
 * PUT /api/v1/sms/templates/:id
 * Update template
 */
export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const templateId = req.params.id;
    const data = createTemplateSchema.partial().parse(req.body);

    const template = await prisma.sMSTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Template not found',
      });
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.content) updateData.content = data.content;
    if (data.variables) updateData.variables = JSON.stringify(data.variables);

    const updatedTemplate = await prisma.sMSTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    res.json({
      success: true,
      template: {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        content: updatedTemplate.content,
        variables: updatedTemplate.variables ? JSON.parse(updatedTemplate.variables) : [],
        createdAt: updatedTemplate.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Update SMS template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update template',
    });
  }
};

/**
 * DELETE /api/v1/sms/templates/:id
 * Delete template
 */
export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const templateId = req.params.id;

    const template = await prisma.sMSTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Template not found',
      });
    }

    await prisma.sMSTemplate.delete({
      where: { id: templateId },
    });

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    logger.error('Delete SMS template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete template',
    });
  }
};

/**
 * POST /api/v1/sms/campaigns
 * Create a new SMS campaign
 */
export const createCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createCampaignSchema.parse(req.body);

    // Validate template exists
    const template = await prisma.sMSTemplate.findFirst({
      where: {
        id: data.templateId,
        userId,
      },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Template not found',
      });
    }

    // Validate all phone numbers
    const invalidNumbers: string[] = [];
    data.recipients.forEach((phone) => {
      const formatted = formatPhoneNumber(phone);
      if (!validatePhoneNumber(formatted)) {
        invalidNumbers.push(phone);
      }
    });

    if (invalidNumbers.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid phone numbers: ${invalidNumbers.join(', ')}`,
      });
    }

    const campaign = await prisma.sMSCampaign.create({
      data: {
        userId,
        name: data.name,
        templateId: data.templateId,
        recipients: JSON.stringify(data.recipients),
        status: SMSCampaignStatus.DRAFT,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      },
      include: {
        template: true,
      },
    });

    res.status(201).json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        template: {
          id: campaign.template!.id,
          name: campaign.template!.name,
        },
        recipientCount: data.recipients.length,
        status: campaign.status,
        scheduledFor: campaign.scheduledFor,
        createdAt: campaign.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Create SMS campaign error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create campaign',
    });
  }
};

/**
 * GET /api/v1/sms/campaigns
 * Get all campaigns
 */
export const getCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, limit: limitParam, offset: offsetParam } = req.query;

    const limit = parseLimitParam(limitParam);
    const offset = parseOffsetParam(offsetParam);

    const where: any = { userId };

    if (status) {
      where.status = status as SMSCampaignStatus;
    }

    const total = await prisma.sMSCampaign.count({ where });

    const campaigns = await prisma.sMSCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        template: true,
        _count: {
          select: { logs: true },
        },
      },
    });

    const formattedCampaigns = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      template: c.template ? {
        id: c.template.id,
        name: c.template.name,
      } : null,
      recipientCount: JSON.parse(c.recipients).length,
      messageCount: c._count.logs,
      status: c.status,
      scheduledFor: c.scheduledFor,
      startedAt: c.startedAt,
      completedAt: c.completedAt,
      createdAt: c.createdAt,
    }));

    res.json({
      campaigns: formattedCampaigns,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get SMS campaigns error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch campaigns',
    });
  }
};

/**
 * GET /api/v1/sms/campaigns/:id
 * Get campaign details
 */
export const getCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const campaignId = req.params.id;

    const campaign = await prisma.sMSCampaign.findFirst({
      where: {
        id: campaignId,
        userId,
      },
      include: {
        template: true,
        _count: {
          select: { logs: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
      });
    }

    res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        template: campaign.template ? {
          id: campaign.template.id,
          name: campaign.template.name,
          content: campaign.template.content,
        } : null,
        recipients: JSON.parse(campaign.recipients),
        recipientCount: JSON.parse(campaign.recipients).length,
        messageCount: campaign._count.logs,
        status: campaign.status,
        scheduledFor: campaign.scheduledFor,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        createdAt: campaign.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get SMS campaign error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch campaign',
    });
  }
};

/**
 * POST /api/v1/sms/campaigns/:id/send
 * Send campaign
 */
export const sendCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const campaignId = req.params.id;

    const result = await smsService.sendCampaign(campaignId, userId);

    if (!result.success) {
      return res.status(400).json({
        error: 'Send Campaign Error',
        message: result.error || 'Failed to send campaign',
      });
    }

    res.json({
      success: true,
      message: 'Campaign sent successfully',
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    logger.error('Send SMS campaign error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send campaign',
    });
  }
};

/**
 * GET /api/v1/sms/campaigns/:id/logs
 * Get campaign logs
 */
export const getCampaignLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const campaignId = req.params.id;
    const { status, limit: limitParam, offset: offsetParam } = req.query;

    const limit = parseLimitParam(limitParam);
    const offset = parseOffsetParam(offsetParam);

    // Verify campaign belongs to user
    const campaign = await prisma.sMSCampaign.findFirst({
      where: {
        id: campaignId,
        userId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
      });
    }

    const where: any = { campaignId };

    if (status) {
      where.status = status as SMSLogStatus;
    }

    const total = await prisma.sMSLog.count({ where });

    const logs = await prisma.sMSLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    res.json({
      logs: logs.map((log) => ({
        id: log.id,
        phoneNumber: log.phoneNumber,
        message: log.message,
        status: log.status,
        messageId: log.messageId,
        sentAt: log.sentAt,
        deliveredAt: log.deliveredAt,
        error: log.error,
        createdAt: log.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get SMS campaign logs error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch campaign logs',
    });
  }
};

/**
 * GET /api/v1/sms/contacts
 * Get all phone contacts
 */
export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { search, optedIn, limit: limitParam, offset: offsetParam } = req.query;

    const limit = parseLimitParam(limitParam);
    const offset = parseOffsetParam(offsetParam);

    const where: any = { userId };

    if (optedIn !== undefined) {
      where.isOptedIn = optedIn === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phoneNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.phoneNumber.count({ where });

    const contacts = await prisma.phoneNumber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    res.json({
      contacts: contacts.map((c) => ({
        id: c.id,
        phoneNumber: c.phoneNumber,
        name: c.name,
        isVerified: c.isVerified,
        verifiedAt: c.verifiedAt,
        isOptedIn: c.isOptedIn,
        optedOutAt: c.optedOutAt,
        notes: c.notes,
        createdAt: c.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get SMS contacts error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch contacts',
    });
  }
};

/**
 * POST /api/v1/sms/contacts
 * Add a new contact
 */
export const addContact = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = addContactSchema.parse(req.body);

    const formattedPhone = formatPhoneNumber(data.phoneNumber);

    if (!validatePhoneNumber(formattedPhone)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid phone number format. Please use E.164 format (e.g., +14155552671)',
      });
    }

    // Check if contact already exists
    const existingContact = await prisma.phoneNumber.findFirst({
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

    const contact = await prisma.phoneNumber.create({
      data: {
        userId,
        phoneNumber: formattedPhone,
        name: data.name,
        notes: data.notes,
        isOptedIn: true,
      },
    });

    res.status(201).json({
      success: true,
      contact: {
        id: contact.id,
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        isVerified: contact.isVerified,
        isOptedIn: contact.isOptedIn,
        notes: contact.notes,
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
    logger.error('Add SMS contact error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add contact',
    });
  }
};

/**
 * PUT /api/v1/sms/contacts/:id
 * Update contact
 */
export const updateContact = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = req.params.id;
    const data = addContactSchema.partial().parse(req.body);

    const contact = await prisma.phoneNumber.findFirst({
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

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.notes !== undefined) updateData.notes = data.notes;
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

    const updatedContact = await prisma.phoneNumber.update({
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
    logger.error('Update SMS contact error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update contact',
    });
  }
};

/**
 * DELETE /api/v1/sms/contacts/:id
 * Delete contact
 */
export const deleteContact = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = req.params.id;

    const contact = await prisma.phoneNumber.findFirst({
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

    await prisma.phoneNumber.delete({
      where: { id: contactId },
    });

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    logger.error('Delete SMS contact error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete contact',
    });
  }
};

/**
 * POST /api/v1/sms/unsubscribe
 * Handle unsubscribe request
 */
export const handleUnsubscribe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = unsubscribeSchema.parse(req.body);

    const result = await smsService.handleUnsubscribe(data.phoneNumber);

    if (!result.success) {
      return res.status(400).json({
        error: 'Unsubscribe Error',
        message: result.error || 'Failed to process unsubscribe',
      });
    }

    res.json({
      success: true,
      message: 'Phone number unsubscribed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Unsubscribe error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process unsubscribe',
    });
  }
};

/**
 * POST /api/v1/sms/webhook
 * Webhook endpoint for receiving SMS from Twilio (no auth required)
 */
export const webhookHandler = async (req: any, res: Response) => {
  try {
    const data = req.body;

    logger.info('SMS webhook received', {
      from: data.From,
      to: data.To,
      body: data.Body,
    });

    // Handle incoming message
    if (data.From && data.Body) {
      await smsService.receiveInboundSMS(data);
    }

    // Handle status callback
    if (data.MessageSid && data.MessageStatus) {
      await smsService.updateMessageStatus(data.MessageSid, data.MessageStatus);
    }

    // Respond with TwiML (required by Twilio)
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    logger.error('SMS webhook error:', error instanceof Error ? error : new Error(String(error)));
    // Still respond with success to Twilio to avoid retries
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
};

import nodemailer from 'nodemailer';
import { EmailStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  userId?: string;
  sequenceId?: string;
}

interface EmailTemplateData {
  name: string;
  subject: string;
  htmlBody: string;
  variables?: string[];
}

interface EmailSequenceData {
  name: string;
  steps: EmailSequenceStep[];
  trigger: string;
  isActive: boolean;
}

interface EmailSequenceStep {
  delay: number; // Delay in hours
  templateId?: string;
  subject: string;
  body: string;
}

// Rate limiting map: domain -> array of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_EMAILS = 10; // Max 10 emails per minute per domain

// Unsubscribe tracking
const unsubscribeList = new Set<string>();

export class EmailService {
  private static transporter: nodemailer.Transporter;

  /**
   * Initialize email transporter
   */
  static initialize(): void {
    // Use SMTP configuration from environment variables
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };

    this.transporter = nodemailer.createTransporter(smtpConfig);

    logger.info('Email service initialized', {
      host: smtpConfig.host,
      port: smtpConfig.port,
    });
  }

  /**
   * Get or create transporter
   */
  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.initialize();
    }
    return this.transporter;
  }

  /**
   * Check rate limit for domain
   */
  private static checkRateLimit(email: string): boolean {
    const domain = email.split('@')[1];
    const now = Date.now();
    const timestamps = rateLimitMap.get(domain) || [];

    // Remove timestamps outside the window
    const recentTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW);

    if (recentTimestamps.length >= RATE_LIMIT_MAX_EMAILS) {
      logger.warn('Rate limit exceeded for domain', { domain });
      return false;
    }

    // Add current timestamp and update map
    recentTimestamps.push(now);
    rateLimitMap.set(domain, recentTimestamps);

    return true;
  }

  /**
   * Check if email is unsubscribed
   */
  static isUnsubscribed(email: string): boolean {
    return unsubscribeList.has(email.toLowerCase());
  }

  /**
   * Add email to unsubscribe list
   */
  static unsubscribe(email: string): void {
    unsubscribeList.add(email.toLowerCase());
    logger.info('Email unsubscribed', { email });
  }

  /**
   * Send an email
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text, userId, sequenceId } = options;

    // Check if email is unsubscribed
    if (this.isUnsubscribed(to)) {
      logger.warn('Email is unsubscribed', { to });
      return false;
    }

    // Check rate limit
    if (!this.checkRateLimit(to)) {
      throw new Error('Rate limit exceeded for this domain');
    }

    try {
      const transporter = this.getTransporter();

      // Add unsubscribe link to HTML
      const unsubscribeLink = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/emails/unsubscribe?email=${encodeURIComponent(to)}`;
      const htmlWithUnsubscribe = `
        ${html}
        <br><br>
        <hr>
        <p style="font-size: 12px; color: #666;">
          <a href="${unsubscribeLink}" style="color: #666;">Unsubscribe</a> from these emails
        </p>
      `;

      // Send email
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        html: htmlWithUnsubscribe,
      });

      // Log successful email
      await prisma.emailLog.create({
        data: {
          sequenceId,
          recipientEmail: to,
          subject,
          status: 'SENT',
        },
      });

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: info.messageId,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Email send error:', {
        error: errorMessage,
        to,
        subject,
      });

      // Log failed email
      await prisma.emailLog.create({
        data: {
          sequenceId,
          recipientEmail: to,
          subject,
          status: 'FAILED',
          error: errorMessage,
        },
      });

      throw error;
    }
  }

  /**
   * Send email using template
   */
  static async sendTemplateEmail(
    userId: string,
    templateId: string,
    to: string,
    variables: Record<string, any> = {}
  ): Promise<boolean> {
    // Get template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Replace variables in subject and body
    const subject = this.replaceVariables(template.subject, variables);
    const html = this.replaceVariables(template.htmlBody, variables);

    return await this.sendEmail({
      to,
      subject,
      html,
      userId,
    });
  }

  /**
   * Replace variables in template
   */
  private static replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * Create email template
   */
  static async createTemplate(userId: string, data: EmailTemplateData): Promise<any> {
    const template = await prisma.emailTemplate.create({
      data: {
        userId,
        name: data.name,
        subject: data.subject,
        htmlBody: data.htmlBody,
        variables: data.variables ? JSON.stringify(data.variables) : null,
      },
    });

    return {
      id: template.id,
      name: template.name,
      subject: template.subject,
      htmlBody: template.htmlBody,
      variables: template.variables ? JSON.parse(template.variables) : [],
      createdAt: template.createdAt,
    };
  }

  /**
   * Get templates for a user
   */
  static async getUserTemplates(userId: string): Promise<any[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      subject: template.subject,
      htmlBody: template.htmlBody,
      variables: template.variables ? JSON.parse(template.variables) : [],
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }));
  }

  /**
   * Update email template
   */
  static async updateTemplate(
    userId: string,
    templateId: string,
    data: Partial<EmailTemplateData>
  ): Promise<boolean> {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      return false;
    }

    await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.subject && { subject: data.subject }),
        ...(data.htmlBody && { htmlBody: data.htmlBody }),
        ...(data.variables && { variables: JSON.stringify(data.variables) }),
      },
    });

    return true;
  }

  /**
   * Delete email template
   */
  static async deleteTemplate(userId: string, templateId: string): Promise<boolean> {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      return false;
    }

    await prisma.emailTemplate.delete({
      where: { id: templateId },
    });

    return true;
  }

  /**
   * Create email sequence
   */
  static async createSequence(userId: string, data: EmailSequenceData): Promise<any> {
    const sequence = await prisma.emailSequence.create({
      data: {
        userId,
        name: data.name,
        steps: JSON.stringify(data.steps),
        trigger: data.trigger,
        isActive: data.isActive,
      },
    });

    return {
      id: sequence.id,
      name: sequence.name,
      steps: JSON.parse(sequence.steps),
      trigger: sequence.trigger,
      isActive: sequence.isActive,
      createdAt: sequence.createdAt,
    };
  }

  /**
   * Get sequences for a user
   */
  static async getUserSequences(userId: string): Promise<any[]> {
    const sequences = await prisma.emailSequence.findMany({
      where: { userId },
      include: {
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sequences.map((sequence) => ({
      id: sequence.id,
      name: sequence.name,
      steps: JSON.parse(sequence.steps),
      trigger: sequence.trigger,
      isActive: sequence.isActive,
      emailsSent: sequence._count.logs,
      createdAt: sequence.createdAt,
      updatedAt: sequence.updatedAt,
    }));
  }

  /**
   * Update email sequence
   */
  static async updateSequence(
    userId: string,
    sequenceId: string,
    data: Partial<EmailSequenceData>
  ): Promise<boolean> {
    const sequence = await prisma.emailSequence.findFirst({
      where: {
        id: sequenceId,
        userId,
      },
    });

    if (!sequence) {
      return false;
    }

    await prisma.emailSequence.update({
      where: { id: sequenceId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.steps && { steps: JSON.stringify(data.steps) }),
        ...(data.trigger && { trigger: data.trigger }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return true;
  }

  /**
   * Delete email sequence
   */
  static async deleteSequence(userId: string, sequenceId: string): Promise<boolean> {
    const sequence = await prisma.emailSequence.findFirst({
      where: {
        id: sequenceId,
        userId,
      },
    });

    if (!sequence) {
      return false;
    }

    await prisma.emailSequence.delete({
      where: { id: sequenceId },
    });

    return true;
  }

  /**
   * Get email logs
   */
  static async getEmailLogs(
    userId: string,
    filters: {
      sequenceId?: string;
      status?: EmailStatus;
      recipientEmail?: string;
    } = {},
    limit = 50,
    offset = 0
  ): Promise<any> {
    const where: any = {};

    // If filtering by sequence, verify ownership
    if (filters.sequenceId) {
      const sequence = await prisma.emailSequence.findFirst({
        where: {
          id: filters.sequenceId,
          userId,
        },
      });

      if (!sequence) {
        return null;
      }

      where.sequenceId = filters.sequenceId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.recipientEmail) {
      where.recipientEmail = {
        contains: filters.recipientEmail,
        mode: 'insensitive',
      };
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        include: {
          sequence: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.emailLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        sequenceId: log.sequenceId,
        sequenceName: log.sequence?.name,
        recipientEmail: log.recipientEmail,
        subject: log.subject,
        status: log.status,
        sentAt: log.sentAt,
        error: log.error,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Get email delivery statistics
   */
  static async getEmailStats(userId: string): Promise<any> {
    // Get user's sequences
    const sequences = await prisma.emailSequence.findMany({
      where: { userId },
      select: { id: true },
    });

    const sequenceIds = sequences.map((s) => s.id);

    if (sequenceIds.length === 0) {
      return {
        total: 0,
        sent: 0,
        failed: 0,
        bounced: 0,
      };
    }

    const stats = await prisma.emailLog.groupBy({
      by: ['status'],
      where: {
        sequenceId: {
          in: sequenceIds,
        },
      },
      _count: {
        status: true,
      },
    });

    const result = {
      total: 0,
      sent: 0,
      failed: 0,
      bounced: 0,
    };

    stats.forEach((stat) => {
      const count = stat._count.status;
      result.total += count;

      if (stat.status === 'SENT') {
        result.sent = count;
      } else if (stat.status === 'FAILED') {
        result.failed = count;
      } else if (stat.status === 'BOUNCED') {
        result.bounced = count;
      }
    });

    return result;
  }
}

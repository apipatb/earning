import nodemailer, { Transporter } from 'nodemailer';
import path from 'path';
import { logger } from './logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
}

interface MailerConfig {
  from: string;
  service?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class Mailer {
  private transporter: Transporter | null = null;
  private config: MailerConfig | null = null;
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '../templates/emails');
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';

      let config: MailerConfig | null = null;

      switch (emailProvider.toLowerCase()) {
        case 'gmail':
          config = this.getGmailConfig();
          break;
        case 'sendgrid':
          config = this.getSendGridConfig();
          break;
        case 'custom':
          config = this.getCustomSmtpConfig();
          break;
        default:
          logger.warn(`Unknown email provider: ${emailProvider}, using Gmail defaults`);
          config = this.getGmailConfig();
      }

      if (!config) {
        logger.warn('Email configuration is incomplete. Email sending may not work.');
        return;
      }

      this.config = config;
      this.transporter = nodemailer.createTransport(config);

      // Verify transporter connection
      this.transporter.verify((error: Error | null) => {
        if (error) {
          logger.error('Mailer configuration error:', error);
        } else {
          logger.info('Email service configured and ready to send');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize mailer:', error);
    }
  }

  private getGmailConfig(): MailerConfig | null {
    const user = process.env.GMAIL_USER;
    const password = process.env.GMAIL_APP_PASSWORD;

    if (!user || !password) {
      logger.warn('Gmail credentials not configured (GMAIL_USER, GMAIL_APP_PASSWORD)');
      return null;
    }

    return {
      from: user,
      service: 'gmail',
      auth: {
        user,
        pass: password,
      },
    };
  }

  private getSendGridConfig(): MailerConfig | null {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      logger.warn(
        'SendGrid credentials not configured (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL)'
      );
      return null;
    }

    return {
      from: fromEmail,
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: apiKey,
      },
    };
  }

  private getCustomSmtpConfig(): MailerConfig | null {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM_EMAIL;
    const secure = process.env.SMTP_SECURE === 'true';

    if (!host || !user || !pass || !fromEmail) {
      logger.warn('Custom SMTP credentials not configured');
      return null;
    }

    return {
      from: fromEmail,
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    };
  }

  /**
   * Send an email using Handlebars template
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter is not initialized');
      }

      if (!this.config) {
        throw new Error('Email configuration is missing');
      }

      // For testing purposes, if no transporter is available, log instead
      if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DATABASE === 'true') {
        logger.info(`[TEST MODE] Would send email:`, {
          to: options.to,
          subject: options.subject,
          template: options.template,
        });
        return;
      }

      const mailOptions = {
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html: this.renderTemplate(options.template, options.context || {}),
        attachments: options.attachments || [],
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send a raw HTML email (without template)
   */
  async sendRawEmail(
    to: string | string[],
    subject: string,
    html: string,
    attachments?: EmailOptions['attachments']
  ): Promise<void> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter is not initialized');
      }

      if (!this.config) {
        throw new Error('Email configuration is missing');
      }

      if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DATABASE === 'true') {
        logger.info(`[TEST MODE] Would send raw email:`, {
          to,
          subject,
        });
        return;
      }

      const mailOptions = {
        from: this.config.from,
        to,
        subject,
        html,
        attachments: attachments || [],
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Raw email sent successfully:', {
        messageId: info.messageId,
        to,
        subject,
      });
    } catch (error) {
      logger.error('Error sending raw email:', error);
      throw error;
    }
  }

  /**
   * Render Handlebars template
   */
  private renderTemplate(templateName: string, context: Record<string, any>): string {
    try {
      // Simple template rendering - in production, use handlebars-express
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

      // For now, return a basic HTML structure
      // In production, use handlebars to render actual templates
      const handlebars = require('handlebars');
      const fs = require('fs');

      if (!fs.existsSync(templatePath)) {
        logger.warn(`Template not found: ${templatePath}`);
        return `<html><body>${JSON.stringify(context)}</body></html>`;
      }

      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      logger.error(`Error rendering template ${templateName}:`, error);
      // Return fallback HTML
      return `<html><body>Email content template error</body></html>`;
    }
  }

  /**
   * Get mailer status
   */
  getStatus(): { configured: boolean; provider: string | null } {
    return {
      configured: !!this.transporter,
      provider: this.config?.service || this.config?.host || null,
    };
  }
}

export const mailer = new Mailer();

export default mailer;

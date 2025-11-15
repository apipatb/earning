import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface SendGridEmail {
  to: string;
  from: string;
  subject: string;
  html: string;
}

// Initialize SendGrid client
const sendEmail = async (email: SendGridEmail) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid key not set, skipping email');
      return true;
    }

    const response = await axios.post('https://api.sendgrid.com/v3/mail/send', {
      personalizations: [{ to: [{ email: email.to }] }],
      from: { email: email.from },
      subject: email.subject,
      content: [{ type: 'text/html', value: email.html }],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return response.status === 202;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

// Subscribe to newsletter
export const subscribeNewsletter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing?.isSubscribed) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { isSubscribed: true, updatedAt: new Date() },
      create: {
        email,
        name: name || 'Subscriber',
        isSubscribed: true,
        verificationToken: Math.random().toString(36).substr(2),
      },
    });

    // Send welcome email
    await sendEmail({
      to: email,
      from: 'noreply@earntrack.com',
      subject: 'Welcome to EarnTrack Newsletter! 🎉',
      html: `
        <h2>Welcome to EarnTrack, ${name || 'Friend'}!</h2>
        <p>You're now part of our community of ${(Math.random() * 10000 + 1000).toFixed(0)} earners.</p>
        <h3>What You'll Get:</h3>
        <ul>
          <li>💡 Weekly tips to boost your earnings</li>
          <li>📊 Platform performance benchmarks</li>
          <li>🎯 Goal-setting strategies</li>
          <li>💰 Exclusive deals & resources</li>
        </ul>
        <p><a href="https://earntrack.com" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visit EarnTrack</a></p>
      `,
    });

    res.json({
      message: 'Successfully subscribed to newsletter',
      subscriber
    });
  } catch (error) {
    next(error);
  }
};

// Unsubscribe from newsletter
export const unsubscribeNewsletter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    await prisma.newsletterSubscriber.update({
      where: { email },
      data: { isSubscribed: false },
    });

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    next(error);
  }
};

// Get newsletter settings
export const getNewsletterSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let settings = await prisma.emailSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.emailSettings.create({
        data: {
          userId,
          weeklyNewsletter: true,
          goalReminders: true,
          platformUpdates: true,
          promotions: false,
        },
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Update email settings
export const updateNewsletterSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { weeklyNewsletter, goalReminders, platformUpdates, promotions } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const settings = await prisma.emailSettings.upsert({
      where: { userId },
      update: {
        weeklyNewsletter,
        goalReminders,
        platformUpdates,
        promotions,
      },
      create: {
        userId,
        weeklyNewsletter: weeklyNewsletter ?? true,
        goalReminders: goalReminders ?? true,
        platformUpdates: platformUpdates ?? true,
        promotions: promotions ?? false,
      },
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Send weekly newsletter batch
export const sendWeeklyNewsletter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get all subscribed users with weekly newsletter enabled
    const subscribers = await prisma.emailSettings.findMany({
      where: { weeklyNewsletter: true },
      include: { user: true },
    });

    const topEarners = await prisma.earning.groupBy({
      by: ['userId'],
      _sum: { amount: true },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    });

    let sent = 0;
    let failed = 0;

    for (const setting of subscribers) {
      const weeklyTotal = await prisma.earning.aggregate({
        where: {
          userId: setting.userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: { amount: true },
      });

      const success = await sendEmail({
        to: setting.user.email,
        from: 'newsletter@earntrack.com',
        subject: `Your Weekly Earnings Report 📊`,
        html: `
          <h2>Your Weekly Earnings Report</h2>
          <h3>This Week: $${(weeklyTotal._sum.amount || 0).toFixed(2)}</h3>
          <p>Great progress, ${setting.user.name || 'Friend'}!</p>

          <h3>Top Earners This Week</h3>
          <ul>
            ${topEarners.slice(0, 3).map((earner, i) =>
              `<li>#${i + 1}: $${(earner._sum.amount || 0).toFixed(2)}</li>`
            ).join('')}
          </ul>

          <p><a href="https://earntrack.com/dashboard" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Full Dashboard</a></p>
        `,
      });

      if (success) sent++;
      else failed++;
    }

    res.json({
      message: 'Newsletter sent',
      sent,
      failed,
      total: subscribers.length,
    });
  } catch (error) {
    next(error);
  }
};

// Create email template
export const createTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { name, subject, content, type } = req.body;
    const tier = (req as any).tier;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check tier (Pro+ can create templates)
    if (tier === 'free') {
      return res.status(403).json({
        error: 'Upgrade to Pro to create email templates',
        requiredTier: 'pro',
      });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        userId,
        name,
        subject,
        content,
        type: type || 'custom',
      },
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
};

// Get templates
export const getTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    next(error);
  }
};

// Send bulk email
export const sendBulkEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { templateId, recipients, subject, content } = req.body;
    const tier = (req as any).tier;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check tier (Business+ can send bulk)
    if (tier !== 'business') {
      return res.status(403).json({
        error: 'Bulk email requires Business tier',
        requiredTier: 'business',
      });
    }

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const success = await sendEmail({
        to: recipient,
        from: 'campaigns@earntrack.com',
        subject,
        html: content,
      });

      if (success) sent++;
      else failed++;
    }

    // Log campaign
    await prisma.emailCampaign.create({
      data: {
        userId,
        templateId: templateId || undefined,
        subject,
        recipientCount: recipients.length,
        sentCount: sent,
        failedCount: failed,
      },
    });

    res.json({
      message: 'Bulk email sent',
      sent,
      failed,
      total: recipients.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get email stats
export const getEmailStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = {
      subscribers: await prisma.newsletterSubscriber.count({
        where: { isSubscribed: true },
      }),
      campaigns: await prisma.emailCampaign.count({ where: { userId } }),
      templates: await prisma.emailTemplate.count({ where: { userId } }),
      totalSent: await prisma.emailCampaign.aggregate({
        where: { userId },
        _sum: { sentCount: true },
      }),
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

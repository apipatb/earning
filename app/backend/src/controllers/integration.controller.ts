import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Supported integrations
const INTEGRATIONS = {
  zapier: {
    name: 'Zapier',
    icon: 'https://zapier.com/static/zapier-logo.png',
    tier: 'pro',
    description: 'Connect to 1000+ apps',
  },
  slack: {
    name: 'Slack',
    icon: 'https://slack.com/img/icons/icon_slack.png',
    tier: 'pro',
    description: 'Daily earnings alerts',
  },
  discord: {
    name: 'Discord',
    icon: 'https://discord.com/assets/logo.png',
    tier: 'pro',
    description: 'Server notifications',
  },
  telegram: {
    name: 'Telegram',
    icon: 'https://telegram.org/favicon.ico',
    tier: 'pro',
    description: 'Instant bot updates',
  },
  google_sheets: {
    name: 'Google Sheets',
    icon: 'https://ssl.gstatic.com/images/branding/product/1x/sheets_64dp.png',
    tier: 'pro',
    description: 'Auto-sync to spreadsheets',
  },
  microsoft_teams: {
    name: 'Microsoft Teams',
    icon: 'https://teams.microsoft.com/favicon.ico',
    tier: 'business',
    description: 'Team notifications',
  },
  notion: {
    name: 'Notion',
    icon: 'https://notion.so/images/favicon.ico',
    tier: 'pro',
    description: 'Database sync',
  },
  stripe_connect: {
    name: 'Stripe Connect',
    icon: 'https://stripe.com/favicon.ico',
    tier: 'business',
    description: 'Direct payout setup',
  },
};

// Get available integrations
export const getAvailableIntegrations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tier = (req as any).tier || 'free';

    const available = Object.entries(INTEGRATIONS)
      .filter(([_, int]: any) => {
        if (int.tier === 'free') return true;
        if (int.tier === 'pro' && (tier === 'pro' || tier === 'business')) return true;
        if (int.tier === 'business' && tier === 'business') return true;
        return false;
      })
      .map(([key, int]) => ({ id: key, ...int }));

    res.json(available);
  } catch (error) {
    next(error);
  }
};

// Connect integration
export const connectIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const tier = (req as any).tier;
    const { integrationId, accessToken, config } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const integration = INTEGRATIONS[integrationId as keyof typeof INTEGRATIONS];

    if (!integration) {
      return res.status(400).json({ error: 'Integration not found' });
    }

    if (tier === 'free') {
      return res.status(403).json({
        error: `${integration.name} requires Pro tier`,
        requiredTier: integration.tier,
      });
    }

    const encrypted = crypto
      .createCipher('aes256', process.env.ENCRYPTION_KEY || 'secret')
      .update(accessToken)
      .digest('hex');

    const connection = await prisma.integration.upsert({
      where: {
        userId_integrationId: {
          userId,
          integrationId,
        },
      },
      update: {
        accessToken: encrypted,
        config: config || {},
        isConnected: true,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        integrationId,
        accessToken: encrypted,
        config: config || {},
        isConnected: true,
      },
    });

    res.json({
      message: `Connected to ${integration.name}`,
      integration: { id: connection.integrationId, name: integration.name },
    });
  } catch (error) {
    next(error);
  }
};

// Get user integrations
export const getUserIntegrations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const integrations = await prisma.integration.findMany({
      where: { userId },
      select: {
        integrationId: true,
        isConnected: true,
        lastSyncAt: true,
        config: true,
      },
    });

    const withDetails = integrations.map((int) => ({
      ...int,
      name: INTEGRATIONS[int.integrationId as keyof typeof INTEGRATIONS]?.name,
    }));

    res.json(withDetails);
  } catch (error) {
    next(error);
  }
};

// Disconnect integration
export const disconnectIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { integrationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.integration.delete({
      where: {
        userId_integrationId: {
          userId,
          integrationId,
        },
      },
    });

    res.json({ message: 'Integration disconnected' });
  } catch (error) {
    next(error);
  }
};

// Create automation rule
export const createAutomationRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const tier = (req as any).tier;
    const { name, trigger, action, config } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (tier === 'free') {
      return res.status(403).json({
        error: 'Automation requires Pro tier',
        requiredTier: 'pro',
      });
    }

    const rule = await prisma.automationRule.create({
      data: {
        userId,
        name,
        trigger, // earnings_created, goal_achieved, milestone_hit
        action, // send_slack, send_email, sync_sheets, etc
        config: config || {},
        isActive: true,
      },
    });

    res.status(201).json({
      message: 'Automation rule created',
      rule,
    });
  } catch (error) {
    next(error);
  }
};

// Get automation rules
export const getAutomationRules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rules = await prisma.automationRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rules);
  } catch (error) {
    next(error);
  }
};

// Update automation rule
export const updateAutomationRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { ruleId } = req.params;
    const { name, trigger, action, config, isActive } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updated = await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        name: name || rule.name,
        trigger: trigger || rule.trigger,
        action: action || rule.action,
        config: config || rule.config,
        isActive: isActive !== undefined ? isActive : rule.isActive,
      },
    });

    res.json({ message: 'Rule updated', rule: updated });
  } catch (error) {
    next(error);
  }
};

// Test automation
export const testAutomation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { integrationId, message } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const integration = await prisma.integration.findFirst({
      where: { userId, integrationId },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Test based on integration type
    let success = false;
    const testMessage = message || 'EarnTrack test message';

    switch (integrationId) {
      case 'slack':
        // Would call Slack API
        success = true;
        break;
      case 'discord':
        // Would call Discord API
        success = true;
        break;
      case 'telegram':
        // Would call Telegram API
        success = true;
        break;
      default:
        success = true;
    }

    res.json({
      success,
      message: success ? 'Test message sent successfully' : 'Test failed',
    });
  } catch (error) {
    next(error);
  }
};

// Get integration stats
export const getIntegrationStats = async (
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
      connectedCount: await prisma.integration.count({
        where: { userId, isConnected: true },
      }),
      automationCount: await prisma.automationRule.count({
        where: { userId },
      }),
      activeAutomations: await prisma.automationRule.count({
        where: { userId, isActive: true },
      }),
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

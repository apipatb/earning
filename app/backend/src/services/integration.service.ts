import crypto from 'crypto';
import { IntegrationPlatform, SyncStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

// Retry configuration
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s
const MAX_RETRY_ATTEMPTS = 3;

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

interface WebhookPayload {
  action: string;
  timestamp: string;
  data: any;
}

interface SyncResult {
  success: boolean;
  recordCount: number;
  error?: string;
  data?: any;
}

/**
 * Platform-specific OAuth configurations
 */
const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  ZAPIER: {
    clientId: process.env.ZAPIER_CLIENT_ID || '',
    clientSecret: process.env.ZAPIER_CLIENT_SECRET || '',
    redirectUri: process.env.ZAPIER_REDIRECT_URI || '',
    authorizationUrl: 'https://zapier.com/oauth/authorize',
    tokenUrl: 'https://zapier.com/oauth/token',
    scopes: ['read', 'write'],
  },
  MAKE: {
    clientId: process.env.MAKE_CLIENT_ID || '',
    clientSecret: process.env.MAKE_CLIENT_SECRET || '',
    redirectUri: process.env.MAKE_REDIRECT_URI || '',
    authorizationUrl: 'https://www.make.com/oauth/authorize',
    tokenUrl: 'https://www.make.com/oauth/token',
    scopes: ['scenarios:read', 'scenarios:write'],
  },
  SLACK: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: process.env.SLACK_REDIRECT_URI || '',
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'users:read'],
  },
  TEAMS: {
    clientId: process.env.TEAMS_CLIENT_ID || '',
    clientSecret: process.env.TEAMS_CLIENT_SECRET || '',
    redirectUri: process.env.TEAMS_REDIRECT_URI || '',
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['ChannelMessage.Send', 'Team.ReadBasic.All'],
  },
};

export class IntegrationService {
  /**
   * Generate OAuth authorization URL
   */
  static generateAuthUrl(platform: IntegrationPlatform, state: string): string {
    const config = OAUTH_CONFIGS[platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state,
      response_type: 'code',
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    platform: IntegrationPlatform,
    code: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    const config = OAUTH_CONFIGS[platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Refresh OAuth access token
   */
  static async refreshAccessToken(integrationId: string): Promise<string> {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.refreshToken) {
      throw new Error('Integration not found or no refresh token available');
    }

    const config = OAUTH_CONFIGS[integration.platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${integration.platform}`);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: integration.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth token refresh failed: ${error}`);
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token || integration.refreshToken;
    const expiresIn = data.expires_in;

    // Update integration with new tokens
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenExpiry: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      },
    });

    return newAccessToken;
  }

  /**
   * Connect a new integration
   */
  static async connectIntegration(
    userId: string,
    platform: IntegrationPlatform,
    authCode: string,
    webhookUrl?: string
  ): Promise<any> {
    // Exchange code for token
    const tokenData = await this.exchangeCodeForToken(platform, authCode);

    // Generate API key for additional security
    const apiKey = crypto.randomBytes(32).toString('hex');

    // Calculate token expiry
    const tokenExpiry = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null;

    // Create or update integration
    const integration = await prisma.integration.upsert({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
      update: {
        apiKey,
        webhookUrl,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiry,
        isActive: true,
      },
      create: {
        userId,
        platform,
        apiKey,
        webhookUrl,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiry,
        isActive: true,
      },
    });

    // Log successful connection
    await this.createSyncLog(integration.id, 'CONNECT', 'SUCCESS', 1);

    return {
      id: integration.id,
      platform: integration.platform,
      isActive: integration.isActive,
      webhookUrl: integration.webhookUrl,
      createdAt: integration.createdAt,
    };
  }

  /**
   * Disconnect integration
   */
  static async disconnectIntegration(userId: string, integrationId: string): Promise<boolean> {
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        userId,
      },
    });

    if (!integration) {
      return false;
    }

    await prisma.integration.update({
      where: { id: integrationId },
      data: { isActive: false },
    });

    // Log disconnection
    await this.createSyncLog(integrationId, 'DISCONNECT', 'SUCCESS', 0);

    return true;
  }

  /**
   * Get user integrations
   */
  static async getUserIntegrations(userId: string): Promise<any[]> {
    const integrations = await prisma.integration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { syncLogs: true },
        },
      },
    });

    return integrations.map((integration) => ({
      id: integration.id,
      platform: integration.platform,
      isActive: integration.isActive,
      lastSync: integration.lastSync,
      webhookUrl: integration.webhookUrl,
      syncCount: integration._count.syncLogs,
      createdAt: integration.createdAt,
    }));
  }

  /**
   * Test integration connection
   */
  static async testConnection(userId: string, integrationId: string): Promise<SyncResult> {
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        userId,
      },
    });

    if (!integration) {
      return {
        success: false,
        recordCount: 0,
        error: 'Integration not found',
      };
    }

    try {
      // Check if token is expired and refresh if needed
      if (integration.tokenExpiry && new Date() >= integration.tokenExpiry) {
        await this.refreshAccessToken(integrationId);
      }

      // Platform-specific test
      const testResult = await this.platformSpecificTest(integration);

      await this.createSyncLog(
        integrationId,
        'TEST_CONNECTION',
        testResult.success ? 'SUCCESS' : 'FAILED',
        testResult.recordCount,
        testResult.error
      );

      return testResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.createSyncLog(integrationId, 'TEST_CONNECTION', 'FAILED', 0, errorMessage);

      return {
        success: false,
        recordCount: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Platform-specific test implementation
   */
  private static async platformSpecificTest(integration: any): Promise<SyncResult> {
    switch (integration.platform) {
      case 'ZAPIER':
        return this.testZapier(integration);
      case 'MAKE':
        return this.testMake(integration);
      case 'SLACK':
        return this.testSlack(integration);
      case 'TEAMS':
        return this.testTeams(integration);
      default:
        return {
          success: false,
          recordCount: 0,
          error: 'Unsupported platform',
        };
    }
  }

  /**
   * Manual sync operation
   */
  static async syncData(
    userId: string,
    integrationId: string,
    action: string,
    data: any
  ): Promise<SyncResult> {
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        userId,
      },
    });

    if (!integration) {
      return {
        success: false,
        recordCount: 0,
        error: 'Integration not found',
      };
    }

    if (!integration.isActive) {
      return {
        success: false,
        recordCount: 0,
        error: 'Integration is not active',
      };
    }

    try {
      // Check if token is expired and refresh if needed
      if (integration.tokenExpiry && new Date() >= integration.tokenExpiry) {
        await this.refreshAccessToken(integrationId);
      }

      // Perform platform-specific sync
      const result = await this.performSync(integration, action, data);

      await this.createSyncLog(
        integrationId,
        action,
        result.success ? 'SUCCESS' : 'FAILED',
        result.recordCount,
        result.error,
        JSON.stringify(data),
        JSON.stringify(result.data)
      );

      // Update last sync time
      await prisma.integration.update({
        where: { id: integrationId },
        data: { lastSync: new Date() },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.createSyncLog(
        integrationId,
        action,
        'FAILED',
        0,
        errorMessage,
        JSON.stringify(data)
      );

      return {
        success: false,
        recordCount: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Perform platform-specific sync
   */
  private static async performSync(
    integration: any,
    action: string,
    data: any
  ): Promise<SyncResult> {
    switch (integration.platform) {
      case 'ZAPIER':
        return this.syncZapier(integration, action, data);
      case 'MAKE':
        return this.syncMake(integration, action, data);
      case 'SLACK':
        return this.syncSlack(integration, action, data);
      case 'TEAMS':
        return this.syncTeams(integration, action, data);
      default:
        return {
          success: false,
          recordCount: 0,
          error: 'Unsupported platform',
        };
    }
  }

  /**
   * Transform data for specific platform
   */
  static transformDataForPlatform(
    platform: IntegrationPlatform,
    action: string,
    data: any
  ): any {
    switch (platform) {
      case 'ZAPIER':
        return this.transformForZapier(action, data);
      case 'MAKE':
        return this.transformForMake(action, data);
      case 'SLACK':
        return this.transformForSlack(action, data);
      case 'TEAMS':
        return this.transformForTeams(action, data);
      default:
        return data;
    }
  }

  /**
   * Zapier-specific implementations
   */
  private static async testZapier(integration: any): Promise<SyncResult> {
    if (!integration.webhookUrl) {
      return {
        success: false,
        recordCount: 0,
        error: 'Webhook URL not configured',
      };
    }

    try {
      const response = await fetch(integration.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': integration.apiKey,
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: response.ok,
        recordCount: 1,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async syncZapier(
    integration: any,
    action: string,
    data: any
  ): Promise<SyncResult> {
    if (!integration.webhookUrl) {
      return {
        success: false,
        recordCount: 0,
        error: 'Webhook URL not configured',
      };
    }

    const transformedData = this.transformForZapier(action, data);

    const response = await fetch(integration.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': integration.apiKey,
        'X-Action': action,
      },
      body: JSON.stringify(transformedData),
    });

    if (!response.ok) {
      throw new Error(`Zapier sync failed: HTTP ${response.status}`);
    }

    return {
      success: true,
      recordCount: Array.isArray(data) ? data.length : 1,
      data: await response.json(),
    };
  }

  private static transformForZapier(action: string, data: any): any {
    return {
      action,
      timestamp: new Date().toISOString(),
      payload: data,
    };
  }

  /**
   * Make.com-specific implementations
   */
  private static async testMake(integration: any): Promise<SyncResult> {
    if (!integration.webhookUrl) {
      return {
        success: false,
        recordCount: 0,
        error: 'Webhook URL not configured',
      };
    }

    try {
      const response = await fetch(integration.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: response.ok,
        recordCount: 1,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async syncMake(
    integration: any,
    action: string,
    data: any
  ): Promise<SyncResult> {
    if (!integration.webhookUrl) {
      return {
        success: false,
        recordCount: 0,
        error: 'Webhook URL not configured',
      };
    }

    const transformedData = this.transformForMake(action, data);

    const response = await fetch(integration.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData),
    });

    if (!response.ok) {
      throw new Error(`Make sync failed: HTTP ${response.status}`);
    }

    return {
      success: true,
      recordCount: Array.isArray(data) ? data.length : 1,
      data: await response.json(),
    };
  }

  private static transformForMake(action: string, data: any): any {
    return {
      action,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  /**
   * Slack-specific implementations
   */
  private static async testSlack(integration: any): Promise<SyncResult> {
    if (!integration.accessToken) {
      return {
        success: false,
        recordCount: 0,
        error: 'Access token not available',
      };
    }

    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      });

      const result = await response.json();

      return {
        success: result.ok,
        recordCount: 1,
        error: result.ok ? undefined : result.error,
      };
    } catch (error) {
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async syncSlack(
    integration: any,
    action: string,
    data: any
  ): Promise<SyncResult> {
    if (!integration.accessToken) {
      return {
        success: false,
        recordCount: 0,
        error: 'Access token not available',
      };
    }

    const transformedData = this.transformForSlack(action, data);
    const config = JSON.parse(integration.config || '{}');
    const channel = config.defaultChannel || '#general';

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${integration.accessToken}`,
      },
      body: JSON.stringify({
        channel,
        text: transformedData.text,
        blocks: transformedData.blocks,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Slack sync failed: ${result.error}`);
    }

    return {
      success: true,
      recordCount: 1,
      data: result,
    };
  }

  private static transformForSlack(action: string, data: any): any {
    let text = '';
    const blocks: any[] = [];

    switch (action) {
      case 'CREATE_EARNING':
        text = `New earning: $${data.amount} from ${data.platform}`;
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*New Earning* \n Amount: $${data.amount} \n Platform: ${data.platform} \n Date: ${data.date}`,
          },
        });
        break;

      case 'CREATE_INVOICE':
        text = `New invoice: ${data.invoiceNumber} - $${data.totalAmount}`;
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*New Invoice* \n Invoice: ${data.invoiceNumber} \n Amount: $${data.totalAmount} \n Due: ${data.dueDate}`,
          },
        });
        break;

      default:
        text = `Action: ${action}`;
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${action}*\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\``,
          },
        });
    }

    return { text, blocks };
  }

  /**
   * Microsoft Teams-specific implementations
   */
  private static async testTeams(integration: any): Promise<SyncResult> {
    if (!integration.accessToken) {
      return {
        success: false,
        recordCount: 0,
        error: 'Access token not available',
      };
    }

    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      });

      return {
        success: response.ok,
        recordCount: 1,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        recordCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async syncTeams(
    integration: any,
    action: string,
    data: any
  ): Promise<SyncResult> {
    if (!integration.accessToken) {
      return {
        success: false,
        recordCount: 0,
        error: 'Access token not available',
      };
    }

    const transformedData = this.transformForTeams(action, data);
    const config = JSON.parse(integration.config || '{}');
    const teamId = config.teamId;
    const channelId = config.channelId;

    if (!teamId || !channelId) {
      return {
        success: false,
        recordCount: 0,
        error: 'Team ID or Channel ID not configured',
      };
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${integration.accessToken}`,
        },
        body: JSON.stringify(transformedData),
      }
    );

    if (!response.ok) {
      throw new Error(`Teams sync failed: HTTP ${response.status}`);
    }

    return {
      success: true,
      recordCount: 1,
      data: await response.json(),
    };
  }

  private static transformForTeams(action: string, data: any): any {
    let body: any = {
      body: {
        contentType: 'html',
        content: '',
      },
    };

    switch (action) {
      case 'CREATE_EARNING':
        body.body.content = `
          <h3>New Earning</h3>
          <p><strong>Amount:</strong> $${data.amount}</p>
          <p><strong>Platform:</strong> ${data.platform}</p>
          <p><strong>Date:</strong> ${data.date}</p>
        `;
        break;

      case 'CREATE_INVOICE':
        body.body.content = `
          <h3>New Invoice</h3>
          <p><strong>Invoice:</strong> ${data.invoiceNumber}</p>
          <p><strong>Amount:</strong> $${data.totalAmount}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
        `;
        break;

      default:
        body.body.content = `
          <h3>${action}</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
    }

    return body;
  }

  /**
   * Get sync logs for an integration
   */
  static async getSyncLogs(
    userId: string,
    integrationId: string,
    limit = 50,
    offset = 0
  ): Promise<any> {
    // Verify integration ownership
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        userId,
      },
    });

    if (!integration) {
      return null;
    }

    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where: { integrationId },
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.syncLog.count({ where: { integrationId } }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        status: log.status,
        recordCount: log.recordCount,
        error: log.error,
        executedAt: log.executedAt,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Create sync log entry
   */
  private static async createSyncLog(
    integrationId: string,
    action: string,
    status: 'SUCCESS' | 'FAILED' | 'PENDING',
    recordCount: number,
    error?: string,
    requestData?: string,
    responseData?: string
  ): Promise<void> {
    await prisma.syncLog.create({
      data: {
        integrationId,
        action,
        status,
        recordCount,
        error,
        requestData,
        responseData,
      },
    });
  }

  /**
   * Batch sync operations with retry logic
   */
  static async batchSync(
    userId: string,
    integrationId: string,
    action: string,
    dataArray: any[]
  ): Promise<SyncResult> {
    const results: any[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const data of dataArray) {
      try {
        const result = await this.syncData(userId, integrationId, action, data);
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        results.push(result);
      } catch (error) {
        failureCount++;
        results.push({
          success: false,
          recordCount: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: failureCount === 0,
      recordCount: successCount,
      error: failureCount > 0 ? `${failureCount} of ${dataArray.length} items failed` : undefined,
      data: results,
    };
  }

  /**
   * Process incoming webhook data
   */
  static async processIncomingWebhook(
    platform: IntegrationPlatform,
    apiKey: string,
    payload: any
  ): Promise<SyncResult> {
    // Find integration by API key and platform
    const integration = await prisma.integration.findFirst({
      where: {
        platform,
        apiKey,
        isActive: true,
      },
    });

    if (!integration) {
      return {
        success: false,
        recordCount: 0,
        error: 'Invalid API key or integration not active',
      };
    }

    try {
      // Process webhook based on action type
      const action = payload.action || 'WEBHOOK_RECEIVED';
      const data = payload.data || payload;

      // Handle specific webhook actions
      let result: any;
      switch (action) {
        case 'CREATE_EARNING':
          result = await this.createEarningFromWebhook(integration.userId, data);
          break;
        case 'CREATE_INVOICE':
          result = await this.createInvoiceFromWebhook(integration.userId, data);
          break;
        case 'SYNC_CUSTOMERS':
          result = await this.syncCustomersFromWebhook(integration.userId, data);
          break;
        default:
          result = { id: 'processed', message: 'Webhook received' };
      }

      await this.createSyncLog(
        integration.id,
        action,
        'SUCCESS',
        1,
        undefined,
        JSON.stringify(payload),
        JSON.stringify(result)
      );

      return {
        success: true,
        recordCount: 1,
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.createSyncLog(
        integration.id,
        'WEBHOOK_RECEIVED',
        'FAILED',
        0,
        errorMessage,
        JSON.stringify(payload)
      );

      return {
        success: false,
        recordCount: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Create earning from webhook data
   */
  private static async createEarningFromWebhook(userId: string, data: any): Promise<any> {
    // Get or create platform
    let platform = await prisma.platform.findFirst({
      where: {
        userId,
        name: data.platformName || 'Integration',
      },
    });

    if (!platform) {
      platform = await prisma.platform.create({
        data: {
          userId,
          name: data.platformName || 'Integration',
          category: 'OTHER',
        },
      });
    }

    // Create earning
    const earning = await prisma.earning.create({
      data: {
        userId,
        platformId: platform.id,
        date: new Date(data.date || new Date()),
        amount: parseFloat(data.amount),
        hours: data.hours ? parseFloat(data.hours) : null,
        notes: data.notes || 'Created via integration',
      },
    });

    return earning;
  }

  /**
   * Create invoice from webhook data
   */
  private static async createInvoiceFromWebhook(userId: string, data: any): Promise<any> {
    // Get or create customer if provided
    let customerId = null;
    if (data.customer && data.customer.email) {
      let customer = await prisma.customer.findFirst({
        where: {
          userId,
          email: data.customer.email,
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            userId,
            name: data.customer.name,
            email: data.customer.email,
            phone: data.customer.phone,
          },
        });
      }

      customerId = customer.id;
    }

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const invoiceNumber = data.invoiceNumber || `INV-${Date.now()}`;

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        customerId,
        invoiceNumber,
        subtotal: parseFloat(data.subtotal),
        taxAmount: data.taxAmount ? parseFloat(data.taxAmount) : 0,
        discountAmount: data.discountAmount ? parseFloat(data.discountAmount) : 0,
        totalAmount: parseFloat(data.totalAmount),
        invoiceDate: new Date(data.invoiceDate || new Date()),
        dueDate: new Date(data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        status: data.status || 'DRAFT',
      },
    });

    // Create line items if provided
    if (data.lineItems && Array.isArray(data.lineItems)) {
      for (const item of data.lineItems) {
        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            totalPrice: parseFloat(item.totalPrice || item.quantity * item.unitPrice),
          },
        });
      }
    }

    return invoice;
  }

  /**
   * Sync customers from webhook data
   */
  private static async syncCustomersFromWebhook(userId: string, data: any): Promise<any> {
    const customers = Array.isArray(data) ? data : [data];
    const results = [];

    for (const customerData of customers) {
      const customer = await prisma.customer.upsert({
        where: {
          userId_email: {
            userId,
            email: customerData.email,
          },
        },
        update: {
          name: customerData.name,
          phone: customerData.phone,
          company: customerData.company,
          address: customerData.address,
          city: customerData.city,
          country: customerData.country,
        },
        create: {
          userId,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          company: customerData.company,
          address: customerData.address,
          city: customerData.city,
          country: customerData.country,
        },
      });

      results.push(customer);
    }

    return {
      count: results.length,
      customers: results,
    };
  }
}

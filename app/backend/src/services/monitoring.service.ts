import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

export interface MonitoringMetrics {
  activeChats: number;
  pendingTickets: number;
  avgResponseTime: number; // in seconds
  totalTicketsToday: number;
  resolvedToday: number;
  avgResolutionTime: number; // in minutes
  customerSatisfaction: number; // percentage
  timestamp: Date;
}

export interface TeamMemberStatus {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  activeChats: number;
  totalChatsToday: number;
  avgResponseTime: number;
  lastActivity: Date;
}

export interface SLAStatus {
  totalTickets: number;
  withinSLA: number;
  breachedSLA: number;
  atRisk: number;
  slaPercentage: number;
  avgResolutionTime: number;
  targetResolutionTime: number; // in minutes
}

export interface QueueStatus {
  waiting: number;
  inProgress: number;
  avgWaitTime: number; // in minutes
  longestWaitTime: number; // in minutes
  queuedTickets: Array<{
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    waitTime: number;
    customerId: string;
    customerName: string;
  }>;
}

export interface PerformanceMetrics {
  period: string;
  totalChats: number;
  totalMessages: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  firstResponseTime: number;
  customerSatisfaction: number;
  chatsByHour: Array<{ hour: number; count: number }>;
  responseTimeByAgent: Array<{ agentId: string; agentName: string; avgTime: number }>;
  topIssues: Array<{ issue: string; count: number }>;
}

class MonitoringService {
  /**
   * Get real-time monitoring metrics
   */
  async getLiveMetrics(userId?: string): Promise<MonitoringMetrics> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last15Minutes = new Date(now.getTime() - 15 * 60 * 1000);
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Active chats (conversations with messages in the last 15 minutes)
      const activeChatsCount = await prisma.chatConversation.count({
        where: {
          ...(userId && { userId }),
          messages: {
            some: {
              createdAt: {
                gte: last15Minutes,
              },
            },
          },
        },
      });

      // Pending tickets (conversations with last message from user, not assistant)
      const pendingTickets = await prisma.chatConversation.findMany({
        where: {
          ...(userId && { userId }),
          updatedAt: {
            gte: last24Hours,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const pendingCount = pendingTickets.filter(
        conv => conv.messages[0]?.role === 'USER'
      ).length;

      // Total tickets today
      const totalTicketsToday = await prisma.chatConversation.count({
        where: {
          ...(userId && { userId }),
          createdAt: {
            gte: todayStart,
          },
        },
      });

      // Calculate average response time
      const recentMessages = await prisma.chatMessage.findMany({
        where: {
          createdAt: {
            gte: last24Hours,
          },
          conversation: {
            ...(userId && { userId }),
          },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          conversation: true,
        },
      });

      let totalResponseTime = 0;
      let responseCount = 0;

      // Group messages by conversation
      const conversationMessages = recentMessages.reduce((acc, msg) => {
        if (!acc[msg.conversationId]) {
          acc[msg.conversationId] = [];
        }
        acc[msg.conversationId].push(msg);
        return acc;
      }, {} as Record<string, typeof recentMessages>);

      // Calculate response times
      for (const messages of Object.values(conversationMessages)) {
        for (let i = 1; i < messages.length; i++) {
          if (messages[i - 1].role === 'USER' && messages[i].role === 'ASSISTANT') {
            const responseTime =
              messages[i].createdAt.getTime() - messages[i - 1].createdAt.getTime();
            totalResponseTime += responseTime;
            responseCount++;
          }
        }
      }

      const avgResponseTime = responseCount > 0
        ? Math.round(totalResponseTime / responseCount / 1000) // Convert to seconds
        : 0;

      // Resolved tickets today (conversations with last message from assistant)
      const resolvedToday = pendingTickets.filter(
        conv => conv.messages[0]?.role === 'ASSISTANT'
      ).length;

      // Calculate average resolution time
      const resolvedConversations = await prisma.chatConversation.findMany({
        where: {
          ...(userId && { userId }),
          createdAt: {
            gte: todayStart,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      let totalResolutionTime = 0;
      let resolutionCount = 0;

      for (const conv of resolvedConversations) {
        if (conv.messages.length >= 2) {
          const firstMsg = conv.messages[0];
          const lastMsg = conv.messages[conv.messages.length - 1];

          if (lastMsg.role === 'ASSISTANT') {
            const resolutionTime =
              lastMsg.createdAt.getTime() - firstMsg.createdAt.getTime();
            totalResolutionTime += resolutionTime;
            resolutionCount++;
          }
        }
      }

      const avgResolutionTime = resolutionCount > 0
        ? Math.round(totalResolutionTime / resolutionCount / 60000) // Convert to minutes
        : 0;

      // Calculate real customer satisfaction from feedback ratings
      const customerSatisfaction = await this.calculateCustomerSatisfaction(userId, todayStart, now);

      return {
        activeChats: activeChatsCount,
        pendingTickets: pendingCount,
        avgResponseTime,
        totalTicketsToday,
        resolvedToday,
        avgResolutionTime,
        customerSatisfaction,
        timestamp: now,
      };
    } catch (error) {
      logger.error('Get live metrics error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get team member status
   */
  async getTeamStatus(userId?: string): Promise<TeamMemberStatus[]> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);
      const last15Minutes = new Date(now.getTime() - 15 * 60 * 1000);

      // Get all users (in a real app, you'd filter by role)
      const users = await prisma.user.findMany({
        where: userId ? { id: userId } : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          chatConversations: {
            where: {
              createdAt: {
                gte: todayStart,
              },
            },
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        take: 20, // Limit to 20 team members
      });

      // Calculate response times for all team members efficiently
      const teamStatus: TeamMemberStatus[] = await Promise.all(
        users.map(async (user) => {
          const activeChats = user.chatConversations.filter(
            conv => conv.messages[0]?.createdAt >= last15Minutes
          ).length;

          const lastActivity = user.chatConversations.reduce(
            (latest, conv) => {
              const msgDate = conv.messages[0]?.createdAt;
              return msgDate && msgDate > latest ? msgDate : latest;
            },
            new Date(0)
          );

          // Determine status based on last activity
          let status: TeamMemberStatus['status'] = 'offline';
          if (lastActivity >= last5Minutes) {
            status = activeChats > 3 ? 'busy' : 'online';
          } else if (lastActivity >= last15Minutes) {
            status = 'away';
          }

          // Calculate real average response time for this team member
          const avgResponseTime = await this.calculateTeamMemberResponseTime(user.id, todayStart, now);

          return {
            id: user.id,
            name: user.name || user.email.split('@')[0],
            email: user.email,
            status,
            activeChats,
            totalChatsToday: user.chatConversations.length,
            avgResponseTime,
            lastActivity,
          };
        })
      );

      return teamStatus;
    } catch (error) {
      logger.error('Get team status error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get SLA status and tracking
   */
  async getSLAStatus(userId?: string): Promise<SLAStatus> {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const targetResolutionTime = 60; // 60 minutes SLA

      // Get all conversations from last 24 hours
      const conversations = await prisma.chatConversation.findMany({
        where: {
          ...(userId && { userId }),
          createdAt: {
            gte: last24Hours,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      let withinSLA = 0;
      let breachedSLA = 0;
      let atRisk = 0;
      let totalResolutionTime = 0;
      let resolvedCount = 0;

      for (const conv of conversations) {
        if (conv.messages.length < 2) {
          continue;
        }

        const firstMsg = conv.messages[0];
        const lastMsg = conv.messages[conv.messages.length - 1];
        const resolutionTime = (lastMsg.createdAt.getTime() - firstMsg.createdAt.getTime()) / 60000; // minutes

        if (lastMsg.role === 'ASSISTANT') {
          // Ticket is resolved
          totalResolutionTime += resolutionTime;
          resolvedCount++;

          if (resolutionTime <= targetResolutionTime) {
            withinSLA++;
          } else {
            breachedSLA++;
          }
        } else {
          // Ticket still open
          const elapsedTime = (now.getTime() - firstMsg.createdAt.getTime()) / 60000;
          if (elapsedTime >= targetResolutionTime) {
            breachedSLA++;
          } else if (elapsedTime >= targetResolutionTime * 0.8) {
            atRisk++;
          } else {
            withinSLA++;
          }
        }
      }

      const totalTickets = conversations.length;
      const slaPercentage = totalTickets > 0
        ? Math.round((withinSLA / totalTickets) * 100)
        : 100;
      const avgResolutionTime = resolvedCount > 0
        ? Math.round(totalResolutionTime / resolvedCount)
        : 0;

      return {
        totalTickets,
        withinSLA,
        breachedSLA,
        atRisk,
        slaPercentage,
        avgResolutionTime,
        targetResolutionTime,
      };
    } catch (error) {
      logger.error('Get SLA status error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(userId?: string): Promise<QueueStatus> {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get conversations that are waiting (last message from user)
      const conversations = await prisma.chatConversation.findMany({
        where: {
          ...(userId && { userId }),
          updatedAt: {
            gte: last24Hours,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 2,
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const waitingTickets = conversations.filter(
        conv => conv.messages[0]?.role === 'USER'
      );

      const inProgressTickets = conversations.filter(
        conv => conv.messages[0]?.role === 'ASSISTANT' && conv.messages[1]?.role === 'USER'
      );

      let totalWaitTime = 0;
      let longestWait = 0;

      const queuedTickets = waitingTickets.slice(0, 10).map(conv => {
        const lastUserMessage = conv.messages.find(m => m.role === 'USER');
        const waitTime = lastUserMessage
          ? Math.round((now.getTime() - lastUserMessage.createdAt.getTime()) / 60000) // minutes
          : 0;

        totalWaitTime += waitTime;
        if (waitTime > longestWait) {
          longestWait = waitTime;
        }

        // Assign priority based on wait time
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
        if (waitTime > 60) priority = 'urgent';
        else if (waitTime > 30) priority = 'high';
        else if (waitTime > 15) priority = 'medium';

        return {
          id: conv.id,
          title: conv.title,
          priority,
          waitTime,
          customerId: conv.user.id,
          customerName: conv.user.name || conv.user.email,
        };
      });

      const avgWaitTime = waitingTickets.length > 0
        ? Math.round(totalWaitTime / waitingTickets.length)
        : 0;

      return {
        waiting: waitingTickets.length,
        inProgress: inProgressTickets.length,
        avgWaitTime,
        longestWaitTime: longestWait,
        queuedTickets,
      };
    } catch (error) {
      logger.error('Get queue status error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceMetrics(
    userId?: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<PerformanceMetrics> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }

      // Get all conversations in the period
      const conversations = await prisma.chatConversation.findMany({
        where: {
          ...(userId && { userId }),
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      const totalChats = conversations.length;
      const totalMessages = conversations.reduce(
        (sum, conv) => sum + conv.messages.length,
        0
      );

      // Calculate response times
      let totalResponseTime = 0;
      let totalResolutionTime = 0;
      let totalFirstResponseTime = 0;
      let responseCount = 0;
      let resolutionCount = 0;
      let firstResponseCount = 0;

      for (const conv of conversations) {
        const messages = conv.messages;

        // First response time
        if (messages.length >= 2 && messages[0].role === 'USER' && messages[1].role === 'ASSISTANT') {
          const firstResponseTime = messages[1].createdAt.getTime() - messages[0].createdAt.getTime();
          totalFirstResponseTime += firstResponseTime;
          firstResponseCount++;
        }

        // Average response time and resolution time
        for (let i = 1; i < messages.length; i++) {
          if (messages[i - 1].role === 'USER' && messages[i].role === 'ASSISTANT') {
            const responseTime = messages[i].createdAt.getTime() - messages[i - 1].createdAt.getTime();
            totalResponseTime += responseTime;
            responseCount++;
          }
        }

        // Resolution time
        if (messages.length >= 2) {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg.role === 'ASSISTANT') {
            const resolutionTime = lastMsg.createdAt.getTime() - messages[0].createdAt.getTime();
            totalResolutionTime += resolutionTime;
            resolutionCount++;
          }
        }
      }

      const avgResponseTime = responseCount > 0
        ? Math.round(totalResponseTime / responseCount / 1000) // seconds
        : 0;

      const avgResolutionTime = resolutionCount > 0
        ? Math.round(totalResolutionTime / resolutionCount / 60000) // minutes
        : 0;

      const firstResponseTime = firstResponseCount > 0
        ? Math.round(totalFirstResponseTime / firstResponseCount / 1000) // seconds
        : 0;

      // Chats by hour
      const chatsByHour = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: 0,
      }));

      conversations.forEach(conv => {
        const hour = conv.createdAt.getHours();
        chatsByHour[hour].count++;
      });

      // Calculate real response time by agent
      const responseTimeByAgent = await this.calculateResponseTimeByAgent(startDate, now);

      // Calculate real customer satisfaction
      const customerSatisfaction = await this.calculateCustomerSatisfaction(userId, startDate, now);

      // Analyze top issues from conversation titles
      const topIssues = await this.analyzeTopIssues(conversations);

      return {
        period,
        totalChats,
        totalMessages,
        avgResponseTime,
        avgResolutionTime,
        firstResponseTime,
        customerSatisfaction,
        chatsByHour,
        responseTimeByAgent,
        topIssues,
      };
    } catch (error) {
      logger.error('Get performance metrics error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Calculate customer satisfaction from feedback ratings
   * @private
   */
  private async calculateCustomerSatisfaction(
    userId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      // Get all feedback ratings within the time period
      const feedbackData = await prisma.helpFeedback.aggregate({
        where: {
          ...(userId && { userId }),
          rating: {
            not: null,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      });

      // If no ratings exist, return a default value
      if (!feedbackData._count.rating || feedbackData._count.rating === 0) {
        logger.debug('No customer satisfaction ratings found for the specified period');
        return 0;
      }

      // Convert 5-star rating to percentage (0-100)
      const avgRating = feedbackData._avg.rating || 0;
      const satisfactionPercentage = (avgRating / 5) * 100;

      logger.debug(`Customer satisfaction calculated: ${satisfactionPercentage.toFixed(1)}% from ${feedbackData._count.rating} ratings`);

      return Math.round(satisfactionPercentage * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      logger.error('Calculate customer satisfaction error:', error instanceof Error ? error : new Error(String(error)));
      // Return 0 on error to avoid breaking the metrics
      return 0;
    }
  }

  /**
   * Calculate average response time for a specific team member
   * @private
   */
  private async calculateTeamMemberResponseTime(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      // Get all messages for this user's conversations
      const messages = await prisma.chatMessage.findMany({
        where: {
          conversation: {
            userId,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          conversationId: true,
          role: true,
          createdAt: true,
        },
      });

      if (messages.length === 0) {
        return 0;
      }

      // Group messages by conversation
      const conversationMessages = messages.reduce((acc, msg) => {
        if (!acc[msg.conversationId]) {
          acc[msg.conversationId] = [];
        }
        acc[msg.conversationId].push(msg);
        return acc;
      }, {} as Record<string, typeof messages>);

      // Calculate response times
      let totalResponseTime = 0;
      let responseCount = 0;

      for (const convMessages of Object.values(conversationMessages)) {
        for (let i = 1; i < convMessages.length; i++) {
          if (convMessages[i - 1].role === 'USER' && convMessages[i].role === 'ASSISTANT') {
            const responseTime =
              convMessages[i].createdAt.getTime() - convMessages[i - 1].createdAt.getTime();
            totalResponseTime += responseTime;
            responseCount++;
          }
        }
      }

      if (responseCount === 0) {
        return 0;
      }

      // Return average response time in seconds
      return Math.round(totalResponseTime / responseCount / 1000);
    } catch (error) {
      logger.error('Calculate team member response time error:', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * Calculate response time by agent/user
   * @private
   */
  private async calculateResponseTimeByAgent(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ agentId: string; agentName: string; avgTime: number }>> {
    try {
      // Get all users who have conversations in this period
      const users = await prisma.user.findMany({
        where: {
          chatConversations: {
            some: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        take: 10, // Limit to top 10 agents
      });

      const responseTimeByAgent: Array<{ agentId: string; agentName: string; avgTime: number }> = [];

      for (const user of users) {
        const avgTime = await this.calculateTeamMemberResponseTime(user.id, startDate, endDate);

        if (avgTime > 0) {
          responseTimeByAgent.push({
            agentId: user.id,
            agentName: user.name || user.email.split('@')[0],
            avgTime,
          });
        }
      }

      // Sort by average time (fastest first)
      responseTimeByAgent.sort((a, b) => a.avgTime - b.avgTime);

      return responseTimeByAgent;
    } catch (error) {
      logger.error('Calculate response time by agent error:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Analyze top issues from conversation titles
   * @private
   */
  private async analyzeTopIssues(
    conversations: Array<{ title: string }>
  ): Promise<Array<{ issue: string; count: number }>> {
    try {
      if (conversations.length === 0) {
        return [];
      }

      // Keywords to categorize issues
      const issueCategories = {
        'Account Access': ['account', 'login', 'password', 'access', 'sign in', 'authentication'],
        'Payment Issues': ['payment', 'billing', 'invoice', 'charge', 'refund', 'subscription'],
        'Technical Support': ['error', 'bug', 'broken', 'not working', 'issue', 'problem', 'technical'],
        'Feature Request': ['feature', 'request', 'suggestion', 'enhancement', 'add', 'new'],
        'Data & Reports': ['report', 'data', 'export', 'analytics', 'dashboard', 'chart'],
        'Integration': ['integration', 'api', 'webhook', 'connect', 'sync'],
      };

      const issueCounts: Record<string, number> = {
        'Account Access': 0,
        'Payment Issues': 0,
        'Technical Support': 0,
        'Feature Request': 0,
        'Data & Reports': 0,
        'Integration': 0,
        'Other': 0,
      };

      // Categorize each conversation
      for (const conv of conversations) {
        const title = conv.title.toLowerCase();
        let categorized = false;

        for (const [category, keywords] of Object.entries(issueCategories)) {
          if (keywords.some(keyword => title.includes(keyword))) {
            issueCounts[category]++;
            categorized = true;
            break;
          }
        }

        if (!categorized) {
          issueCounts['Other']++;
        }
      }

      // Convert to array and sort by count
      const topIssues = Object.entries(issueCounts)
        .map(([issue, count]) => ({ issue, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 issues

      return topIssues;
    } catch (error) {
      logger.error('Analyze top issues error:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }
}

export const monitoringService = new MonitoringService();

import natural from 'natural';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { SentimentEmotion, AlertSeverity } from '@prisma/client';

// Initialize sentiment analyzer
const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const analyzer = new Analyzer('English', stemmer, 'afinn');

// Tokenizer for extracting words
const tokenizer = new natural.WordTokenizer();

// Keywords indicating frustration/negative sentiment
const FRUSTRATION_KEYWORDS = [
  'frustrated', 'angry', 'annoyed', 'disappointed', 'terrible',
  'awful', 'horrible', 'worst', 'useless', 'broken', 'failed',
  'failure', 'problem', 'issue', 'bug', 'error', 'wrong', 'bad',
  'never', 'nobody', 'nothing', 'cant', 'cannot', 'wont', 'dont',
  'ridiculous', 'unacceptable', 'pathetic', 'disgrace', 'scam',
  'refund', 'cancel', 'cancellation', 'unsubscribe', 'complaint'
];

// Keywords indicating positive sentiment
const POSITIVE_KEYWORDS = [
  'thank', 'thanks', 'appreciate', 'grateful', 'excellent', 'great',
  'good', 'love', 'wonderful', 'amazing', 'perfect', 'fantastic',
  'helpful', 'resolved', 'fixed', 'working', 'happy', 'satisfied',
  'pleased', 'impressed', 'awesome', 'brilliant', 'outstanding'
];

// Sentiment thresholds
const NEGATIVE_THRESHOLD = -0.3;
const POSITIVE_THRESHOLD = 0.3;
const HIGH_SEVERITY_THRESHOLD = -0.6;

interface SentimentAnalysis {
  score: number;
  emotion: SentimentEmotion;
  confidence: number;
  keywords: string[];
}

interface TicketSentimentOverview {
  ticketId: string;
  averageScore: number;
  trend: 'improving' | 'declining' | 'stable';
  emotionDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  alertCount: number;
  messages: {
    id: string;
    content: string;
    score: number;
    emotion: SentimentEmotion;
    createdAt: Date;
  }[];
}

interface SentimentAlert {
  id: string;
  ticketId: string;
  triggered: Date;
  severity: AlertSeverity;
  message: string;
  resolvedAt: Date | null;
}

class SentimentService {
  /**
   * Analyze the sentiment of a text message
   */
  analyzeSentiment(text: string): SentimentAnalysis {
    // Clean and tokenize the text
    const cleanText = text.toLowerCase().trim();
    const tokens = tokenizer.tokenize(cleanText);

    if (!tokens || tokens.length === 0) {
      return {
        score: 0,
        emotion: SentimentEmotion.NEUTRAL,
        confidence: 50,
        keywords: [],
      };
    }

    // Calculate sentiment score using AFINN
    const score = analyzer.getSentiment(tokens);

    // Normalize score to -1 to 1 range
    // AFINN scores typically range from -5 to 5 per word, we'll normalize based on token count
    const normalizedScore = Math.max(-1, Math.min(1, score / Math.sqrt(tokens.length)));

    // Determine emotion based on score
    let emotion: SentimentEmotion;
    if (normalizedScore >= POSITIVE_THRESHOLD) {
      emotion = SentimentEmotion.POSITIVE;
    } else if (normalizedScore <= NEGATIVE_THRESHOLD) {
      emotion = SentimentEmotion.NEGATIVE;
    } else {
      emotion = SentimentEmotion.NEUTRAL;
    }

    // Calculate confidence based on score magnitude and keyword presence
    const baseConfidence = Math.abs(normalizedScore) * 100;

    // Extract keywords
    const keywords = this.extractKeywords(tokens, emotion);

    // Boost confidence if keywords are present
    const keywordBoost = keywords.length > 0 ? 15 : 0;
    const confidence = Math.min(100, baseConfidence + keywordBoost);

    logger.debug('Sentiment analysis completed', {
      text: text.substring(0, 50),
      score: normalizedScore,
      emotion,
      confidence,
      keywords,
    });

    return {
      score: Number(normalizedScore.toFixed(2)),
      emotion,
      confidence: Number(confidence.toFixed(2)),
      keywords,
    };
  }

  /**
   * Extract relevant keywords from tokens
   */
  private extractKeywords(tokens: string[], emotion: SentimentEmotion): string[] {
    const keywords: string[] = [];
    const keywordList = emotion === SentimentEmotion.NEGATIVE
      ? FRUSTRATION_KEYWORDS
      : emotion === SentimentEmotion.POSITIVE
        ? POSITIVE_KEYWORDS
        : [...FRUSTRATION_KEYWORDS, ...POSITIVE_KEYWORDS];

    tokens.forEach((token) => {
      if (keywordList.some((keyword) => token.includes(keyword))) {
        if (!keywords.includes(token)) {
          keywords.push(token);
        }
      }
    });

    return keywords.slice(0, 10); // Limit to top 10 keywords
  }

  /**
   * Analyze sentiment for a ticket message and store the result
   */
  async analyzeTicketMessage(messageId: string): Promise<void> {
    try {
      // Get the message
      const message = await prisma.ticketMessage.findUnique({
        where: { id: messageId },
        include: {
          ticket: true,
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Only analyze customer messages (not agent internal notes)
      if (message.type === 'AGENT' || message.isInternal) {
        logger.debug('Skipping sentiment analysis for non-customer message', {
          messageId,
          type: message.type,
          isInternal: message.isInternal,
        });
        return;
      }

      // Analyze sentiment
      const analysis = this.analyzeSentiment(message.content);

      // Store sentiment analysis
      await prisma.messageSentiment.upsert({
        where: { messageId },
        update: {
          score: analysis.score,
          emotion: analysis.emotion,
          confidence: analysis.confidence,
          keywords: JSON.stringify(analysis.keywords),
        },
        create: {
          messageId,
          score: analysis.score,
          emotion: analysis.emotion,
          confidence: analysis.confidence,
          keywords: JSON.stringify(analysis.keywords),
        },
      });

      // Check if we need to create an alert
      if (analysis.score <= NEGATIVE_THRESHOLD && analysis.confidence > 60) {
        await this.createSentimentAlert(message.ticketId, analysis.score);
      }

      logger.info('Sentiment analysis completed for message', {
        messageId,
        ticketId: message.ticketId,
        emotion: analysis.emotion,
        score: analysis.score,
      });
    } catch (error) {
      logger.error('Failed to analyze sentiment for message', {
        error: error instanceof Error ? error.message : String(error),
        messageId,
      });
      throw error;
    }
  }

  /**
   * Create a sentiment alert for highly negative sentiment
   */
  private async createSentimentAlert(ticketId: string, score: number): Promise<void> {
    const severity = score <= HIGH_SEVERITY_THRESHOLD
      ? AlertSeverity.HIGH
      : AlertSeverity.LOW;

    const alertMessage = severity === AlertSeverity.HIGH
      ? `High priority: Customer is extremely frustrated (sentiment score: ${score.toFixed(2)})`
      : `Customer is showing signs of frustration (sentiment score: ${score.toFixed(2)})`;

    // Check if there's already an unresolved alert for this ticket
    const existingAlert = await prisma.sentimentAlert.findFirst({
      where: {
        ticketId,
        resolvedAt: null,
      },
      orderBy: {
        triggered: 'desc',
      },
    });

    // Only create a new alert if there's no recent unresolved alert (within last hour)
    if (!existingAlert ||
        (new Date().getTime() - existingAlert.triggered.getTime()) > 3600000) {
      await prisma.sentimentAlert.create({
        data: {
          ticketId,
          severity,
          message: alertMessage,
        },
      });

      logger.warn('Sentiment alert created', {
        ticketId,
        severity,
        score,
      });
    }
  }

  /**
   * Get sentiment analysis for a specific message
   */
  async getMessageSentiment(messageId: string) {
    const sentiment = await prisma.messageSentiment.findUnique({
      where: { messageId },
      include: {
        message: {
          include: {
            ticket: {
              select: {
                id: true,
                subject: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!sentiment) {
      return null;
    }

    return {
      ...sentiment,
      keywords: sentiment.keywords ? JSON.parse(sentiment.keywords as string) : [],
    };
  }

  /**
   * Get sentiment overview for a ticket
   */
  async getTicketSentimentOverview(ticketId: string): Promise<TicketSentimentOverview | null> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          where: {
            type: { not: 'AGENT' },
            isInternal: false,
          },
          include: {
            sentimentAnalysis: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        sentimentAlerts: {
          where: {
            resolvedAt: null,
          },
        },
      },
    });

    if (!ticket) {
      return null;
    }

    // Filter messages that have sentiment analysis
    const analyzedMessages = ticket.messages.filter((m) => m.sentimentAnalysis !== null);

    if (analyzedMessages.length === 0) {
      return {
        ticketId,
        averageScore: 0,
        trend: 'stable',
        emotionDistribution: {
          positive: 0,
          neutral: 0,
          negative: 0,
        },
        alertCount: ticket.sentimentAlerts.length,
        messages: [],
      };
    }

    // Calculate average score
    const totalScore = analyzedMessages.reduce(
      (sum, message) => sum + Number(message.sentimentAnalysis!.score),
      0
    );
    const averageScore = totalScore / analyzedMessages.length;

    // Calculate emotion distribution
    const emotionCounts = analyzedMessages.reduce(
      (counts, message) => {
        const emotion = message.sentimentAnalysis!.emotion;
        counts[emotion.toLowerCase() as keyof typeof counts]++;
        return counts;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );

    // Determine trend (compare first half vs second half)
    const trend = this.calculateSentimentTrend(analyzedMessages.map((m) => ({ sentiment: m.sentimentAnalysis })));

    // Format messages
    const messages = analyzedMessages.map((message) => ({
      id: message.id,
      content: message.content,
      score: Number(message.sentimentAnalysis!.score),
      emotion: message.sentimentAnalysis!.emotion,
      createdAt: message.createdAt,
    }));

    return {
      ticketId,
      averageScore: Number(averageScore.toFixed(2)),
      trend,
      emotionDistribution: emotionCounts,
      alertCount: ticket.sentimentAlerts.length,
      messages,
    };
  }

  /**
   * Calculate sentiment trend for a ticket
   */
  private calculateSentimentTrend(
    comments: Array<{ sentiment: { score: any } | null }>
  ): 'improving' | 'declining' | 'stable' {
    if (comments.length < 2) {
      return 'stable';
    }

    const midpoint = Math.floor(comments.length / 2);
    const firstHalf = comments.slice(0, midpoint);
    const secondHalf = comments.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce(
      (sum, c) => sum + Number(c.sentiment!.score),
      0
    ) / firstHalf.length;

    const secondHalfAvg = secondHalf.reduce(
      (sum, c) => sum + Number(c.sentiment!.score),
      0
    ) / secondHalf.length;

    const difference = secondHalfAvg - firstHalfAvg;

    if (difference > 0.15) {
      return 'improving';
    } else if (difference < -0.15) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Get active sentiment alerts
   */
  async getActiveSentimentAlerts(userId: string): Promise<SentimentAlert[]> {
    const alerts = await prisma.sentimentAlert.findMany({
      where: {
        resolvedAt: null,
        ticket: {
          userId,
        },
      },
      include: {
        ticket: {
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
          },
        },
      },
      orderBy: {
        triggered: 'desc',
      },
    });

    return alerts;
  }

  /**
   * Resolve a sentiment alert
   */
  async resolveSentimentAlert(alertId: string): Promise<void> {
    await prisma.sentimentAlert.update({
      where: { id: alertId },
      data: {
        resolvedAt: new Date(),
      },
    });

    logger.info('Sentiment alert resolved', { alertId });
  }

  /**
   * Analyze sentiment for all messages in a ticket
   */
  async analyzeTicketMessages(ticketId: string): Promise<void> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          where: {
            type: { not: 'AGENT' },
            isInternal: false,
          },
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    logger.info('Analyzing sentiment for ticket messages', {
      ticketId,
      messageCount: ticket.messages.length,
    });

    // Analyze each message
    for (const message of ticket.messages) {
      try {
        await this.analyzeTicketMessage(message.id);
      } catch (error) {
        logger.error('Failed to analyze message sentiment', {
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Get sentiment statistics for a user's tickets
   */
  async getUserSentimentStats(userId: string) {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: {
          where: {
            type: { not: 'AGENT' },
          },
          include: {
            sentimentAnalysis: true,
          },
        },
        sentimentAlerts: {
          where: {
            resolvedAt: null,
          },
        },
      },
    });

    const analyzedMessages = tickets.flatMap((t) =>
      t.messages.filter((m) => m.sentimentAnalysis !== null)
    );

    const totalMessages = analyzedMessages.length;
    const averageScore = totalMessages > 0
      ? analyzedMessages.reduce((sum, m) => sum + Number(m.sentimentAnalysis!.score), 0) / totalMessages
      : 0;

    const emotionCounts = analyzedMessages.reduce(
      (counts, message) => {
        const emotion = message.sentimentAnalysis!.emotion;
        counts[emotion.toLowerCase() as keyof typeof counts]++;
        return counts;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );

    const totalAlerts = tickets.reduce((sum, t) => sum + t.sentimentAlerts.length, 0);

    return {
      totalTickets: tickets.length,
      totalMessages,
      averageScore: Number(averageScore.toFixed(2)),
      emotionDistribution: emotionCounts,
      activeAlerts: totalAlerts,
    };
  }
}

export const sentimentService = new SentimentService();

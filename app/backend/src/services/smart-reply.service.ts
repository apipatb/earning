import OpenAI from 'openai';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { MessageSender, SentimentEmotion, SuggestionSource } from '@prisma/client';

interface GenerateSuggestionsParams {
  messageId: string;
  ticketId: string;
  limit?: number;
}

interface CreateTemplateParams {
  teamId?: string;
  title: string;
  content: string;
  category?: string;
}

interface SuggestedReplyResult {
  id: string;
  suggestion: string;
  confidence: number;
  source: SuggestionSource;
  templateId?: string | null;
}

class SmartReplyService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
    } else {
      logger.warn('OPENAI_API_KEY not configured. Smart reply AI features will be limited.');
    }
  }

  /**
   * Generate smart reply suggestions for a ticket message
   */
  async generateSuggestions(params: GenerateSuggestionsParams): Promise<SuggestedReplyResult[]> {
    const { messageId, ticketId, limit = 3 } = params;

    // Get the message and ticket context
    const message = await prisma.ticketMessage.findUnique({
      where: { id: messageId },
      include: {
        ticket: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 10, // Last 10 messages for context
            },
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        sentiment: true,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Get customer's previous interactions for history
    const customerHistory = await this.getCustomerHistory(message.ticket.userId, ticketId);

    // Check if there are existing suggestions for this message
    const existingSuggestions = await prisma.suggestedReply.findMany({
      where: { messageId },
      orderBy: { confidence: 'desc' },
    });

    // If suggestions already exist, return them
    if (existingSuggestions.length > 0) {
      return existingSuggestions.map((s) => ({
        id: s.id,
        suggestion: s.suggestion,
        confidence: parseFloat(s.confidence.toString()),
        source: s.source,
        templateId: s.templateId,
      }));
    }

    const suggestions: SuggestedReplyResult[] = [];

    // Strategy 1: Use AI to generate suggestions
    if (this.openai && message.sender === MessageSender.CUSTOMER) {
      try {
        const aiSuggestions = await this.generateAISuggestions(message, customerHistory, limit);
        suggestions.push(...aiSuggestions);
      } catch (error) {
        logger.error('Error generating AI suggestions', {
          error: error instanceof Error ? error.message : String(error),
          messageId,
        });
      }
    }

    // Strategy 2: Match template-based suggestions
    const templateSuggestions = await this.matchTemplateSuggestions(message, limit - suggestions.length);
    suggestions.push(...templateSuggestions);

    // Save all suggestions to database
    const savedSuggestions = await Promise.all(
      suggestions.map((suggestion) =>
        prisma.suggestedReply.create({
          data: {
            ticketId,
            messageId,
            suggestion: suggestion.suggestion,
            confidence: suggestion.confidence,
            source: suggestion.source,
            templateId: suggestion.templateId,
          },
        })
      )
    );

    logger.info('Generated smart reply suggestions', {
      messageId,
      ticketId,
      count: savedSuggestions.length,
    });

    return savedSuggestions.map((s) => ({
      id: s.id,
      suggestion: s.suggestion,
      confidence: parseFloat(s.confidence.toString()),
      source: s.source,
      templateId: s.templateId,
    }));
  }

  /**
   * Generate AI-powered suggestions using OpenAI
   */
  private async generateAISuggestions(
    message: any,
    customerHistory: string,
    limit: number
  ): Promise<SuggestedReplyResult[]> {
    if (!this.openai) {
      return [];
    }

    // Build context from ticket history
    const conversationHistory = message.ticket.messages
      .map((msg: any) => `${msg.sender}: ${msg.content}`)
      .join('\n');

    // Get sentiment context
    const sentimentContext = message.sentiment
      ? `Customer sentiment: ${message.sentiment.emotion} (confidence: ${message.sentiment.confidence}%)`
      : '';

    // Construct the prompt
    const prompt = `You are a helpful customer service AI assistant. Generate ${limit} professional and empathetic reply suggestions for the following customer service ticket.

Ticket Subject: ${message.ticket.subject}
Ticket Priority: ${message.ticket.priority}
${sentimentContext}

Conversation History:
${conversationHistory}

Customer History:
${customerHistory}

Latest Customer Message:
${message.content}

Generate ${limit} different reply suggestions that:
1. Address the customer's concerns directly
2. Match the appropriate tone based on sentiment
3. Provide actionable solutions when possible
4. Are professional and empathetic
5. Are concise (2-4 sentences each)

Return ONLY a JSON array with ${limit} objects, each containing:
- "suggestion": the reply text
- "confidence": confidence score (0-100)

Example format:
[
  {"suggestion": "...", "confidence": 85},
  {"suggestion": "...", "confidence": 78}
]`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a customer service AI that generates professional, empathetic reply suggestions. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const responseText = completion.choices[0]?.message?.content || '[]';

      // Parse the JSON response
      let aiResults: Array<{ suggestion: string; confidence: number }> = [];
      try {
        aiResults = JSON.parse(responseText);
      } catch {
        // If JSON parsing fails, try to extract suggestions manually
        logger.warn('Failed to parse AI response as JSON', { responseText });
        return [];
      }

      return aiResults.map((result) => ({
        id: '', // Will be set when saved
        suggestion: result.suggestion,
        confidence: result.confidence || 70,
        source: SuggestionSource.AI,
        templateId: null,
      }));
    } catch (error) {
      logger.error('OpenAI API error in smart reply', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Match template-based suggestions
   */
  private async matchTemplateSuggestions(message: any, limit: number): Promise<SuggestedReplyResult[]> {
    if (limit <= 0) return [];

    const ticketCategory = message.ticket.category;
    const sentiment = message.sentiment?.emotion;

    // Find matching templates based on category or high usage
    const templates = await prisma.replyTemplate.findMany({
      where: {
        OR: [
          { category: ticketCategory },
          { usageCount: { gte: 5 } }, // Popular templates
        ],
      },
      orderBy: { usageCount: 'desc' },
      take: limit,
    });

    return templates.map((template) => {
      // Calculate confidence based on category match and usage
      let confidence = 60; // Base confidence for templates

      if (template.category === ticketCategory) {
        confidence += 15; // Category match bonus
      }

      if (template.usageCount > 10) {
        confidence += 10; // High usage bonus
      }

      // Adjust confidence based on sentiment
      if (sentiment === SentimentEmotion.NEGATIVE && template.category === 'apology') {
        confidence += 15;
      } else if (sentiment === SentimentEmotion.POSITIVE && template.category === 'thanks') {
        confidence += 10;
      }

      return {
        id: '',
        suggestion: template.content,
        confidence: Math.min(confidence, 95), // Cap at 95
        source: SuggestionSource.TEMPLATE,
        templateId: template.id,
      };
    });
  }

  /**
   * Get customer history for context
   */
  private async getCustomerHistory(userId: string, currentTicketId: string): Promise<string> {
    const previousTickets = await prisma.supportTicket.findMany({
      where: {
        userId,
        id: { not: currentTicketId },
        status: { in: ['RESOLVED', 'CLOSED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        subject: true,
        status: true,
        createdAt: true,
      },
    });

    if (previousTickets.length === 0) {
      return 'No previous ticket history';
    }

    return previousTickets
      .map((ticket) => `- ${ticket.subject} (${ticket.status})`)
      .join('\n');
  }

  /**
   * Mark a suggestion as accepted (learning from feedback)
   */
  async acceptSuggestion(suggestionId: string): Promise<void> {
    const suggestion = await prisma.suggestedReply.findUnique({
      where: { id: suggestionId },
      include: { template: true },
    });

    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    // Mark suggestion as accepted
    await prisma.suggestedReply.update({
      where: { id: suggestionId },
      data: { accepted: true },
    });

    // If it's a template-based suggestion, increment usage count
    if (suggestion.templateId) {
      await prisma.replyTemplate.update({
        where: { id: suggestion.templateId },
        data: { usageCount: { increment: 1 } },
      });
    }

    logger.info('Accepted smart reply suggestion', {
      suggestionId,
      source: suggestion.source,
      templateId: suggestion.templateId,
    });
  }

  /**
   * Get all reply templates
   */
  async getTemplates(teamId?: string, category?: string) {
    return prisma.replyTemplate.findMany({
      where: {
        ...(teamId && { teamId }),
        ...(category && { category }),
      },
      orderBy: { usageCount: 'desc' },
    });
  }

  /**
   * Create a new reply template
   */
  async createTemplate(params: CreateTemplateParams) {
    const { teamId, title, content, category } = params;

    const template = await prisma.replyTemplate.create({
      data: {
        teamId: teamId || null,
        title,
        content,
        category: category || null,
      },
    });

    logger.info('Created reply template', {
      templateId: template.id,
      teamId,
      category,
    });

    return template;
  }

  /**
   * Delete a reply template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await prisma.replyTemplate.delete({
      where: { id: templateId },
    });

    logger.info('Deleted reply template', { templateId });
  }

  /**
   * Update a reply template
   */
  async updateTemplate(
    templateId: string,
    updates: {
      title?: string;
      content?: string;
      category?: string;
    }
  ) {
    const template = await prisma.replyTemplate.update({
      where: { id: templateId },
      data: updates,
    });

    logger.info('Updated reply template', { templateId });

    return template;
  }

  /**
   * Get suggestion statistics for analytics
   */
  async getSuggestionStats(ticketId?: string) {
    const where = ticketId ? { ticketId } : {};

    const [totalSuggestions, acceptedSuggestions, aiSuggestions, templateSuggestions] = await Promise.all([
      prisma.suggestedReply.count({ where }),
      prisma.suggestedReply.count({ where: { ...where, accepted: true } }),
      prisma.suggestedReply.count({ where: { ...where, source: SuggestionSource.AI } }),
      prisma.suggestedReply.count({ where: { ...where, source: SuggestionSource.TEMPLATE } }),
    ]);

    const acceptanceRate = totalSuggestions > 0 ? (acceptedSuggestions / totalSuggestions) * 100 : 0;

    return {
      totalSuggestions,
      acceptedSuggestions,
      acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
      aiSuggestions,
      templateSuggestions,
    };
  }
}

export const smartReplyService = new SmartReplyService();

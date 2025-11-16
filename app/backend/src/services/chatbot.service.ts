import OpenAI from 'openai';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

// Rate limiting store: userId -> array of timestamps
const rateLimitStore = new Map<string, number[]>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SendMessageParams {
  userId: string;
  conversationId: string;
  message: string;
}

interface CreateConversationParams {
  userId: string;
  title: string;
}

interface ChatCompletionResponse {
  message: string;
  tokensUsed: number;
  conversationId: string;
}

class ChatbotService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
    } else {
      logger.warn('OPENAI_API_KEY not configured. Chatbot service will be disabled.');
    }
  }

  /**
   * Check if user has exceeded rate limit
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userRequests = rateLimitStore.get(userId) || [];

    // Remove requests outside the time window
    const validRequests = userRequests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    // Check if user has exceeded limit
    if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    // Add new request timestamp
    validRequests.push(now);
    rateLimitStore.set(userId, validRequests);

    return true;
  }

  /**
   * Get remaining requests for user
   */
  getRemainingRequests(userId: string): number {
    const now = Date.now();
    const userRequests = rateLimitStore.get(userId) || [];

    const validRequests = userRequests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    return Math.max(0, RATE_LIMIT_MAX_REQUESTS - validRequests.length);
  }

  /**
   * Get or create chat configuration for user
   */
  private async getChatConfig(userId: string) {
    let config = await prisma.chatConfig.findUnique({
      where: { userId },
    });

    // Create default config if it doesn't exist
    if (!config) {
      config = await prisma.chatConfig.create({
        data: {
          userId,
          systemPrompt: 'You are a helpful assistant for the EarnTrack platform. Help users track their earnings, manage their business, and provide insights on their financial data.',
          modelName: process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
          temperature: 0.7,
        },
      });
    }

    return config;
  }

  /**
   * Create a new conversation
   */
  async createConversation(params: CreateConversationParams) {
    const { userId, title } = params;

    const conversation = await prisma.chatConversation.create({
      data: {
        userId,
        title,
      },
    });

    logger.info('Created chat conversation', {
      conversationId: conversation.id,
      userId,
    });

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string) {
    const conversations = await prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    return conversations;
  }

  /**
   * Get a single conversation with all messages
   */
  async getConversation(userId: string, conversationId: string) {
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return conversation;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(userId: string, conversationId: string) {
    // Verify ownership
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await prisma.chatConversation.delete({
      where: { id: conversationId },
    });

    logger.info('Deleted chat conversation', {
      conversationId,
      userId,
    });
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(params: SendMessageParams): Promise<ChatCompletionResponse> {
    const { userId, conversationId, message } = params;

    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    }

    // Check if OpenAI is configured
    if (!this.openai) {
      throw new Error('Chatbot service is not configured. Please contact support.');
    }

    // Verify conversation ownership
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // Last 20 messages for context
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get user's chat config
    const config = await this.getChatConfig(userId);

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: message,
        tokensUsed: this.estimateTokens(message),
      },
    });

    // Prepare messages for OpenAI
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: config.systemPrompt,
      },
      // Add conversation history
      ...conversation.messages.map((msg) => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      // Add new user message
      {
        role: 'user',
        content: message,
      },
    ];

    try {
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: config.modelName,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      });

      const assistantMessage = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Save assistant response
      await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: assistantMessage,
          tokensUsed,
        },
      });

      // Update conversation timestamp
      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      logger.info('Generated chat response', {
        conversationId,
        userId,
        tokensUsed,
        model: config.modelName,
      });

      return {
        message: assistantMessage,
        tokensUsed,
        conversationId,
      };
    } catch (error) {
      logger.error('OpenAI API error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        conversationId,
      });

      // Save error message as assistant response
      await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          tokensUsed: 0,
        },
      });

      throw new Error('Failed to generate AI response. Please try again.');
    }
  }

  /**
   * Calculate token usage for a conversation
   */
  async getConversationTokenUsage(userId: string, conversationId: string): Promise<number> {
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: true,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const totalTokens = conversation.messages.reduce(
      (sum, msg) => sum + msg.tokensUsed,
      0
    );

    return totalTokens;
  }

  /**
   * Get total token usage for a user
   */
  async getUserTokenUsage(userId: string): Promise<number> {
    const result = await prisma.chatMessage.aggregate({
      where: {
        conversation: {
          userId,
        },
      },
      _sum: {
        tokensUsed: true,
      },
    });

    return result._sum.tokensUsed || 0;
  }

  /**
   * Estimate tokens for a message (rough approximation)
   * Average: ~4 characters per token for English text
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Update user's chat configuration
   */
  async updateChatConfig(
    userId: string,
    updates: {
      systemPrompt?: string;
      modelName?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ) {
    const config = await prisma.chatConfig.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });

    logger.info('Updated chat config', {
      userId,
      updates: Object.keys(updates),
    });

    return config;
  }

  /**
   * Get user's chat configuration
   */
  async getUserChatConfig(userId: string) {
    return this.getChatConfig(userId);
  }
}

export const chatbotService = new ChatbotService();

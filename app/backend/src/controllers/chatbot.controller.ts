import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { chatbotService } from '../services/chatbot.service';
import { logger } from '../utils/logger';

// Validation schemas
const createConversationSchema = z.object({
  title: z.string().min(1).max(255),
});

const sendMessageSchema = z.object({
  message: z.string().min(1).max(10000),
});

const updateChatConfigSchema = z.object({
  systemPrompt: z.string().min(10).max(5000).optional(),
  modelName: z.string().min(1).max(50).optional(),
  maxTokens: z.number().int().min(100).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/**
 * Create a new chat conversation
 * POST /api/v1/chatbot/conversations
 */
export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createConversationSchema.parse(req.body);

    const conversation = await chatbotService.createConversation({
      userId,
      title: data.title,
    });

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation data',
        details: error.errors,
      });
    }

    logger.error('Create conversation error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
    });
  }
};

/**
 * Get all conversations for the authenticated user
 * GET /api/v1/chatbot/conversations
 */
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversations = await chatbotService.getConversations(userId);

    res.json({
      success: true,
      data: conversations,
      count: conversations.length,
    });
  } catch (error) {
    logger.error('Get conversations error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
    });
  }
};

/**
 * Get a single conversation with all messages
 * GET /api/v1/chatbot/conversations/:id
 */
export const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const conversation = await chatbotService.getConversation(userId, id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    logger.error('Get conversation error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation',
    });
  }
};

/**
 * Delete a conversation
 * DELETE /api/v1/chatbot/conversations/:id
 */
export const deleteConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await chatbotService.deleteConversation(userId, id);

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    logger.error('Delete conversation error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
    });
  }
};

/**
 * Send a message to the AI chatbot
 * POST /api/v1/chatbot/messages
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.body;
    const data = sendMessageSchema.parse(req.body);

    // Validate conversationId
    if (!conversationId || typeof conversationId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'conversationId is required',
      });
    }

    // Check remaining rate limit
    const remainingRequests = chatbotService.getRemainingRequests(userId);

    const response = await chatbotService.sendMessage({
      userId,
      conversationId,
      message: data.message,
    });

    res.json({
      success: true,
      data: response,
      rateLimit: {
        remaining: Math.max(0, remainingRequests - 1),
        limit: 10,
        windowMs: 60000,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message data',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      // Handle rate limit error
      if (error.message.includes('Rate limit exceeded')) {
        return res.status(429).json({
          success: false,
          error: error.message,
          rateLimit: {
            remaining: 0,
            limit: 10,
            windowMs: 60000,
          },
        });
      }

      // Handle conversation not found
      if (error.message === 'Conversation not found') {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Handle chatbot not configured
      if (error.message.includes('not configured')) {
        return res.status(503).json({
          success: false,
          error: error.message,
        });
      }
    }

    logger.error('Send message error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
};

/**
 * Get token usage statistics
 * GET /api/v1/chatbot/usage
 */
export const getTokenUsage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.query;

    if (conversationId && typeof conversationId === 'string') {
      // Get usage for specific conversation
      const usage = await chatbotService.getConversationTokenUsage(userId, conversationId);

      return res.json({
        success: true,
        data: {
          conversationId,
          tokensUsed: usage,
        },
      });
    }

    // Get total usage for user
    const totalUsage = await chatbotService.getUserTokenUsage(userId);

    res.json({
      success: true,
      data: {
        totalTokensUsed: totalUsage,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    logger.error('Get token usage error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch token usage',
    });
  }
};

/**
 * Get rate limit status
 * GET /api/v1/chatbot/rate-limit
 */
export const getRateLimitStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const remaining = chatbotService.getRemainingRequests(userId);

    res.json({
      success: true,
      data: {
        remaining,
        limit: 10,
        windowMs: 60000,
      },
    });
  } catch (error) {
    logger.error('Get rate limit status error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rate limit status',
    });
  }
};

/**
 * Get user's chat configuration
 * GET /api/v1/chatbot/config
 */
export const getChatConfig = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const config = await chatbotService.getUserChatConfig(userId);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Get chat config error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat configuration',
    });
  }
};

/**
 * Update user's chat configuration
 * PUT /api/v1/chatbot/config
 */
export const updateChatConfig = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = updateChatConfigSchema.parse(req.body);

    const config = await chatbotService.updateChatConfig(userId, data);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration data',
        details: error.errors,
      });
    }

    logger.error('Update chat config error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to update chat configuration',
    });
  }
};

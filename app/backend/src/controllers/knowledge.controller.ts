import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { knowledgeService } from '../services/knowledge.service';
import { logger } from '../utils/logger';

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  icon: z.string().max(100).optional(),
  slug: z.string().min(1).max(255),
  displayOrder: z.number().int().min(0).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  icon: z.string().max(100).optional(),
  slug: z.string().min(1).max(255).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const createArticleSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500),
  content: z.string().min(1),
  excerpt: z.string().max(1000).optional(),
  author: z.string().max(255).optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
});

const updateArticleSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(1000).optional(),
  author: z.string().max(255).optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
});

const searchArticlesSchema = z.object({
  query: z.string().min(1).max(500),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

const submitFeedbackSchema = z.object({
  isHelpful: z.boolean(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(5000).optional(),
});

/**
 * Get all categories
 * GET /api/v1/knowledge/categories
 */
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await knowledgeService.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Get categories error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
};

/**
 * Get a single category
 * GET /api/v1/knowledge/categories/:idOrSlug
 */
export const getCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { idOrSlug } = req.params;

    const category = await knowledgeService.getCategory(idOrSlug);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error('Get category error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category',
    });
  }
};

/**
 * Create a new category (Admin only)
 * POST /api/v1/knowledge/categories
 */
export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const data = createCategorySchema.parse(req.body);

    const category = await knowledgeService.createCategory(data);

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category data',
        details: error.errors,
      });
    }

    logger.error('Create category error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
    });
  }
};

/**
 * Update a category (Admin only)
 * PUT /api/v1/knowledge/categories/:id
 */
export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateCategorySchema.parse(req.body);

    const category = await knowledgeService.updateCategory(id, data);

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category data',
        details: error.errors,
      });
    }

    logger.error('Update category error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to update category',
    });
  }
};

/**
 * Delete a category (Admin only)
 * DELETE /api/v1/knowledge/categories/:id
 */
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await knowledgeService.deleteCategory(id);

    res.status(204).send();
  } catch (error) {
    logger.error('Delete category error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to delete category',
    });
  }
};

/**
 * Get all articles
 * GET /api/v1/knowledge/articles
 */
export const getArticles = async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, limit, offset } = req.query;

    const params: any = {};

    if (categoryId && typeof categoryId === 'string') {
      params.categoryId = categoryId;
    }

    if (limit && typeof limit === 'string') {
      params.limit = parseInt(limit, 10);
    }

    if (offset && typeof offset === 'string') {
      params.offset = parseInt(offset, 10);
    }

    const result = await knowledgeService.getArticles(params);

    res.json({
      success: true,
      data: result.articles,
      total: result.total,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    logger.error('Get articles error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles',
    });
  }
};

/**
 * Get a single article by ID or slug
 * GET /api/v1/knowledge/articles/:idOrSlug
 */
export const getArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    const userId = req.user?.id;

    const article = await knowledgeService.getArticle(idOrSlug);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    // Get user's feedback if authenticated
    let userFeedback = null;
    if (userId) {
      userFeedback = await knowledgeService.getUserFeedback(userId, article.id);
    }

    // Parse tags
    const tags = article.tags ? JSON.parse(article.tags) : [];

    res.json({
      success: true,
      data: {
        ...article,
        tags,
        userFeedback,
      },
    });
  } catch (error) {
    logger.error('Get article error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article',
    });
  }
};

/**
 * Create a new article (Admin only)
 * POST /api/v1/knowledge/articles
 */
export const createArticle = async (req: AuthRequest, res: Response) => {
  try {
    const data = createArticleSchema.parse(req.body);

    const article = await knowledgeService.createArticle(data);

    res.status(201).json({
      success: true,
      data: article,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid article data',
        details: error.errors,
      });
    }

    logger.error('Create article error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to create article',
    });
  }
};

/**
 * Update an article (Admin only)
 * PUT /api/v1/knowledge/articles/:id
 */
export const updateArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateArticleSchema.parse(req.body);

    const article = await knowledgeService.updateArticle(id, data);

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid article data',
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message === 'Article not found') {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    logger.error('Update article error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to update article',
    });
  }
};

/**
 * Delete an article (Admin only)
 * DELETE /api/v1/knowledge/articles/:id
 */
export const deleteArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await knowledgeService.deleteArticle(id);

    res.status(204).send();
  } catch (error) {
    logger.error('Delete article error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to delete article',
    });
  }
};

/**
 * Search articles
 * POST /api/v1/knowledge/search
 */
export const searchArticles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const data = searchArticlesSchema.parse(req.body);

    const result = await knowledgeService.searchArticles(data, userId);

    res.json({
      success: true,
      data: result.articles,
      total: result.total,
      query: data.query,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search parameters',
        details: error.errors,
      });
    }

    logger.error('Search articles error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to search articles',
    });
  }
};

/**
 * Track article view
 * POST /api/v1/knowledge/articles/:id/view
 */
export const trackView = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await knowledgeService.trackView(id);

    res.status(204).send();
  } catch (error) {
    logger.error('Track view error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to track view',
    });
  }
};

/**
 * Submit article feedback
 * POST /api/v1/knowledge/articles/:id/feedback
 */
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = submitFeedbackSchema.parse(req.body);

    const feedback = await knowledgeService.submitFeedback({
      userId,
      articleId: id,
      isHelpful: data.isHelpful,
      rating: data.rating,
      comment: data.comment,
    });

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback data',
        details: error.errors,
      });
    }

    logger.error('Submit feedback error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    });
  }
};

/**
 * Get related articles
 * GET /api/v1/knowledge/articles/:id/related
 */
export const getRelatedArticles = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    const limitNumber = limit && typeof limit === 'string' ? parseInt(limit, 10) : 5;

    const relatedArticles = await knowledgeService.getRelatedArticles(id, limitNumber);

    res.json({
      success: true,
      data: relatedArticles,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Article not found') {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    logger.error('Get related articles error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch related articles',
    });
  }
};

/**
 * Get popular articles
 * GET /api/v1/knowledge/popular
 */
export const getPopularArticles = async (req: AuthRequest, res: Response) => {
  try {
    const { limit } = req.query;
    const limitNumber = limit && typeof limit === 'string' ? parseInt(limit, 10) : 10;

    const articles = await knowledgeService.getPopularArticles(limitNumber);

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    logger.error('Get popular articles error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular articles',
    });
  }
};

/**
 * Get recent articles
 * GET /api/v1/knowledge/recent
 */
export const getRecentArticles = async (req: AuthRequest, res: Response) => {
  try {
    const { limit } = req.query;
    const limitNumber = limit && typeof limit === 'string' ? parseInt(limit, 10) : 10;

    const articles = await knowledgeService.getRecentArticles(limitNumber);

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    logger.error('Get recent articles error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent articles',
    });
  }
};

/**
 * Get all tags
 * GET /api/v1/knowledge/tags
 */
export const getAllTags = async (req: AuthRequest, res: Response) => {
  try {
    const tags = await knowledgeService.getAllTags();

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    logger.error('Get tags error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tags',
    });
  }
};

/**
 * Get search analytics (Admin only)
 * GET /api/v1/knowledge/analytics/search
 */
export const getSearchAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { limit, startDate, endDate } = req.query;

    const params: any = {};

    if (limit && typeof limit === 'string') {
      params.limit = parseInt(limit, 10);
    }

    if (startDate && typeof startDate === 'string') {
      params.startDate = new Date(startDate);
    }

    if (endDate && typeof endDate === 'string') {
      params.endDate = new Date(endDate);
    }

    const analytics = await knowledgeService.getSearchAnalytics(params);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Get search analytics error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search analytics',
    });
  }
};

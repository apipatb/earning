import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

interface CreateCategoryParams {
  name: string;
  description?: string;
  icon?: string;
  slug: string;
  displayOrder?: number;
}

interface UpdateCategoryParams {
  name?: string;
  description?: string;
  icon?: string;
  slug?: string;
  displayOrder?: number;
}

interface CreateArticleParams {
  categoryId: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author?: string;
  tags?: string[];
  published?: boolean;
}

interface UpdateArticleParams {
  categoryId?: string;
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  author?: string;
  tags?: string[];
  published?: boolean;
}

interface SearchParams {
  query: string;
  categoryId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

interface SubmitFeedbackParams {
  userId: string;
  articleId: string;
  isHelpful: boolean;
  rating?: number;
  comment?: string;
}

class KnowledgeService {
  /**
   * Get all categories with article counts
   */
  async getCategories() {
    const categories = await prisma.knowledgeBaseCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { articles: { where: { published: true } } },
        },
      },
    });

    return categories.map((category) => ({
      ...category,
      articleCount: category._count.articles,
      _count: undefined,
    }));
  }

  /**
   * Get a single category by ID or slug
   */
  async getCategory(idOrSlug: string) {
    const category = await prisma.knowledgeBaseCategory.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        articles: {
          where: { published: true },
          orderBy: { views: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            views: true,
            helpfulYes: true,
            helpfulNo: true,
            publishedAt: true,
          },
        },
      },
    });

    return category;
  }

  /**
   * Create a new category
   */
  async createCategory(params: CreateCategoryParams) {
    const category = await prisma.knowledgeBaseCategory.create({
      data: {
        name: params.name,
        description: params.description,
        icon: params.icon,
        slug: params.slug,
        displayOrder: params.displayOrder ?? 0,
      },
    });

    logger.info('Created knowledge base category', {
      categoryId: category.id,
      slug: category.slug,
    });

    return category;
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, params: UpdateCategoryParams) {
    const category = await prisma.knowledgeBaseCategory.update({
      where: { id },
      data: params,
    });

    logger.info('Updated knowledge base category', {
      categoryId: category.id,
    });

    return category;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string) {
    await prisma.knowledgeBaseCategory.delete({
      where: { id },
    });

    logger.info('Deleted knowledge base category', { categoryId: id });
  }

  /**
   * Get all published articles
   */
  async getArticles(params?: {
    categoryId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { published: true };

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: params?.limit,
      skip: params?.offset,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const total = await prisma.knowledgeBaseArticle.count({ where });

    return { articles, total };
  }

  /**
   * Get a single article by ID or slug
   */
  async getArticle(idOrSlug: string, includeUnpublished = false) {
    const where: any = {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    };

    if (!includeUnpublished) {
      where.published = true;
    }

    const article = await prisma.knowledgeBaseArticle.findFirst({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return article;
  }

  /**
   * Create a new article
   */
  async createArticle(params: CreateArticleParams) {
    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        categoryId: params.categoryId,
        title: params.title,
        slug: params.slug,
        content: params.content,
        excerpt: params.excerpt,
        author: params.author,
        tags: params.tags ? JSON.stringify(params.tags) : null,
        published: params.published ?? false,
        publishedAt: params.published ? new Date() : null,
      },
      include: {
        category: true,
      },
    });

    logger.info('Created knowledge base article', {
      articleId: article.id,
      slug: article.slug,
    });

    return article;
  }

  /**
   * Update an article
   */
  async updateArticle(id: string, params: UpdateArticleParams) {
    const currentArticle = await prisma.knowledgeBaseArticle.findUnique({
      where: { id },
    });

    if (!currentArticle) {
      throw new Error('Article not found');
    }

    const updateData: any = { ...params };

    // Update tags if provided
    if (params.tags) {
      updateData.tags = JSON.stringify(params.tags);
    }

    // Set publishedAt if article is being published for the first time
    if (params.published && !currentArticle.published) {
      updateData.publishedAt = new Date();
    }

    // Remove tags from updateData to prevent it from being passed as-is
    delete updateData.tags;

    const article = await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        ...updateData,
        tags: params.tags ? JSON.stringify(params.tags) : undefined,
      },
      include: {
        category: true,
      },
    });

    logger.info('Updated knowledge base article', { articleId: article.id });

    return article;
  }

  /**
   * Delete an article
   */
  async deleteArticle(id: string) {
    await prisma.knowledgeBaseArticle.delete({
      where: { id },
    });

    logger.info('Deleted knowledge base article', { articleId: id });
  }

  /**
   * Full-text search articles with ranking
   */
  async searchArticles(params: SearchParams, userId?: string) {
    const { query, categoryId, tags, limit = 10, offset = 0 } = params;

    // Build where clause
    const where: any = {
      published: true,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { excerpt: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (tags && tags.length > 0) {
      where.OR.push({
        tags: { contains: tags[0] },
      });
    }

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where,
      take: limit,
      skip: offset,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { views: 'desc' },
        { helpfulYes: 'desc' },
      ],
    });

    const total = await prisma.knowledgeBaseArticle.count({ where });

    // Log the search
    await prisma.searchLog.create({
      data: {
        userId,
        query,
        resultCount: total,
      },
    });

    logger.info('Knowledge base search performed', {
      query,
      resultCount: total,
      userId,
    });

    return { articles, total };
  }

  /**
   * Track article view
   */
  async trackView(articleId: string) {
    await prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: {
        views: { increment: 1 },
      },
    });

    logger.debug('Tracked article view', { articleId });
  }

  /**
   * Submit article feedback
   */
  async submitFeedback(params: SubmitFeedbackParams) {
    const { userId, articleId, isHelpful, rating, comment } = params;

    // Check if user already submitted feedback
    const existingFeedback = await prisma.helpFeedback.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    let feedback;

    if (existingFeedback) {
      // Update existing feedback
      feedback = await prisma.helpFeedback.update({
        where: {
          userId_articleId: {
            userId,
            articleId,
          },
        },
        data: {
          isHelpful,
          rating,
          comment,
        },
      });

      // Update article helpful counts
      await this.updateHelpfulCounts(articleId);
    } else {
      // Create new feedback
      feedback = await prisma.helpFeedback.create({
        data: {
          userId,
          articleId,
          isHelpful,
          rating,
          comment,
        },
      });

      // Increment helpful counts
      await prisma.knowledgeBaseArticle.update({
        where: { id: articleId },
        data: {
          [isHelpful ? 'helpfulYes' : 'helpfulNo']: { increment: 1 },
        },
      });
    }

    logger.info('Article feedback submitted', {
      userId,
      articleId,
      isHelpful,
    });

    return feedback;
  }

  /**
   * Update helpful counts for an article (when feedback is updated)
   */
  private async updateHelpfulCounts(articleId: string) {
    const feedbackStats = await prisma.helpFeedback.groupBy({
      by: ['isHelpful'],
      where: { articleId },
      _count: true,
    });

    const helpfulYes = feedbackStats.find((stat) => stat.isHelpful)?._count ?? 0;
    const helpfulNo = feedbackStats.find((stat) => !stat.isHelpful)?._count ?? 0;

    await prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: {
        helpfulYes,
        helpfulNo,
      },
    });
  }

  /**
   * Get user's feedback for an article
   */
  async getUserFeedback(userId: string, articleId: string) {
    const feedback = await prisma.helpFeedback.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    return feedback;
  }

  /**
   * Get related articles based on tags and category
   */
  async getRelatedArticles(articleId: string, limit = 5) {
    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    const tags = article.tags ? JSON.parse(article.tags) : [];

    // Build where clause for related articles
    const where: any = {
      id: { not: articleId },
      published: true,
    };

    // If article has tags, search for articles with similar tags
    if (tags.length > 0) {
      where.OR = tags.map((tag: string) => ({
        tags: { contains: tag },
      }));
    } else {
      // Otherwise, just show articles from the same category
      where.categoryId = article.categoryId;
    }

    const relatedArticles = await prisma.knowledgeBaseArticle.findMany({
      where,
      take: limit,
      orderBy: [
        { views: 'desc' },
        { helpfulYes: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        views: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return relatedArticles;
  }

  /**
   * Get popular articles
   */
  async getPopularArticles(limit = 10) {
    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: { published: true },
      take: limit,
      orderBy: [
        { views: 'desc' },
        { helpfulYes: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        views: true,
        helpfulYes: true,
        helpfulNo: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return articles;
  }

  /**
   * Get recently published articles
   */
  async getRecentArticles(limit = 10) {
    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: { published: true },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return articles;
  }

  /**
   * Convert markdown to HTML
   */
  convertMarkdownToHtml(markdown: string): string {
    const rawHtml = marked(markdown);
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    return sanitizedHtml;
  }

  /**
   * Get all unique tags
   */
  async getAllTags() {
    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: {
        published: true,
        tags: { not: null },
      },
      select: { tags: true },
    });

    const tagsSet = new Set<string>();

    articles.forEach((article) => {
      if (article.tags) {
        const tags = JSON.parse(article.tags);
        tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });

    return Array.from(tagsSet).sort();
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(params?: { limit?: number; startDate?: Date; endDate?: Date }) {
    const where: any = {};

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    // Top searches
    const topSearches = await prisma.searchLog.groupBy({
      by: ['query'],
      where,
      _count: true,
      orderBy: { _count: { query: 'desc' } },
      take: params?.limit ?? 10,
    });

    // Searches with no results
    const failedSearches = await prisma.searchLog.findMany({
      where: {
        ...where,
        resultCount: 0,
      },
      orderBy: { createdAt: 'desc' },
      take: params?.limit ?? 10,
      select: {
        query: true,
        createdAt: true,
      },
    });

    // Total searches
    const totalSearches = await prisma.searchLog.count({ where });

    return {
      topSearches: topSearches.map((s) => ({
        query: s.query,
        count: s._count,
      })),
      failedSearches,
      totalSearches,
    };
  }

  /**
   * Log search result click
   */
  async logSearchClick(articleId: string, userId?: string) {
    // Find the most recent search log for this user
    const recentSearch = await prisma.searchLog.findFirst({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (recentSearch) {
      await prisma.searchLog.update({
        where: { id: recentSearch.id },
        data: { articleId },
      });
    }

    logger.debug('Logged search click', { articleId, userId });
  }
}

export const knowledgeService = new KnowledgeService();

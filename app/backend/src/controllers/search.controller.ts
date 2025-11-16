import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { elasticsearchService, INDICES } from '../services/elasticsearch.service';
import { logger } from '../utils/logger';

// Validation schemas
const globalSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  from: z.coerce.number().min(0).optional().default(0),
  size: z.coerce.number().min(1).max(100).optional().default(20),
});

const searchTicketsSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.string().optional(),
  assignedTo: z.string().optional(),
  slaBreach: z.coerce.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  from: z.coerce.number().min(0).optional().default(0),
  size: z.coerce.number().min(1).max(100).optional().default(20),
  facets: z.array(z.string()).optional(),
});

const searchMessagesSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  roomId: z.string().optional(),
  senderId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  from: z.coerce.number().min(0).optional().default(0),
  size: z.coerce.number().min(1).max(100).optional().default(20),
});

const searchCustomersSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  minPurchases: z.coerce.number().optional(),
  maxPurchases: z.coerce.number().optional(),
  from: z.coerce.number().min(0).optional().default(0),
  size: z.coerce.number().min(1).max(100).optional().default(20),
  facets: z.array(z.string()).optional(),
});

const searchDocumentsSchema = z.object({
  q: z.string().optional(),
  contentType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  from: z.coerce.number().min(0).optional().default(0),
  size: z.coerce.number().min(1).max(100).optional().default(20),
});

const suggestionsSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  field: z.string().min(1, 'Field is required'),
  index: z.enum(['tickets', 'chat_messages', 'customers', 'documents']),
  size: z.coerce.number().min(1).max(20).optional().default(10),
});

/**
 * Global search across all indices
 * GET /api/v1/search
 */
export const globalSearch = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = globalSearchSchema.parse(req.query);

    const results = await elasticsearchService.globalSearch(
      userId,
      validatedData.q,
      validatedData.from,
      validatedData.size
    );

    res.json({
      success: true,
      data: {
        query: validatedData.q,
        results,
      },
    });
  } catch (error: any) {
    logger.error('Global search error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Global search failed',
    });
  }
};

/**
 * Search tickets with filters and facets
 * GET /api/v1/search/tickets
 */
export const searchTickets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = searchTicketsSchema.parse(req.query);

    const filters: Record<string, any> = { userId };

    // Add status filter
    if (validatedData.status) {
      filters.status = validatedData.status;
    }

    // Add priority filter
    if (validatedData.priority) {
      filters.priority = validatedData.priority;
    }

    // Add category filter
    if (validatedData.category) {
      filters.category = validatedData.category;
    }

    // Add assignedTo filter
    if (validatedData.assignedTo) {
      filters.assignedTo = validatedData.assignedTo;
    }

    // Add slaBreach filter
    if (validatedData.slaBreach !== undefined) {
      filters.slaBreach = validatedData.slaBreach;
    }

    // Add date range filter
    if (validatedData.dateFrom || validatedData.dateTo) {
      filters.createdAt = {};
      if (validatedData.dateFrom) {
        filters.createdAt.gte = validatedData.dateFrom;
      }
      if (validatedData.dateTo) {
        filters.createdAt.lte = validatedData.dateTo;
      }
    }

    let results;
    if (validatedData.facets && validatedData.facets.length > 0) {
      // Faceted search with aggregations
      results = await elasticsearchService.facetedSearch(
        INDICES.TICKETS,
        validatedData.q || '',
        validatedData.facets,
        undefined,
        validatedData.from,
        validatedData.size
      );
    } else {
      // Regular search
      results = await elasticsearchService.search(INDICES.TICKETS, {
        query: validatedData.q || '',
        filters,
        from: validatedData.from,
        size: validatedData.size,
        highlight: true,
      });
    }

    res.json({
      success: true,
      data: {
        total: results.hits.total.value,
        tickets: results.hits.hits.map((hit) => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
          highlight: hit.highlight,
        })),
        facets: results.aggregations,
        pagination: {
          from: validatedData.from,
          size: validatedData.size,
          total: results.hits.total.value,
        },
      },
    });
  } catch (error: any) {
    logger.error('Search tickets error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Ticket search failed',
    });
  }
};

/**
 * Search chat messages
 * GET /api/v1/search/messages
 */
export const searchMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = searchMessagesSchema.parse(req.query);

    const filters: Record<string, any> = { userId };

    // Add roomId filter
    if (validatedData.roomId) {
      filters.roomId = validatedData.roomId;
    }

    // Add senderId filter
    if (validatedData.senderId) {
      filters.senderId = validatedData.senderId;
    }

    // Add date range filter
    if (validatedData.dateFrom || validatedData.dateTo) {
      filters.createdAt = {};
      if (validatedData.dateFrom) {
        filters.createdAt.gte = validatedData.dateFrom;
      }
      if (validatedData.dateTo) {
        filters.createdAt.lte = validatedData.dateTo;
      }
    }

    const results = await elasticsearchService.search(INDICES.MESSAGES, {
      query: validatedData.q,
      filters,
      from: validatedData.from,
      size: validatedData.size,
      highlight: true,
      sort: [{ createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: {
        total: results.hits.total.value,
        messages: results.hits.hits.map((hit) => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
          highlight: hit.highlight,
        })),
        pagination: {
          from: validatedData.from,
          size: validatedData.size,
          total: results.hits.total.value,
        },
      },
    });
  } catch (error: any) {
    logger.error('Search messages error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Message search failed',
    });
  }
};

/**
 * Search customers with filters and facets
 * GET /api/v1/search/customers
 */
export const searchCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = searchCustomersSchema.parse(req.query);

    const filters: Record<string, any> = { userId };

    // Add city filter
    if (validatedData.city) {
      filters.city = validatedData.city;
    }

    // Add country filter
    if (validatedData.country) {
      filters.country = validatedData.country;
    }

    // Add isActive filter
    if (validatedData.isActive !== undefined) {
      filters.isActive = validatedData.isActive;
    }

    // Add purchase range filter
    if (validatedData.minPurchases !== undefined || validatedData.maxPurchases !== undefined) {
      filters.totalPurchases = {};
      if (validatedData.minPurchases !== undefined) {
        filters.totalPurchases.gte = validatedData.minPurchases;
      }
      if (validatedData.maxPurchases !== undefined) {
        filters.totalPurchases.lte = validatedData.maxPurchases;
      }
    }

    let results;
    if (validatedData.facets && validatedData.facets.length > 0) {
      // Faceted search with aggregations
      results = await elasticsearchService.facetedSearch(
        INDICES.CUSTOMERS,
        validatedData.q || '',
        validatedData.facets,
        undefined,
        validatedData.from,
        validatedData.size
      );
    } else {
      // Regular search
      results = await elasticsearchService.search(INDICES.CUSTOMERS, {
        query: validatedData.q || '',
        filters,
        from: validatedData.from,
        size: validatedData.size,
        highlight: true,
      });
    }

    res.json({
      success: true,
      data: {
        total: results.hits.total.value,
        customers: results.hits.hits.map((hit) => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
          highlight: hit.highlight,
        })),
        facets: results.aggregations,
        pagination: {
          from: validatedData.from,
          size: validatedData.size,
          total: results.hits.total.value,
        },
      },
    });
  } catch (error: any) {
    logger.error('Search customers error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Customer search failed',
    });
  }
};

/**
 * Search documents
 * GET /api/v1/search/documents
 */
export const searchDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = searchDocumentsSchema.parse(req.query);

    const filters: Record<string, any> = { userId };

    // Add contentType filter
    if (validatedData.contentType) {
      filters.contentType = validatedData.contentType;
    }

    // Add tags filter
    if (validatedData.tags && validatedData.tags.length > 0) {
      filters.tags = validatedData.tags;
    }

    // Add date range filter
    if (validatedData.dateFrom || validatedData.dateTo) {
      filters.createdAt = {};
      if (validatedData.dateFrom) {
        filters.createdAt.gte = validatedData.dateFrom;
      }
      if (validatedData.dateTo) {
        filters.createdAt.lte = validatedData.dateTo;
      }
    }

    const results = await elasticsearchService.search(INDICES.DOCUMENTS, {
      query: validatedData.q || '',
      filters,
      from: validatedData.from,
      size: validatedData.size,
      highlight: true,
    });

    res.json({
      success: true,
      data: {
        total: results.hits.total.value,
        documents: results.hits.hits.map((hit) => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
          highlight: hit.highlight,
        })),
        pagination: {
          from: validatedData.from,
          size: validatedData.size,
          total: results.hits.total.value,
        },
      },
    });
  } catch (error: any) {
    logger.error('Search documents error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Document search failed',
    });
  }
};

/**
 * Get autocomplete suggestions
 * GET /api/v1/search/suggestions
 */
export const getSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = suggestionsSchema.parse(req.query);

    const suggestions = await elasticsearchService.autocomplete(
      validatedData.index,
      validatedData.field,
      validatedData.q,
      validatedData.size
    );

    res.json({
      success: true,
      data: {
        query: validatedData.q,
        field: validatedData.field,
        suggestions,
      },
    });
  } catch (error: any) {
    logger.error('Get suggestions error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get suggestions',
    });
  }
};

/**
 * Get search analytics
 * GET /api/v1/search/analytics
 */
export const getSearchAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { index } = req.query;

    if (!index || !Object.values(INDICES).includes(index as string)) {
      return res.status(400).json({
        success: false,
        error: 'Valid index is required',
      });
    }

    // Define aggregations based on index
    let aggregations: Record<string, any> = {};

    switch (index) {
      case INDICES.TICKETS:
        aggregations = {
          byStatus: { terms: { field: 'status', size: 10 } },
          byPriority: { terms: { field: 'priority', size: 10 } },
          byCategory: { terms: { field: 'category', size: 20 } },
          overTime: {
            date_histogram: {
              field: 'createdAt',
              calendar_interval: 'day',
            },
          },
        };
        break;
      case INDICES.CUSTOMERS:
        aggregations = {
          byCountry: { terms: { field: 'country', size: 20 } },
          byCity: { terms: { field: 'city', size: 30 } },
          totalPurchases: { sum: { field: 'totalPurchases' } },
          avgPurchases: { avg: { field: 'totalPurchases' } },
        };
        break;
      case INDICES.DOCUMENTS:
        aggregations = {
          byContentType: { terms: { field: 'contentType', size: 20 } },
          byTag: { terms: { field: 'tags', size: 30 } },
          totalSize: { sum: { field: 'size' } },
        };
        break;
      case INDICES.MESSAGES:
        aggregations = {
          byRoom: { terms: { field: 'roomId', size: 20 } },
          overTime: {
            date_histogram: {
              field: 'createdAt',
              calendar_interval: 'hour',
            },
          },
        };
        break;
    }

    const results = await elasticsearchService.getAggregations(
      index as string,
      aggregations,
      { userId }
    );

    res.json({
      success: true,
      data: {
        index,
        analytics: results,
      },
    });
  } catch (error: any) {
    logger.error('Get search analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get search analytics',
    });
  }
};

/**
 * Health check for Elasticsearch
 * GET /api/v1/search/health
 */
export const healthCheck = async (req: AuthRequest, res: Response) => {
  try {
    const health = await elasticsearchService.healthCheck();

    res.json({
      success: true,
      data: health,
    });
  } catch (error: any) {
    logger.error('Elasticsearch health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Health check failed',
    });
  }
};

/**
 * Reindex all data (admin only)
 * POST /api/v1/search/reindex
 */
export const reindexAll = async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Add admin role check
    const userId = req.user!.id;

    await elasticsearchService.reindexAll(userId);

    res.json({
      success: true,
      message: 'Reindex operation completed successfully',
    });
  } catch (error: any) {
    logger.error('Reindex error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Reindex operation failed',
    });
  }
};

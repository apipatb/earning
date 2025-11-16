import { Request, Response, NextFunction } from 'express';
import { elasticsearchService, INDICES } from '../services/elasticsearch.service';
import { logger } from '../utils/logger';

/**
 * Middleware to automatically sync data to Elasticsearch after successful operations
 * This should be applied to routes that create, update, or delete searchable entities
 */

export interface ElasticsearchSyncOptions {
  index: string;
  operation: 'index' | 'update' | 'delete';
  getDocumentId: (req: Request, res: Response) => string | null;
  getDocument?: (req: Request, res: Response) => any;
}

/**
 * Generic Elasticsearch sync middleware factory
 */
export const createElasticsearchSyncMiddleware = (options: ElasticsearchSyncOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json function
    const originalJson = res.json.bind(res);

    // Override json function to sync after successful response
    res.json = function (body: any): Response {
      // Only sync if response was successful (2xx status code)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Sync to Elasticsearch asynchronously (don't block response)
        setImmediate(async () => {
          try {
            const documentId = options.getDocumentId(req, res);
            if (!documentId) {
              logger.warn('Cannot sync to Elasticsearch: No document ID');
              return;
            }

            switch (options.operation) {
              case 'index':
              case 'update':
                if (!options.getDocument) {
                  logger.warn('Cannot sync to Elasticsearch: No document getter provided');
                  return;
                }
                const document = options.getDocument(req, res);
                if (!document) {
                  logger.warn('Cannot sync to Elasticsearch: No document returned');
                  return;
                }

                if (options.operation === 'index') {
                  await elasticsearchService.indexDocument(options.index, documentId, document);
                } else {
                  await elasticsearchService.updateDocument(options.index, documentId, document);
                }
                logger.debug(`Synced ${options.operation} to Elasticsearch: ${options.index}/${documentId}`);
                break;

              case 'delete':
                await elasticsearchService.deleteDocument(options.index, documentId);
                logger.debug(`Synced delete to Elasticsearch: ${options.index}/${documentId}`);
                break;
            }
          } catch (error) {
            // Log error but don't fail the request
            logger.error('Failed to sync to Elasticsearch:', error);
          }
        });
      }

      // Call original json function
      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware for syncing ticket operations to Elasticsearch
 */

// Index new ticket
export const indexTicket = createElasticsearchSyncMiddleware({
  index: INDICES.TICKETS,
  operation: 'index',
  getDocumentId: (req, res) => {
    // Extract ticket ID from response body
    const body = (res as any).locals?.responseBody || {};
    return body.data?.id || body.ticket?.id || null;
  },
  getDocument: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    const ticket = body.data || body.ticket;
    if (!ticket) return null;

    return {
      userId: ticket.userId,
      customerId: ticket.customerId,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      tags: ticket.tags ? (typeof ticket.tags === 'string' ? JSON.parse(ticket.tags) : ticket.tags) : [],
      source: ticket.source,
      assignedTo: ticket.assignedTo,
      slaBreach: ticket.slaBreach || false,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
    };
  },
});

// Update existing ticket
export const updateTicket = createElasticsearchSyncMiddleware({
  index: INDICES.TICKETS,
  operation: 'update',
  getDocumentId: (req, res) => {
    return req.params.id || null;
  },
  getDocument: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    const ticket = body.data || body.ticket;
    if (!ticket) return null;

    return {
      userId: ticket.userId,
      customerId: ticket.customerId,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      tags: ticket.tags ? (typeof ticket.tags === 'string' ? JSON.parse(ticket.tags) : ticket.tags) : [],
      source: ticket.source,
      assignedTo: ticket.assignedTo,
      slaBreach: ticket.slaBreach || false,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
    };
  },
});

// Delete ticket
export const deleteTicket = createElasticsearchSyncMiddleware({
  index: INDICES.TICKETS,
  operation: 'delete',
  getDocumentId: (req, res) => {
    return req.params.id || null;
  },
});

/**
 * Middleware for syncing chat message operations to Elasticsearch
 */

// Index new message
export const indexMessage = createElasticsearchSyncMiddleware({
  index: INDICES.MESSAGES,
  operation: 'index',
  getDocumentId: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    return body.data?.id || body.message?.id || null;
  },
  getDocument: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    const message = body.data || body.message;
    if (!message) return null;

    return {
      userId: message.userId,
      roomId: message.roomId,
      senderId: message.senderId,
      content: message.content,
      isInternal: message.isInternal || false,
      readBy: message.readBy || [],
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  },
});

// Update message
export const updateMessage = createElasticsearchSyncMiddleware({
  index: INDICES.MESSAGES,
  operation: 'update',
  getDocumentId: (req, res) => {
    return req.params.id || null;
  },
  getDocument: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    const message = body.data || body.message;
    if (!message) return null;

    return {
      content: message.content,
      readBy: message.readBy || [],
      updatedAt: message.updatedAt,
    };
  },
});

// Delete message
export const deleteMessage = createElasticsearchSyncMiddleware({
  index: INDICES.MESSAGES,
  operation: 'delete',
  getDocumentId: (req, res) => {
    return req.params.id || null;
  },
});

/**
 * Middleware for syncing customer operations to Elasticsearch
 */

// Index new customer
export const indexCustomer = createElasticsearchSyncMiddleware({
  index: INDICES.CUSTOMERS,
  operation: 'index',
  getDocumentId: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    return body.customer?.id || body.data?.id || null;
  },
  getDocument: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    const customer = body.customer || body.data;
    if (!customer) return null;

    return {
      userId: customer.userId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      notes: customer.notes,
      totalPurchases: customer.totalPurchases || 0,
      purchaseCount: customer.purchaseCount || 0,
      lastPurchase: customer.lastPurchase,
      isActive: customer.isActive !== undefined ? customer.isActive : true,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  },
});

// Update customer
export const updateCustomer = createElasticsearchSyncMiddleware({
  index: INDICES.CUSTOMERS,
  operation: 'update',
  getDocumentId: (req, res) => {
    return req.params.id || null;
  },
  getDocument: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    const customer = body.customer || body.data;
    if (!customer) return null;

    return {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      notes: customer.notes,
      totalPurchases: customer.totalPurchases,
      purchaseCount: customer.purchaseCount,
      lastPurchase: customer.lastPurchase,
      isActive: customer.isActive,
      updatedAt: customer.updatedAt,
    };
  },
});

// Delete customer
export const deleteCustomer = createElasticsearchSyncMiddleware({
  index: INDICES.CUSTOMERS,
  operation: 'delete',
  getDocumentId: (req, res) => {
    return req.params.id || null;
  },
});

/**
 * Middleware for syncing document operations to Elasticsearch
 */

// Index new document
export const indexDocument = createElasticsearchSyncMiddleware({
  index: INDICES.DOCUMENTS,
  operation: 'index',
  getDocumentId: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    return body.data?.id || body.document?.id || body.file?.id || null;
  },
  getDocument: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    const doc = body.data || body.document || body.file;
    if (!doc) return null;

    return {
      userId: doc.userId,
      filename: doc.filename || doc.name,
      content: doc.content || '',
      contentType: doc.contentType || doc.mimeType,
      size: doc.size,
      url: doc.url,
      metadata: doc.metadata || {},
      tags: doc.tags || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
});

// Update document
export const updateDocument = createElasticsearchSyncMiddleware({
  index: INDICES.DOCUMENTS,
  operation: 'update',
  getDocumentId: (req, res) => {
    return req.params.id || null;
  },
  getDocument: (req, res) => {
    const body = (res as any).locals?.responseBody || {};
    const doc = body.data || body.document || body.file;
    if (!doc) return null;

    return {
      filename: doc.filename || doc.name,
      content: doc.content,
      tags: doc.tags,
      metadata: doc.metadata,
      updatedAt: doc.updatedAt,
    };
  },
});

// Delete document
export const deleteDocument = createElasticsearchSyncMiddleware({
  index: INDICES.DOCUMENTS,
  operation: 'delete',
  getDocumentId: (req, res) => {
    return req.params.id || null;
  },
});

/**
 * Middleware to capture response body for Elasticsearch sync
 * This should be applied before the sync middleware
 */
export const captureResponseBody = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    // Store response body in res.locals for sync middleware
    (res as any).locals = (res as any).locals || {};
    (res as any).locals.responseBody = body;

    return originalJson(body);
  };

  next();
};

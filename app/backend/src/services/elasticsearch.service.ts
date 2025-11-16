import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';

// Elasticsearch client configuration
const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_API_KEY
    ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
    : process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD
    ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      }
    : undefined,
});

// Index names
export const INDICES = {
  TICKETS: 'tickets',
  MESSAGES: 'chat_messages',
  CUSTOMERS: 'customers',
  DOCUMENTS: 'documents',
};

// Type definitions for search results
export interface SearchHighlight {
  [key: string]: string[];
}

export interface SearchResult<T = any> {
  _id: string;
  _score: number;
  _source: T;
  highlight?: SearchHighlight;
}

export interface SearchResponse<T = any> {
  hits: {
    total: { value: number; relation: string };
    hits: SearchResult<T>[];
  };
  aggregations?: any;
}

export interface SearchOptions {
  query: string;
  filters?: Record<string, any>;
  from?: number;
  size?: number;
  sort?: Array<Record<string, any>>;
  highlight?: boolean;
  aggregations?: Record<string, any>;
}

export interface FacetFilter {
  field: string;
  value: string | string[];
}

export class ElasticsearchService {
  private client: Client;

  constructor() {
    this.client = client;
  }

  /**
   * Initialize Elasticsearch indices with mappings
   */
  async initializeIndices(): Promise<void> {
    try {
      // Check cluster health
      const health = await this.client.cluster.health();
      logger.info(`Elasticsearch cluster health: ${health.status}`);

      // Create indices with mappings
      await this.createTicketsIndex();
      await this.createMessagesIndex();
      await this.createCustomersIndex();
      await this.createDocumentsIndex();

      logger.info('Elasticsearch indices initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch indices:', error);
      // Don't throw - allow app to start even if Elasticsearch is unavailable
    }
  }

  /**
   * Create tickets index with mapping
   */
  private async createTicketsIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INDICES.TICKETS });
    if (exists) {
      logger.info(`Index ${INDICES.TICKETS} already exists`);
      return;
    }

    await this.client.indices.create({
      index: INDICES.TICKETS,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              autocomplete: {
                tokenizer: 'autocomplete',
                filter: ['lowercase'],
              },
              autocomplete_search: {
                tokenizer: 'lowercase',
              },
            },
            tokenizer: {
              autocomplete: {
                type: 'edge_ngram',
                min_gram: 2,
                max_gram: 10,
                token_chars: ['letter', 'digit'],
              },
            },
          },
        },
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            customerId: { type: 'keyword' },
            subject: {
              type: 'text',
              analyzer: 'autocomplete',
              search_analyzer: 'autocomplete_search',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            description: {
              type: 'text',
              analyzer: 'standard',
            },
            status: { type: 'keyword' },
            priority: { type: 'keyword' },
            category: { type: 'keyword' },
            tags: { type: 'keyword' },
            source: { type: 'keyword' },
            assignedTo: { type: 'keyword' },
            slaBreach: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            resolvedAt: { type: 'date' },
            closedAt: { type: 'date' },
          },
        },
      },
    });
    logger.info(`Created index: ${INDICES.TICKETS}`);
  }

  /**
   * Create chat messages index with mapping
   */
  private async createMessagesIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INDICES.MESSAGES });
    if (exists) {
      logger.info(`Index ${INDICES.MESSAGES} already exists`);
      return;
    }

    await this.client.indices.create({
      index: INDICES.MESSAGES,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        },
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            roomId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            content: {
              type: 'text',
              analyzer: 'standard',
            },
            isInternal: { type: 'boolean' },
            readBy: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      },
    });
    logger.info(`Created index: ${INDICES.MESSAGES}`);
  }

  /**
   * Create customers index with mapping
   */
  private async createCustomersIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INDICES.CUSTOMERS });
    if (exists) {
      logger.info(`Index ${INDICES.CUSTOMERS} already exists`);
      return;
    }

    await this.client.indices.create({
      index: INDICES.CUSTOMERS,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        },
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            name: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            email: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            phone: { type: 'keyword' },
            company: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            address: { type: 'text' },
            city: { type: 'keyword' },
            country: { type: 'keyword' },
            notes: { type: 'text' },
            totalPurchases: { type: 'float' },
            purchaseCount: { type: 'integer' },
            lastPurchase: { type: 'date' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      },
    });
    logger.info(`Created index: ${INDICES.CUSTOMERS}`);
  }

  /**
   * Create documents index with mapping
   */
  private async createDocumentsIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INDICES.DOCUMENTS });
    if (exists) {
      logger.info(`Index ${INDICES.DOCUMENTS} already exists`);
      return;
    }

    await this.client.indices.create({
      index: INDICES.DOCUMENTS,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        },
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            filename: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            content: { type: 'text' },
            contentType: { type: 'keyword' },
            size: { type: 'long' },
            url: { type: 'keyword' },
            metadata: { type: 'object', enabled: false },
            tags: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      },
    });
    logger.info(`Created index: ${INDICES.DOCUMENTS}`);
  }

  /**
   * Index a document
   */
  async indexDocument(index: string, id: string, document: any): Promise<void> {
    try {
      await this.client.index({
        index,
        id,
        document,
        refresh: 'wait_for',
      });
      logger.debug(`Indexed document ${id} in ${index}`);
    } catch (error) {
      logger.error(`Failed to index document ${id} in ${index}:`, error);
      throw error;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndexDocuments(index: string, documents: Array<{ id: string; doc: any }>): Promise<void> {
    try {
      const operations = documents.flatMap(({ id, doc }) => [
        { index: { _index: index, _id: id } },
        doc,
      ]);

      const result = await this.client.bulk({
        refresh: 'wait_for',
        operations,
      });

      if (result.errors) {
        logger.error('Bulk indexing had errors:', result.items);
      } else {
        logger.info(`Bulk indexed ${documents.length} documents in ${index}`);
      }
    } catch (error) {
      logger.error(`Failed to bulk index documents in ${index}:`, error);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(index: string, id: string, document: any): Promise<void> {
    try {
      await this.client.update({
        index,
        id,
        doc: document,
        refresh: 'wait_for',
      });
      logger.debug(`Updated document ${id} in ${index}`);
    } catch (error) {
      logger.error(`Failed to update document ${id} in ${index}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(index: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index,
        id,
        refresh: 'wait_for',
      });
      logger.debug(`Deleted document ${id} from ${index}`);
    } catch (error) {
      // Ignore 404 errors
      if ((error as any).meta?.statusCode !== 404) {
        logger.error(`Failed to delete document ${id} from ${index}:`, error);
        throw error;
      }
    }
  }

  /**
   * Full-text search across multiple fields
   */
  async search<T = any>(index: string, options: SearchOptions): Promise<SearchResponse<T>> {
    try {
      const { query, filters = {}, from = 0, size = 20, sort, highlight = true, aggregations } = options;

      // Build query
      const must: any[] = [];
      const filter: any[] = [];

      // Add full-text search query
      if (query) {
        must.push({
          multi_match: {
            query,
            fields: this.getSearchFieldsForIndex(index),
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      }

      // Add filters
      Object.entries(filters).forEach(([field, value]) => {
        if (Array.isArray(value)) {
          filter.push({ terms: { [field]: value } });
        } else if (typeof value === 'object' && value !== null) {
          // Range query
          filter.push({ range: { [field]: value } });
        } else {
          filter.push({ term: { [field]: value } });
        }
      });

      const body: any = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter: filter.length > 0 ? filter : undefined,
          },
        },
        from,
        size,
        sort: sort || [{ _score: 'desc' }, { createdAt: 'desc' }],
      };

      // Add highlighting
      if (highlight && query) {
        body.highlight = {
          fields: this.getHighlightFieldsForIndex(index),
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
          fragment_size: 150,
          number_of_fragments: 3,
        };
      }

      // Add aggregations
      if (aggregations) {
        body.aggs = aggregations;
      }

      const result = await this.client.search({
        index,
        body,
      });

      return result as SearchResponse<T>;
    } catch (error) {
      logger.error(`Search failed in ${index}:`, error);
      throw error;
    }
  }

  /**
   * Faceted search with aggregations
   */
  async facetedSearch<T = any>(
    index: string,
    query: string,
    facets: string[],
    filters?: FacetFilter[],
    from: number = 0,
    size: number = 20
  ): Promise<SearchResponse<T>> {
    try {
      const must: any[] = [];
      const filter: any[] = [];

      // Add query
      if (query) {
        must.push({
          multi_match: {
            query,
            fields: this.getSearchFieldsForIndex(index),
            fuzziness: 'AUTO',
          },
        });
      }

      // Add filters
      if (filters) {
        filters.forEach(({ field, value }) => {
          if (Array.isArray(value)) {
            filter.push({ terms: { [field]: value } });
          } else {
            filter.push({ term: { [field]: value } });
          }
        });
      }

      // Build aggregations
      const aggregations: Record<string, any> = {};
      facets.forEach((facet) => {
        aggregations[facet] = {
          terms: {
            field: facet,
            size: 100,
          },
        };
      });

      const body: any = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter: filter.length > 0 ? filter : undefined,
          },
        },
        from,
        size,
        aggs: aggregations,
      };

      const result = await this.client.search({
        index,
        body,
      });

      return result as SearchResponse<T>;
    } catch (error) {
      logger.error(`Faceted search failed in ${index}:`, error);
      throw error;
    }
  }

  /**
   * Autocomplete/suggestions
   */
  async autocomplete(index: string, field: string, query: string, size: number = 10): Promise<string[]> {
    try {
      const result = await this.client.search({
        index,
        body: {
          suggest: {
            autocomplete: {
              prefix: query,
              completion: {
                field,
                size,
                skip_duplicates: true,
              },
            },
          },
        },
      });

      const suggestions = result.suggest?.autocomplete?.[0]?.options || [];
      return suggestions.map((option: any) => option.text);
    } catch (error) {
      // If completion suggester is not configured, fall back to prefix query
      try {
        const result = await this.client.search({
          index,
          body: {
            query: {
              prefix: {
                [field]: query.toLowerCase(),
              },
            },
            size,
            _source: [field],
          },
        });

        const hits = result.hits.hits;
        const values = new Set<string>();
        hits.forEach((hit: any) => {
          const value = hit._source[field];
          if (value) values.add(value);
        });

        return Array.from(values);
      } catch (fallbackError) {
        logger.error(`Autocomplete failed in ${index} for field ${field}:`, fallbackError);
        return [];
      }
    }
  }

  /**
   * Get analytics aggregations
   */
  async getAggregations(
    index: string,
    aggregations: Record<string, any>,
    filters?: Record<string, any>
  ): Promise<any> {
    try {
      const filter: any[] = [];

      // Add filters
      if (filters) {
        Object.entries(filters).forEach(([field, value]) => {
          if (Array.isArray(value)) {
            filter.push({ terms: { [field]: value } });
          } else if (typeof value === 'object' && value !== null) {
            filter.push({ range: { [field]: value } });
          } else {
            filter.push({ term: { [field]: value } });
          }
        });
      }

      const result = await this.client.search({
        index,
        body: {
          query: {
            bool: {
              filter: filter.length > 0 ? filter : undefined,
            },
          },
          size: 0,
          aggs: aggregations,
        },
      });

      return result.aggregations;
    } catch (error) {
      logger.error(`Aggregations failed in ${index}:`, error);
      throw error;
    }
  }

  /**
   * Global search across all indices
   */
  async globalSearch(userId: string, query: string, from: number = 0, size: number = 20): Promise<any> {
    try {
      const indices = Object.values(INDICES);
      const results: Record<string, any> = {};

      // Search each index in parallel
      const searches = await Promise.allSettled(
        indices.map((index) =>
          this.search(index, {
            query,
            filters: { userId },
            from,
            size,
            highlight: true,
          })
        )
      );

      // Combine results
      indices.forEach((index, i) => {
        const result = searches[i];
        if (result.status === 'fulfilled') {
          results[index] = {
            total: result.value.hits.total.value,
            hits: result.value.hits.hits.map((hit) => ({
              id: hit._id,
              score: hit._score,
              data: hit._source,
              highlight: hit.highlight,
            })),
          };
        } else {
          results[index] = { total: 0, hits: [], error: result.reason };
        }
      });

      return results;
    } catch (error) {
      logger.error('Global search failed:', error);
      throw error;
    }
  }

  /**
   * Get search fields for an index
   */
  private getSearchFieldsForIndex(index: string): string[] {
    const fieldMap: Record<string, string[]> = {
      [INDICES.TICKETS]: ['subject^3', 'description^2', 'tags', 'category'],
      [INDICES.MESSAGES]: ['content^2'],
      [INDICES.CUSTOMERS]: ['name^3', 'email^2', 'company^2', 'phone', 'notes'],
      [INDICES.DOCUMENTS]: ['filename^3', 'content^2', 'tags'],
    };
    return fieldMap[index] || ['*'];
  }

  /**
   * Get highlight fields for an index
   */
  private getHighlightFieldsForIndex(index: string): Record<string, any> {
    const fieldMap: Record<string, Record<string, any>> = {
      [INDICES.TICKETS]: {
        subject: {},
        description: {},
      },
      [INDICES.MESSAGES]: {
        content: {},
      },
      [INDICES.CUSTOMERS]: {
        name: {},
        email: {},
        company: {},
        notes: {},
      },
      [INDICES.DOCUMENTS]: {
        filename: {},
        content: {},
      },
    };
    return fieldMap[index] || { '*': {} };
  }

  /**
   * Reindex all data from database (admin operation)
   */
  async reindexAll(userId?: string): Promise<void> {
    logger.info('Starting reindex operation...');
    // This would be implemented based on your specific needs
    // You would fetch data from Prisma and bulk index it
    logger.info('Reindex operation completed');
  }

  /**
   * Check Elasticsearch health
   */
  async healthCheck(): Promise<{ status: string; cluster: any }> {
    try {
      const health = await this.client.cluster.health();
      const info = await this.client.info();
      return {
        status: 'healthy',
        cluster: {
          name: health.cluster_name,
          status: health.status,
          nodes: health.number_of_nodes,
          version: info.version.number,
        },
      };
    } catch (error) {
      logger.error('Elasticsearch health check failed:', error);
      return {
        status: 'unhealthy',
        cluster: null,
      };
    }
  }
}

export const elasticsearchService = new ElasticsearchService();

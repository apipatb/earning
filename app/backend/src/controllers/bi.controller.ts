import { Response } from 'express';
import { AuthRequest } from '../types';
import { biService } from '../services/bi.service';
import { logger } from '../utils/logger';

/**
 * BI Controller for Looker/Tableau Integration
 * Provides endpoints for BI tools to access aggregated data
 */

/**
 * @swagger
 * /api/v1/bi/metrics:
 *   get:
 *     summary: Get aggregated BI metrics
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for metrics (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for metrics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: BI metrics retrieved successfully
 */
export const getMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date } = req.query;

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    const metrics = await biService.getBIMetrics(userId, startDate, endDate);

    res.json(metrics);
  } catch (error) {
    logger.error('Get BI metrics error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch BI metrics',
    });
  }
};

/**
 * @swagger
 * /api/v1/bi/dimensions:
 *   get:
 *     summary: Get dimension tables for BI tools
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [user, product, customer, date]
 *         required: true
 *         description: Dimension type to retrieve
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for date dimension (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for date dimension (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Dimension data retrieved successfully
 */
export const getDimensions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, start_date, end_date } = req.query;

    if (!type) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Dimension type is required',
      });
    }

    let data;

    switch (type) {
      case 'user':
        data = await biService.getUserDimension(userId);
        break;
      case 'product':
        data = await biService.getProductDimension(userId);
        break;
      case 'customer':
        data = await biService.getCustomerDimension(userId);
        break;
      case 'date':
        const startDate = start_date
          ? new Date(start_date as string)
          : new Date(new Date().getFullYear(), 0, 1);
        const endDate = end_date
          ? new Date(end_date as string)
          : new Date();
        data = await biService.getDateDimension(startDate, endDate);
        break;
      default:
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid dimension type',
        });
    }

    res.json({
      dimension: type,
      count: data.length,
      data,
    });
  } catch (error) {
    logger.error('Get dimensions error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch dimensions',
    });
  }
};

/**
 * @swagger
 * /api/v1/bi/facts:
 *   get:
 *     summary: Get fact tables for BI tools
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [earnings, sales, invoices]
 *         required: true
 *         description: Fact table type to retrieve
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for fact data (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for fact data (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Fact data retrieved successfully
 */
export const getFacts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, start_date, end_date } = req.query;

    if (!type) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Fact type is required',
      });
    }

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    let data;

    switch (type) {
      case 'earnings':
        data = await biService.getEarningsFact(userId, startDate, endDate);
        break;
      case 'sales':
        data = await biService.getSalesFact(userId, startDate, endDate);
        break;
      case 'invoices':
        data = await biService.getInvoicesFact(userId, startDate, endDate);
        break;
      default:
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid fact type',
        });
    }

    res.json({
      fact: type,
      count: data.length,
      data,
    });
  } catch (error) {
    logger.error('Get facts error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch facts',
    });
  }
};

/**
 * @swagger
 * /api/v1/bi/export:
 *   get:
 *     summary: Export data for BI tools in various formats
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: data_type
 *         schema:
 *           type: string
 *           enum: [fact, dimension, metrics]
 *         required: true
 *         description: Type of data to export
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         required: true
 *         description: Entity to export (e.g., earnings, sales, user, product)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for data (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for data (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Data exported successfully
 */
export const exportData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data_type, entity, format = 'json', start_date, end_date } = req.query;

    if (!data_type || !entity) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'data_type and entity are required',
      });
    }

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    let data: any;

    // Fetch data based on type and entity
    if (data_type === 'fact') {
      switch (entity) {
        case 'earnings':
          data = await biService.getEarningsFact(userId, startDate, endDate);
          break;
        case 'sales':
          data = await biService.getSalesFact(userId, startDate, endDate);
          break;
        case 'invoices':
          data = await biService.getInvoicesFact(userId, startDate, endDate);
          break;
        default:
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid fact entity',
          });
      }
    } else if (data_type === 'dimension') {
      switch (entity) {
        case 'user':
          data = await biService.getUserDimension(userId);
          break;
        case 'product':
          data = await biService.getProductDimension(userId);
          break;
        case 'customer':
          data = await biService.getCustomerDimension(userId);
          break;
        case 'date':
          const defaultStart = new Date(new Date().getFullYear(), 0, 1);
          const defaultEnd = new Date();
          data = await biService.getDateDimension(
            startDate || defaultStart,
            endDate || defaultEnd
          );
          break;
        default:
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid dimension entity',
          });
      }
    } else if (data_type === 'metrics') {
      data = await biService.getBIMetrics(userId, startDate, endDate);
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid data_type',
      });
    }

    // Export in requested format
    if (format === 'csv') {
      const csv = await biService.exportToCSV(Array.isArray(data) ? data : [data]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${entity}_${data_type}.csv"`);
      res.send(csv);
    } else {
      const json = await biService.exportToJSON(data);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${entity}_${data_type}.json"`);
      res.send(json);
    }
  } catch (error) {
    logger.error('Export data error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export data',
    });
  }
};

/**
 * @swagger
 * /api/v1/bi/events:
 *   get:
 *     summary: Get analytics events
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: event_type
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for events (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for events (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of events to return
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 */
export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { event_type, start_date, end_date, limit } = req.query;

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;
    const eventLimit = limit ? parseInt(limit as string, 10) : 100;

    const events = await biService.getEvents(
      userId,
      event_type as string | undefined,
      startDate,
      endDate,
      eventLimit
    );

    res.json({
      count: events.length,
      events,
    });
  } catch (error) {
    logger.error('Get events error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch events',
    });
  }
};

/**
 * @swagger
 * /api/v1/bi/events:
 *   post:
 *     summary: Track a custom analytics event
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event_type
 *             properties:
 *               event_type:
 *                 type: string
 *                 description: Type of event
 *               properties:
 *                 type: object
 *                 description: Event properties (JSON object)
 *     responses:
 *       201:
 *         description: Event tracked successfully
 */
export const trackEvent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { event_type, properties = {} } = req.body;

    if (!event_type) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'event_type is required',
      });
    }

    await biService.trackEvent(userId, event_type, properties);

    res.status(201).json({
      message: 'Event tracked successfully',
    });
  } catch (error) {
    logger.error('Track event error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to track event',
    });
  }
};

/**
 * @swagger
 * /api/v1/bi/looker/metadata:
 *   get:
 *     summary: Get LookML metadata for Looker integration
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: LookML metadata retrieved successfully
 */
export const getLookerMetadata = async (req: AuthRequest, res: Response) => {
  try {
    const metadata = await biService.getLookMLMetadata();
    res.json(metadata);
  } catch (error) {
    logger.error('Get Looker metadata error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch Looker metadata',
    });
  }
};

/**
 * @swagger
 * /api/v1/bi/tableau/schema:
 *   get:
 *     summary: Get Tableau Web Data Connector schema
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tableau schema retrieved successfully
 */
export const getTableauSchema = async (req: AuthRequest, res: Response) => {
  try {
    const schema = await biService.getTableauSchema();
    res.json(schema);
  } catch (error) {
    logger.error('Get Tableau schema error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch Tableau schema',
    });
  }
};

/**
 * @swagger
 * /api/v1/bi/measures:
 *   get:
 *     summary: Get measure definitions for BI tools
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Measure definitions retrieved successfully
 */
export const getMeasures = async (req: AuthRequest, res: Response) => {
  try {
    const measures = biService.getMeasureDefinitions();
    res.json({
      count: measures.length,
      measures,
    });
  } catch (error) {
    logger.error('Get measures error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch measures',
    });
  }
};

/**
 * @swagger
 * /api/v1/bi/dashboard-metrics:
 *   get:
 *     summary: Get stored dashboard metrics
 *     tags: [BI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric_name
 *         schema:
 *           type: string
 *         description: Filter by metric name
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Filter by period
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 */
export const getDashboardMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { metric_name, period } = req.query;

    const metrics = await biService.getDashboardMetrics(
      userId,
      metric_name as string | undefined,
      period as string | undefined
    );

    res.json({
      count: metrics.length,
      metrics,
    });
  } catch (error) {
    logger.error('Get dashboard metrics error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard metrics',
    });
  }
};

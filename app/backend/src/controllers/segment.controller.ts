import { Request, Response } from 'express';
import { segmentationService, SegmentCriteria } from '../services/segmentation.service';
import { logger } from '../utils/logger';

/**
 * @swagger
 * components:
 *   schemas:
 *     CustomerSegment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         criteria:
 *           type: object
 *         memberCount:
 *           type: integer
 *         isAuto:
 *           type: boolean
 *         segmentType:
 *           type: string
 *           enum: [manual, rule-based, ml-clustering]
 *         isActive:
 *           type: boolean
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/segments:
 *   post:
 *     summary: Create a new customer segment
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - segmentType
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               criteria:
 *                 type: object
 *                 properties:
 *                   rules:
 *                     type: array
 *                     items:
 *                       type: object
 *                   conditions:
 *                     type: string
 *                     enum: [AND, OR]
 *                   mlConfig:
 *                     type: object
 *               segmentType:
 *                 type: string
 *                 enum: [manual, rule-based, ml-clustering]
 *     responses:
 *       201:
 *         description: Segment created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
export const createSegment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, description, criteria, segmentType } = req.body;

    if (!name || !segmentType) {
      res.status(400).json({ error: 'Name and segmentType are required' });
      return;
    }

    if (!['manual', 'rule-based', 'ml-clustering'].includes(segmentType)) {
      res.status(400).json({ error: 'Invalid segmentType' });
      return;
    }

    const segment = await segmentationService.createSegment(
      userId,
      name,
      criteria || {},
      segmentType,
      description
    );

    res.status(201).json({
      message: 'Segment created successfully',
      segment,
    });
  } catch (error: any) {
    logger.error('Error creating segment', error as Error);
    res.status(500).json({ error: error.message || 'Failed to create segment' });
  }
};

/**
 * @swagger
 * /api/v1/segments:
 *   get:
 *     summary: Get all segments for the authenticated user
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeAnalysis
 *         schema:
 *           type: boolean
 *         description: Include segment analytics
 *     responses:
 *       200:
 *         description: List of segments
 *       401:
 *         description: Unauthorized
 */
export const getSegments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const includeAnalysis = req.query.includeAnalysis === 'true';
    const segments = await segmentationService.getSegments(userId, includeAnalysis);

    res.status(200).json({
      segments,
      total: segments.length,
    });
  } catch (error: any) {
    logger.error('Error fetching segments', error as Error);
    res.status(500).json({ error: error.message || 'Failed to fetch segments' });
  }
};

/**
 * @swagger
 * /api/v1/segments/{id}:
 *   get:
 *     summary: Get segment by ID
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     responses:
 *       200:
 *         description: Segment details
 *       404:
 *         description: Segment not found
 *       401:
 *         description: Unauthorized
 */
export const getSegmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const segment = await segmentationService.getSegmentById(id, userId);

    if (!segment) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    res.status(200).json({ segment });
  } catch (error: any) {
    logger.error('Error fetching segment', error as Error);
    res.status(500).json({ error: error.message || 'Failed to fetch segment' });
  }
};

/**
 * @swagger
 * /api/v1/segments/{id}:
 *   put:
 *     summary: Update segment
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               criteria:
 *                 type: object
 *     responses:
 *       200:
 *         description: Segment updated successfully
 *       404:
 *         description: Segment not found
 *       401:
 *         description: Unauthorized
 */
export const updateSegment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { name, description, criteria } = req.body;

    const segment = await segmentationService.updateSegment(
      id,
      userId,
      name,
      criteria,
      description
    );

    res.status(200).json({
      message: 'Segment updated successfully',
      segment,
    });
  } catch (error: any) {
    logger.error('Error updating segment', error as Error);
    res.status(500).json({ error: error.message || 'Failed to update segment' });
  }
};

/**
 * @swagger
 * /api/v1/segments/{id}:
 *   delete:
 *     summary: Delete segment
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     responses:
 *       200:
 *         description: Segment deleted successfully
 *       404:
 *         description: Segment not found
 *       401:
 *         description: Unauthorized
 */
export const deleteSegment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    await segmentationService.deleteSegment(id, userId);

    res.status(200).json({ message: 'Segment deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting segment', error as Error);
    res.status(500).json({ error: error.message || 'Failed to delete segment' });
  }
};

/**
 * @swagger
 * /api/v1/segments/{id}/analytics:
 *   get:
 *     summary: Get segment analytics
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     responses:
 *       200:
 *         description: Segment analytics
 *       404:
 *         description: Segment not found
 *       401:
 *         description: Unauthorized
 */
export const getSegmentAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const analytics = await segmentationService.calculateSegmentAnalytics(id, userId);

    if (!analytics) {
      res.status(404).json({ error: 'Analytics not found or segment is empty' });
      return;
    }

    res.status(200).json({ analytics });
  } catch (error: any) {
    logger.error('Error fetching segment analytics', error as Error);
    res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
  }
};

/**
 * @swagger
 * /api/v1/segments/{id}/members:
 *   post:
 *     summary: Add customers to a manual segment
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerIds
 *             properties:
 *               customerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Customers added successfully
 *       400:
 *         description: Invalid input or segment type
 *       401:
 *         description: Unauthorized
 */
export const addCustomersToSegment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { customerIds } = req.body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      res.status(400).json({ error: 'customerIds must be a non-empty array' });
      return;
    }

    const count = await segmentationService.addCustomersToSegment(id, customerIds, userId);

    res.status(200).json({
      message: 'Customers added successfully',
      memberCount: count,
    });
  } catch (error: any) {
    logger.error('Error adding customers to segment', error as Error);
    res.status(500).json({ error: error.message || 'Failed to add customers' });
  }
};

/**
 * @swagger
 * /api/v1/segments/{id}/members:
 *   delete:
 *     summary: Remove customers from a manual segment
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerIds
 *             properties:
 *               customerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Customers removed successfully
 *       400:
 *         description: Invalid input or segment type
 *       401:
 *         description: Unauthorized
 */
export const removeCustomersFromSegment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { customerIds } = req.body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      res.status(400).json({ error: 'customerIds must be a non-empty array' });
      return;
    }

    const count = await segmentationService.removeCustomersFromSegment(id, customerIds, userId);

    res.status(200).json({
      message: 'Customers removed successfully',
      memberCount: count,
    });
  } catch (error: any) {
    logger.error('Error removing customers from segment', error as Error);
    res.status(500).json({ error: error.message || 'Failed to remove customers' });
  }
};

/**
 * @swagger
 * /api/v1/segments/{id}/refresh:
 *   post:
 *     summary: Refresh segment membership (auto segments only)
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     responses:
 *       200:
 *         description: Segment refreshed successfully
 *       401:
 *         description: Unauthorized
 */
export const refreshSegment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const segment = await segmentationService.getSegmentById(id, userId);

    if (!segment) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    if (segment.segmentType === 'manual') {
      res.status(400).json({ error: 'Cannot refresh manual segments' });
      return;
    }

    const criteria: SegmentCriteria = JSON.parse(segment.criteria);
    const count = await segmentationService.updateSegmentMembership(
      id,
      userId,
      criteria,
      segment.segmentType as 'rule-based' | 'ml-clustering'
    );

    res.status(200).json({
      message: 'Segment refreshed successfully',
      memberCount: count,
    });
  } catch (error: any) {
    logger.error('Error refreshing segment', error as Error);
    res.status(500).json({ error: error.message || 'Failed to refresh segment' });
  }
};

/**
 * @swagger
 * /api/v1/segments/predefined:
 *   post:
 *     summary: Create predefined customer segments
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Predefined segments created
 *       401:
 *         description: Unauthorized
 */
export const createPredefinedSegments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const segments = await segmentationService.createPredefinedSegments(userId);

    res.status(201).json({
      message: 'Predefined segments created successfully',
      segments,
      count: segments.length,
    });
  } catch (error: any) {
    logger.error('Error creating predefined segments', error as Error);
    res.status(500).json({ error: error.message || 'Failed to create predefined segments' });
  }
};

/**
 * @swagger
 * /api/v1/segments/refresh-all:
 *   post:
 *     summary: Refresh all auto segments for the user
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All segments refreshed
 *       401:
 *         description: Unauthorized
 */
export const refreshAllSegments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const count = await segmentationService.refreshAutoSegments(userId);

    res.status(200).json({
      message: 'All auto segments refreshed successfully',
      segmentsRefreshed: count,
    });
  } catch (error: any) {
    logger.error('Error refreshing all segments', error as Error);
    res.status(500).json({ error: error.message || 'Failed to refresh segments' });
  }
};

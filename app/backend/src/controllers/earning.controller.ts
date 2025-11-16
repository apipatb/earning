import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { logInfo, logDebug, logError, logWarn } from '../lib/logger';
import {
  emitEarningCreated,
  emitEarningUpdated,
  emitEarningDeleted,
} from '../websocket/events/earnings.events';
import { sendSuccessNotification, sendErrorNotification } from '../websocket/events/notifications.events';
import {
  CreateEarningSchema,
  UpdateEarningSchema,
  EarningFilterSchema,
} from '../schemas/validation.schemas';
import { validateRequest, validatePartialRequest, ValidationException } from '../utils/validate-request.util';

export const getAllEarnings = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const requestId = (req as any).requestId || 'unknown';

  try {
    // Validate query parameters
    const filters = await validateRequest(req.query, EarningFilterSchema);

    logDebug('Fetching earnings', {
      requestId,
      userId,
      filters,
    });

    const where: any = { userId };

    if (filters.start_date && filters.end_date) {
      where.date = {
        gte: new Date(filters.start_date),
        lte: new Date(filters.end_date),
      };
    }

    if (filters.platform_id) {
      where.platformId = filters.platform_id;
    }

    const [earnings, total] = await Promise.all([
      prisma.earning.findMany({
        where,
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.earning.count({ where }),
    ]);

    const earningsWithRate = earnings.map((e: any) => ({
      id: e.id,
      platform: e.platform,
      date: e.date.toISOString().split('T')[0],
      hours: e.hours ? Number(e.hours) : null,
      amount: Number(e.amount),
      hourly_rate: e.hours ? Number(e.amount) / Number(e.hours) : null,
      notes: e.notes,
    }));

    logInfo('Earnings fetched successfully', {
      requestId,
      userId,
      count: earnings.length,
      total,
    });

    res.json({
      earnings: earningsWithRate,
      total,
      has_more: total > filters.offset + filters.limit,
    });
  } catch (error) {
    if (error instanceof ValidationException) {
      const requestId = (req as any).requestId || 'unknown';
      logWarn('Validation error fetching earnings', {
        requestId,
        errors: error.errors,
      });
      return res.status(error.statusCode).json({
        error: 'Validation Error',
        message: 'Invalid filter parameters',
        errors: error.errors,
      });
    }
    logError('Failed to fetch earnings', error, {
      requestId,
      userId,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch earnings',
    });
  }
};

export const createEarning = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const requestId = (req as any).requestId || 'unknown';

  try {
    // Validate request body
    const data = await validateRequest(req.body, CreateEarningSchema);
    logDebug('Creating earning', {
      requestId,
      userId,
      platformId: data.platformId,
      amount: data.amount,
      date: data.date,
    });

    // Verify platform ownership
    const platform = await prisma.platform.findFirst({
      where: { id: data.platformId, userId },
    });

    if (!platform) {
      logWarn('Platform not found for earning creation', {
        requestId,
        userId,
        platformId: data.platformId,
      });
      return res.status(404).json({
        error: 'Not Found',
        message: 'Platform not found',
      });
    }

    const earning = await prisma.earning.create({
      data: {
        userId,
        platformId: data.platformId,
        date: new Date(data.date),
        hours: data.hours,
        amount: data.amount,
        notes: data.notes,
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    logInfo('Earning created successfully', {
      requestId,
      userId,
      earningId: earning.id,
      amount: earning.amount,
      platformId: earning.platformId,
    });

    // Emit WebSocket event for real-time updates
    const earningData = {
      id: earning.id,
      userId,
      platformId: earning.platformId,
      platform: earning.platform,
      date: earning.date.toISOString().split('T')[0],
      hours: earning.hours ? Number(earning.hours) : null,
      amount: Number(earning.amount),
      hourly_rate: earning.hours ? Number(earning.amount) / Number(earning.hours) : null,
      notes: earning.notes || undefined,
    };

    emitEarningCreated(userId, earningData);
    sendSuccessNotification(
      userId,
      'Earning Created',
      `New earning of ${earning.amount} added to ${earning.platform.name}`
    );

    res.status(201).json({ earning });
  } catch (error) {
    if (error instanceof ValidationException) {
      const requestId = (req as any).requestId || 'unknown';
      logWarn('Validation error during earning creation', {
        requestId,
        userId,
        errors: error.errors,
      });
      return res.status(error.statusCode).json({
        error: 'Validation Error',
        message: 'Earning validation failed',
        errors: error.errors,
      });
    }
    logError('Failed to create earning', error, {
      requestId,
      userId,
      platformId: req.body?.platformId,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create earning',
    });
  }
};

export const updateEarning = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const earningId = req.params.id;
  const requestId = (req as any).requestId || 'unknown';

  try {
    // Validate request body (partial update)
    const data = await validatePartialRequest(req.body, UpdateEarningSchema);
    logDebug('Updating earning', {
      requestId,
      userId,
      earningId,
      updates: data,
    });

    // Check ownership
    const earning = await prisma.earning.findFirst({
      where: { id: earningId, userId },
    });

    if (!earning) {
      logWarn('Earning not found for update', {
        requestId,
        userId,
        earningId,
      });
      return res.status(404).json({
        error: 'Not Found',
        message: 'Earning not found',
      });
    }

    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.hours !== undefined) updateData.hours = data.hours;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.earning.update({
      where: { id: earningId },
      data: updateData,
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    logInfo('Earning updated successfully', {
      requestId,
      userId,
      earningId,
      updatedFields: Object.keys(updateData),
    });

    // Emit WebSocket event for real-time updates
    emitEarningUpdated(userId, {
      id: earningId,
      userId,
      changes: updateData,
      updatedAt: new Date().toISOString(),
    });

    sendSuccessNotification(
      userId,
      'Earning Updated',
      `Earning ${earningId} has been updated`
    );

    res.json({ earning: updated });
  } catch (error) {
    if (error instanceof ValidationException) {
      const requestId = (req as any).requestId || 'unknown';
      logWarn('Validation error during earning update', {
        requestId,
        userId,
        earningId,
        errors: error.errors,
      });
      return res.status(error.statusCode).json({
        error: 'Validation Error',
        message: 'Earning validation failed',
        errors: error.errors,
      });
    }
    logError('Failed to update earning', error, {
      requestId,
      userId,
      earningId,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update earning',
    });
  }
};

export const deleteEarning = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const earningId = req.params.id;
  const requestId = (req as any).requestId || 'unknown';

  try {
    logDebug('Deleting earning', {
      requestId,
      userId,
      earningId,
    });

    // Check ownership
    const earning = await prisma.earning.findFirst({
      where: { id: earningId, userId },
    });

    if (!earning) {
      logWarn('Earning not found for deletion', {
        requestId,
        userId,
        earningId,
      });
      return res.status(404).json({
        error: 'Not Found',
        message: 'Earning not found',
      });
    }

    await prisma.earning.delete({
      where: { id: earningId },
    });

    logInfo('Earning deleted successfully', {
      requestId,
      userId,
      earningId,
      deletedAmount: earning.amount,
    });

    // Emit WebSocket event for real-time updates
    emitEarningDeleted(userId, earningId);
    sendSuccessNotification(
      userId,
      'Earning Deleted',
      `Earning ${earningId} has been deleted`
    );

    res.json({ message: 'Earning deleted successfully' });
  } catch (error) {
    logError('Failed to delete earning', error, {
      requestId,
      userId,
      earningId,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete earning',
    });
  }
};

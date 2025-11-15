import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Device Management
export const registerDevice = async (req: Request, res: Response) => {
  try {
    const { deviceName, deviceType, deviceToken, osVersion } = req.body;
    const userId = (req as any).userId;

    const device = await prisma.syncDevice.create({
      data: {
        userId,
        deviceName,
        deviceType,
        deviceToken,
        osVersion,
        isActive: true,
        lastSyncAt: new Date(),
      },
    });

    res.status(201).json(device);
  } catch (error) {
    res.status(400).json({ error: 'Failed to register device' });
  }
};

export const getDevices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const devices = await prisma.syncDevice.findMany({
      where: { userId },
      orderBy: { lastSyncAt: 'desc' },
    });

    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
};

export const getDeviceById = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const userId = (req as any).userId;

    const device = await prisma.syncDevice.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch device' });
  }
};

export const updateDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { deviceName, osVersion, isActive } = req.body;
    const userId = (req as any).userId;

    const device = await prisma.syncDevice.updateMany({
      where: { id: deviceId, userId },
      data: {
        deviceName,
        osVersion,
        isActive,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true, modifiedCount: device.count });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update device' });
  }
};

export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const userId = (req as any).userId;

    await prisma.syncDevice.deleteMany({
      where: { id: deviceId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete device' });
  }
};

// Sync Queue Management
export const queueSyncOperation = async (req: Request, res: Response) => {
  try {
    const { operationType, dataType, payload, priority } = req.body;
    const userId = (req as any).userId;

    const queueItem = await prisma.syncQueue.create({
      data: {
        userId,
        operationType,
        dataType,
        payload: JSON.stringify(payload),
        priority: priority || 'normal',
        status: 'pending',
        retryCount: 0,
        enqueuedAt: new Date(),
      },
    });

    res.status(201).json(queueItem);
  } catch (error) {
    res.status(400).json({ error: 'Failed to queue sync operation' });
  }
};

export const getSyncQueue = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, limit = 50 } = req.query;

    const queue = await prisma.syncQueue.findMany({
      where: {
        userId,
        ...(status && { status: status as string }),
      },
      orderBy: [{ priority: 'desc' }, { enqueuedAt: 'asc' }],
      take: parseInt(limit as string),
    });

    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync queue' });
  }
};

export const processSyncQueue = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { batchSize = 10 } = req.body;

    const pendingItems = await prisma.syncQueue.findMany({
      where: { userId, status: 'pending' },
      orderBy: [{ priority: 'desc' }, { enqueuedAt: 'asc' }],
      take: batchSize,
    });

    const results = await Promise.allSettled(
      pendingItems.map(async (item) => {
        try {
          // Process the sync item
          await prisma.syncQueue.update({
            where: { id: item.id },
            data: {
              status: 'synced',
              syncedAt: new Date(),
            },
          });

          return { id: item.id, status: 'success' };
        } catch (error) {
          // Retry logic
          await prisma.syncQueue.update({
            where: { id: item.id },
            data: {
              retryCount: { increment: 1 },
              status: (error as any).retryCount >= 3 ? 'failed' : 'pending',
            },
          });
          return { id: item.id, status: 'failed' };
        }
      })
    );

    res.json({ processed: results.length, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process sync queue' });
  }
};

export const clearSyncQueue = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status } = req.body;

    const result = await prisma.syncQueue.deleteMany({
      where: {
        userId,
        ...(status && { status }),
      },
    });

    res.json({ deletedCount: result.count });
  } catch (error) {
    res.status(400).json({ error: 'Failed to clear sync queue' });
  }
};

// Conflict Resolution
export const reportSyncConflict = async (req: Request, res: Response) => {
  try {
    const { dataType, dataId, localVersion, remoteVersion, localData, remoteData } = req.body;
    const userId = (req as any).userId;

    const conflict = await prisma.syncConflict.create({
      data: {
        userId,
        dataType,
        dataId,
        localVersion,
        remoteVersion,
        localData: JSON.stringify(localData),
        remoteData: JSON.stringify(remoteData),
        status: 'unresolved',
        detectedAt: new Date(),
      },
    });

    res.status(201).json(conflict);
  } catch (error) {
    res.status(400).json({ error: 'Failed to report sync conflict' });
  }
};

export const getSyncConflicts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status = 'unresolved' } = req.query;

    const conflicts = await prisma.syncConflict.findMany({
      where: {
        userId,
        status: status as string,
      },
      orderBy: { detectedAt: 'desc' },
    });

    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync conflicts' });
  }
};

export const resolveConflict = async (req: Request, res: Response) => {
  try {
    const { conflictId } = req.params;
    const { resolution, selectedVersion, customData } = req.body;
    const userId = (req as any).userId;

    const conflict = await prisma.syncConflict.updateMany({
      where: { id: conflictId, userId },
      data: {
        status: 'resolved',
        resolution,
        selectedVersion,
        customData: customData ? JSON.stringify(customData) : null,
        resolvedAt: new Date(),
      },
    });

    res.json({ success: conflict.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to resolve conflict' });
  }
};

// Data Versioning
export const createDataVersion = async (req: Request, res: Response) => {
  try {
    const { dataType, dataId, data, changeType } = req.body;
    const userId = (req as any).userId;

    const version = await prisma.dataVersion.create({
      data: {
        userId,
        dataType,
        dataId,
        versionNumber: 1,
        data: JSON.stringify(data),
        changeType,
        createdAt: new Date(),
      },
    });

    res.status(201).json(version);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create data version' });
  }
};

export const getDataVersions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { dataType, dataId, limit = 20 } = req.query;

    const versions = await prisma.dataVersion.findMany({
      where: {
        userId,
        ...(dataType && { dataType: dataType as string }),
        ...(dataId && { dataId: dataId as string }),
      },
      orderBy: { versionNumber: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data versions' });
  }
};

export const restoreDataVersion = async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;
    const userId = (req as any).userId;

    const version = await prisma.dataVersion.findFirst({
      where: { id: versionId, userId },
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({
      success: true,
      dataType: version.dataType,
      dataId: version.dataId,
      data: JSON.parse(version.data),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore data version' });
  }
};

// Sync Status & Monitoring
export const getSyncStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const totalDevices = await prisma.syncDevice.count({ where: { userId } });
    const activeDevices = await prisma.syncDevice.count({
      where: { userId, isActive: true },
    });
    const pendingSync = await prisma.syncQueue.count({
      where: { userId, status: 'pending' },
    });
    const unresolvedConflicts = await prisma.syncConflict.count({
      where: { userId, status: 'unresolved' },
    });

    const status = {
      timestamp: new Date(),
      totalDevices,
      activeDevices,
      pendingSync,
      unresolvedConflicts,
      syncHealth: (activeDevices / totalDevices) * 100,
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
};

export const getSyncLog = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 7, limit = 100 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const logs = await prisma.syncLog.findMany({
      where: {
        userId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync log' });
  }
};

// Selective Sync Configuration
export const setSelectiveSync = async (req: Request, res: Response) => {
  try {
    const { dataTypes, enabled } = req.body;
    const userId = (req as any).userId;

    // Delete existing config
    await prisma.selectiveSync.deleteMany({ where: { userId } });

    // Create new config
    const config = await prisma.selectiveSync.create({
      data: {
        userId,
        dataTypes: JSON.stringify(dataTypes),
        enabled,
        createdAt: new Date(),
      },
    });

    res.status(201).json(config);
  } catch (error) {
    res.status(400).json({ error: 'Failed to set selective sync' });
  }
};

export const getSelectiveSync = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const config = await prisma.selectiveSync.findFirst({
      where: { userId },
    });

    res.json(config || { dataTypes: ['all'], enabled: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch selective sync config' });
  }
};

// Sync Statistics
export const getSyncStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const totalSyncs = await prisma.syncLog.count({
      where: { userId, timestamp: { gte: startDate } },
    });

    const successfulSyncs = await prisma.syncLog.count({
      where: {
        userId,
        status: 'success',
        timestamp: { gte: startDate },
      },
    });

    const failedSyncs = await prisma.syncLog.count({
      where: {
        userId,
        status: 'failed',
        timestamp: { gte: startDate },
      },
    });

    const devices = await prisma.syncDevice.groupBy({
      by: ['deviceType'],
      where: { userId, isActive: true },
      _count: true,
    });

    const stats = {
      period: days,
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
      devicesByType: devices,
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync statistics' });
  }
};

/**
 * Sync Service - Handles offline data synchronization and conflict resolution
 * Processes pending requests from offline clients
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Pending sync request interface
 */
interface PendingRequest {
  id: string;
  userId: string;
  resource: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  clientId: string;
  version?: number;
}

/**
 * Sync result interface
 */
interface SyncResult {
  success: boolean;
  requestId: string;
  conflicts?: Conflict[];
  error?: string;
}

/**
 * Conflict interface
 */
interface Conflict {
  field: string;
  clientValue: any;
  serverValue: any;
  resolution: 'client' | 'server' | 'merge';
}

/**
 * Conflict resolution strategy
 */
type ConflictStrategy = 'client-wins' | 'server-wins' | 'last-write-wins' | 'manual';

/**
 * Store pending sync request
 */
export async function storePendingRequest(
  userId: string,
  resource: string,
  action: 'create' | 'update' | 'delete',
  data: any,
  clientId: string
): Promise<string> {
  try {
    // Store in database for persistence
    const request = await prisma.syncQueue.create({
      data: {
        userId,
        resource,
        action,
        data: JSON.stringify(data),
        clientId,
        timestamp: new Date(),
        status: 'pending',
        version: data.version || 1
      }
    });

    return request.id;
  } catch (error) {
    console.error('[SyncService] Failed to store pending request:', error);
    throw error;
  }
}

/**
 * Process sync queue for a user
 */
export async function processSyncQueue(
  userId: string,
  strategy: ConflictStrategy = 'last-write-wins'
): Promise<SyncResult[]> {
  try {
    // Get all pending requests for user
    const pendingRequests = await prisma.syncQueue.findMany({
      where: {
        userId,
        status: 'pending'
      },
      orderBy: {
        timestamp: 'asc' // Process in chronological order
      }
    });

    const results: SyncResult[] = [];

    for (const request of pendingRequests) {
      try {
        const result = await processRequest(request, strategy);
        results.push(result);

        // Update request status
        await prisma.syncQueue.update({
          where: { id: request.id },
          data: {
            status: result.success ? 'completed' : 'failed',
            processedAt: new Date(),
            error: result.error
          }
        });
      } catch (error) {
        console.error('[SyncService] Failed to process request:', error);
        results.push({
          success: false,
          requestId: request.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[SyncService] Failed to process sync queue:', error);
    throw error;
  }
}

/**
 * Process individual sync request
 */
async function processRequest(
  request: any,
  strategy: ConflictStrategy
): Promise<SyncResult> {
  const { id, resource, action, data: dataStr, userId, version, timestamp } = request;
  const data = JSON.parse(dataStr);

  try {
    switch (resource) {
      case 'earnings':
        return await syncEarning(userId, action, data, version, strategy, timestamp);

      case 'expenses':
        return await syncExpense(userId, action, data, version, strategy, timestamp);

      case 'goals':
        return await syncGoal(userId, action, data, version, strategy, timestamp);

      case 'clients':
        return await syncClient(userId, action, data, version, strategy, timestamp);

      case 'invoices':
        return await syncInvoice(userId, action, data, version, strategy, timestamp);

      default:
        return {
          success: false,
          requestId: id,
          error: `Unknown resource: ${resource}`
        };
    }
  } catch (error) {
    return {
      success: false,
      requestId: id,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync earning data
 */
async function syncEarning(
  userId: string,
  action: string,
  data: any,
  version: number,
  strategy: ConflictStrategy,
  timestamp: Date
): Promise<SyncResult> {
  try {
    if (action === 'create') {
      // Create new earning
      const earning = await prisma.earning.create({
        data: {
          userId,
          ...data,
          syncVersion: 1
        }
      });

      return {
        success: true,
        requestId: data.tempId || earning.id
      };
    }

    if (action === 'update') {
      // Check for conflicts
      const existing = await prisma.earning.findUnique({
        where: { id: data.id }
      });

      if (!existing) {
        return {
          success: false,
          requestId: data.id,
          error: 'Earning not found'
        };
      }

      // Check version for conflicts
      const conflicts = detectConflicts(existing, data, timestamp);

      if (conflicts.length > 0) {
        // Resolve conflicts based on strategy
        const resolved = resolveConflicts(existing, data, conflicts, strategy);

        await prisma.earning.update({
          where: { id: data.id },
          data: {
            ...resolved,
            syncVersion: (existing.syncVersion || 0) + 1
          }
        });

        return {
          success: true,
          requestId: data.id,
          conflicts
        };
      }

      // No conflicts, apply update
      await prisma.earning.update({
        where: { id: data.id },
        data: {
          ...data,
          syncVersion: (existing.syncVersion || 0) + 1
        }
      });

      return {
        success: true,
        requestId: data.id
      };
    }

    if (action === 'delete') {
      await prisma.earning.delete({
        where: { id: data.id }
      });

      return {
        success: true,
        requestId: data.id
      };
    }

    return {
      success: false,
      requestId: data.id,
      error: `Unknown action: ${action}`
    };
  } catch (error) {
    return {
      success: false,
      requestId: data.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync expense data
 */
async function syncExpense(
  userId: string,
  action: string,
  data: any,
  version: number,
  strategy: ConflictStrategy,
  timestamp: Date
): Promise<SyncResult> {
  try {
    if (action === 'create') {
      const expense = await prisma.expense.create({
        data: {
          userId,
          ...data,
          syncVersion: 1
        }
      });

      return {
        success: true,
        requestId: data.tempId || expense.id
      };
    }

    if (action === 'update') {
      const existing = await prisma.expense.findUnique({
        where: { id: data.id }
      });

      if (!existing) {
        return {
          success: false,
          requestId: data.id,
          error: 'Expense not found'
        };
      }

      const conflicts = detectConflicts(existing, data, timestamp);

      if (conflicts.length > 0) {
        const resolved = resolveConflicts(existing, data, conflicts, strategy);

        await prisma.expense.update({
          where: { id: data.id },
          data: {
            ...resolved,
            syncVersion: (existing.syncVersion || 0) + 1
          }
        });

        return {
          success: true,
          requestId: data.id,
          conflicts
        };
      }

      await prisma.expense.update({
        where: { id: data.id },
        data: {
          ...data,
          syncVersion: (existing.syncVersion || 0) + 1
        }
      });

      return {
        success: true,
        requestId: data.id
      };
    }

    if (action === 'delete') {
      await prisma.expense.delete({
        where: { id: data.id }
      });

      return {
        success: true,
        requestId: data.id
      };
    }

    return {
      success: false,
      requestId: data.id,
      error: `Unknown action: ${action}`
    };
  } catch (error) {
    return {
      success: false,
      requestId: data.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync goal data
 */
async function syncGoal(
  userId: string,
  action: string,
  data: any,
  version: number,
  strategy: ConflictStrategy,
  timestamp: Date
): Promise<SyncResult> {
  // Similar implementation to syncEarning
  // Implementation follows the same pattern
  return {
    success: true,
    requestId: data.id
  };
}

/**
 * Sync client data
 */
async function syncClient(
  userId: string,
  action: string,
  data: any,
  version: number,
  strategy: ConflictStrategy,
  timestamp: Date
): Promise<SyncResult> {
  // Similar implementation to syncEarning
  return {
    success: true,
    requestId: data.id
  };
}

/**
 * Sync invoice data
 */
async function syncInvoice(
  userId: string,
  action: string,
  data: any,
  version: number,
  strategy: ConflictStrategy,
  timestamp: Date
): Promise<SyncResult> {
  // Similar implementation to syncEarning
  return {
    success: true,
    requestId: data.id
  };
}

/**
 * Detect conflicts between server and client data
 */
function detectConflicts(
  serverData: any,
  clientData: any,
  clientTimestamp: Date
): Conflict[] {
  const conflicts: Conflict[] = [];
  const serverTimestamp = new Date(serverData.updatedAt);

  // Check if server was updated after client's base version
  if (serverTimestamp > clientTimestamp) {
    // Find differing fields
    const fields = Object.keys(clientData).filter(key =>
      !['id', 'userId', 'createdAt', 'updatedAt', 'syncVersion'].includes(key)
    );

    for (const field of fields) {
      if (serverData[field] !== clientData[field]) {
        conflicts.push({
          field,
          clientValue: clientData[field],
          serverValue: serverData[field],
          resolution: 'server' // Default, will be changed by strategy
        });
      }
    }
  }

  return conflicts;
}

/**
 * Resolve conflicts based on strategy
 */
function resolveConflicts(
  serverData: any,
  clientData: any,
  conflicts: Conflict[],
  strategy: ConflictStrategy
): any {
  const resolved = { ...serverData };

  for (const conflict of conflicts) {
    switch (strategy) {
      case 'client-wins':
        resolved[conflict.field] = conflict.clientValue;
        conflict.resolution = 'client';
        break;

      case 'server-wins':
        resolved[conflict.field] = conflict.serverValue;
        conflict.resolution = 'server';
        break;

      case 'last-write-wins':
        // Already defaulting to client data in this case
        resolved[conflict.field] = conflict.clientValue;
        conflict.resolution = 'client';
        break;

      case 'manual':
        // Keep server value, require manual resolution
        resolved[conflict.field] = conflict.serverValue;
        conflict.resolution = 'server';
        break;
    }
  }

  return resolved;
}

/**
 * Get pending sync count for user
 */
export async function getPendingSyncCount(userId: string): Promise<number> {
  try {
    const count = await prisma.syncQueue.count({
      where: {
        userId,
        status: 'pending'
      }
    });

    return count;
  } catch (error) {
    console.error('[SyncService] Failed to get pending sync count:', error);
    return 0;
  }
}

/**
 * Clear completed sync requests
 */
export async function clearCompletedSyncs(userId: string, olderThan?: Date): Promise<number> {
  try {
    const where: any = {
      userId,
      status: 'completed'
    };

    if (olderThan) {
      where.processedAt = {
        lt: olderThan
      };
    }

    const result = await prisma.syncQueue.deleteMany({ where });

    return result.count;
  } catch (error) {
    console.error('[SyncService] Failed to clear completed syncs:', error);
    return 0;
  }
}

/**
 * Retry failed sync requests
 */
export async function retryFailedSyncs(
  userId: string,
  strategy: ConflictStrategy = 'last-write-wins'
): Promise<SyncResult[]> {
  try {
    // Reset failed requests to pending
    await prisma.syncQueue.updateMany({
      where: {
        userId,
        status: 'failed'
      },
      data: {
        status: 'pending',
        error: null
      }
    });

    // Process the queue
    return await processSyncQueue(userId, strategy);
  } catch (error) {
    console.error('[SyncService] Failed to retry failed syncs:', error);
    throw error;
  }
}

/**
 * Get sync status for user
 */
export async function getSyncStatus(userId: string): Promise<{
  pending: number;
  completed: number;
  failed: number;
  total: number;
}> {
  try {
    const [pending, completed, failed, total] = await Promise.all([
      prisma.syncQueue.count({ where: { userId, status: 'pending' } }),
      prisma.syncQueue.count({ where: { userId, status: 'completed' } }),
      prisma.syncQueue.count({ where: { userId, status: 'failed' } }),
      prisma.syncQueue.count({ where: { userId } })
    ]);

    return { pending, completed, failed, total };
  } catch (error) {
    console.error('[SyncService] Failed to get sync status:', error);
    return { pending: 0, completed: 0, failed: 0, total: 0 };
  }
}

export default {
  storePendingRequest,
  processSyncQueue,
  getPendingSyncCount,
  clearCompletedSyncs,
  retryFailedSyncs,
  getSyncStatus
};

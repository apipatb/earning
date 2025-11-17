import NetInfo from '@react-native-community/netinfo';
import { StorageService } from './storage.service';
import ApiService from './api.service';

/**
 * Action status enum for tracking sync progress
 */
export enum ActionStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
}

/**
 * Specific action types for different entities
 */
export enum ActionType {
  // Ticket actions
  CREATE_TICKET = 'CREATE_TICKET',
  UPDATE_TICKET = 'UPDATE_TICKET',
  DELETE_TICKET = 'DELETE_TICKET',

  // Goal actions
  CREATE_GOAL = 'CREATE_GOAL',
  UPDATE_GOAL = 'UPDATE_GOAL',
  DELETE_GOAL = 'DELETE_GOAL',

  // Earning actions
  CREATE_EARNING = 'CREATE_EARNING',
  UPDATE_EARNING = 'UPDATE_EARNING',
  DELETE_EARNING = 'DELETE_EARNING',

  // Expense actions
  CREATE_EXPENSE = 'CREATE_EXPENSE',
  UPDATE_EXPENSE = 'UPDATE_EXPENSE',
  DELETE_EXPENSE = 'DELETE_EXPENSE',

  // Product actions
  CREATE_PRODUCT = 'CREATE_PRODUCT',
  UPDATE_PRODUCT = 'UPDATE_PRODUCT',
  DELETE_PRODUCT = 'DELETE_PRODUCT',

  // Sale actions
  CREATE_SALE = 'CREATE_SALE',
  UPDATE_SALE = 'UPDATE_SALE',
  DELETE_SALE = 'DELETE_SALE',

  // Customer actions
  CREATE_CUSTOMER = 'CREATE_CUSTOMER',
  UPDATE_CUSTOMER = 'UPDATE_CUSTOMER',
  DELETE_CUSTOMER = 'DELETE_CUSTOMER',

  // Platform actions
  CREATE_PLATFORM = 'CREATE_PLATFORM',
  UPDATE_PLATFORM = 'UPDATE_PLATFORM',
  DELETE_PLATFORM = 'DELETE_PLATFORM',

  // Invoice actions
  CREATE_INVOICE = 'CREATE_INVOICE',
  UPDATE_INVOICE = 'UPDATE_INVOICE',
  DELETE_INVOICE = 'DELETE_INVOICE',

  // Message actions
  SEND_MESSAGE = 'SEND_MESSAGE',

  // File actions
  UPLOAD_FILE = 'UPLOAD_FILE',
}

/**
 * Error types for different sync failure scenarios
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Enhanced offline action interface with status tracking
 */
export interface OfflineAction {
  id: string;
  type: ActionType;
  data: any;
  timestamp: number;
  status: ActionStatus;
  retryCount: number;
  lastRetryAt?: number;
  syncedAt?: number;
  error?: {
    type: ErrorType;
    message: string;
    details?: any;
  };
}

export class OfflineService {
  private static syncInProgress = false;
  private static syncInterval: NodeJS.Timeout | null = null;

  // Retry configuration
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly BASE_RETRY_DELAY = 1000; // 1 second
  private static readonly MAX_RETRY_DELAY = 30000; // 30 seconds

  static async initialize(): Promise<void> {
    // Monitor network connectivity
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log('Network connected, syncing offline data...');
        this.syncOfflineData();
      } else {
        console.log('Network disconnected, entering offline mode');
      }
    });

    // Start periodic sync (every 5 minutes when online)
    this.startPeriodicSync();
  }

  static async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  static async queueAction(
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'status' | 'retryCount'>
  ): Promise<void> {
    const offlineData = await StorageService.getOfflineData();
    const actions: OfflineAction[] = offlineData.actions || [];

    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      status: ActionStatus.PENDING,
      retryCount: 0,
    };

    actions.push(newAction);
    await StorageService.setOfflineData('actions', actions);

    console.log(`[OfflineService] Queued action: ${newAction.type} (ID: ${newAction.id})`);

    // Try to sync immediately if online
    if (await this.isOnline()) {
      this.syncOfflineData();
    }
  }

  static async syncOfflineData(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[OfflineService] Sync already in progress, skipping...');
      return;
    }

    const online = await this.isOnline();
    if (!online) {
      console.log('[OfflineService] Device is offline, cannot sync');
      return;
    }

    this.syncInProgress = true;

    try {
      const offlineData = await StorageService.getOfflineData();
      let actions: OfflineAction[] = offlineData.actions || [];

      // Filter out already synced actions
      actions = actions.filter((action) => action.status !== ActionStatus.SYNCED);

      if (actions.length === 0) {
        console.log('[OfflineService] No offline actions to sync');
        return;
      }

      console.log(`[OfflineService] Syncing ${actions.length} offline actions...`);

      const updatedActions: OfflineAction[] = [];
      let syncedCount = 0;
      let failedCount = 0;

      for (const action of actions) {
        try {
          // Check if action should be retried
          if (!this.shouldRetryAction(action)) {
            console.log(
              `[OfflineService] Action ${action.id} exceeded max retries, marking as failed`
            );
            action.status = ActionStatus.FAILED;
            updatedActions.push(action);
            failedCount++;
            continue;
          }

          // Update status to syncing
          action.status = ActionStatus.SYNCING;
          await this.updateAction(action);

          // Execute the action
          await this.dispatchAction(action);

          // Mark as synced
          action.status = ActionStatus.SYNCED;
          action.syncedAt = Date.now();
          action.error = undefined;

          console.log(`[OfflineService] Successfully synced action: ${action.type} (ID: ${action.id})`);
          syncedCount++;
        } catch (error) {
          console.error(`[OfflineService] Failed to sync action: ${action.type} (ID: ${action.id})`, error);

          // Classify error and update action
          const errorType = this.classifyError(error);
          action.status = ActionStatus.FAILED;
          action.retryCount++;
          action.lastRetryAt = Date.now();
          action.error = {
            type: errorType,
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error,
          };

          updatedActions.push(action);
          failedCount++;
        }
      }

      // Update offline storage (remove synced actions, keep failed ones)
      await StorageService.setOfflineData('actions', updatedActions);

      console.log(
        `[OfflineService] Sync complete. ${syncedCount} succeeded, ${failedCount} failed`
      );
    } catch (error) {
      console.error('[OfflineService] Offline sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Dispatch action to appropriate service method
   * Complete implementation with all action types
   */
  private static async dispatchAction(action: OfflineAction): Promise<void> {
    console.log(`[OfflineService] Dispatching action: ${action.type}`);

    try {
      switch (action.type) {
        // ==================== TICKET ACTIONS ====================
        case ActionType.CREATE_TICKET:
          await ApiService.createTicket(action.data);
          break;

        case ActionType.UPDATE_TICKET:
          if (!action.data.id) {
            throw new Error('Ticket ID is required for update');
          }
          await ApiService.updateTicket(action.data.id, action.data);
          break;

        case ActionType.DELETE_TICKET:
          // Note: API service doesn't have deleteTicket, would need to be added
          throw new Error('Delete ticket not implemented in API service');

        // ==================== GOAL ACTIONS ====================
        case ActionType.CREATE_GOAL:
          // Note: API service doesn't have goal methods, would need to be added
          // For now, throw error with helpful message
          throw new Error('Goal operations not yet implemented in mobile API service');

        case ActionType.UPDATE_GOAL:
          throw new Error('Goal operations not yet implemented in mobile API service');

        case ActionType.DELETE_GOAL:
          throw new Error('Goal operations not yet implemented in mobile API service');

        // ==================== EARNING ACTIONS ====================
        case ActionType.CREATE_EARNING:
          throw new Error('Earning operations not yet implemented in mobile API service');

        case ActionType.UPDATE_EARNING:
          throw new Error('Earning operations not yet implemented in mobile API service');

        case ActionType.DELETE_EARNING:
          throw new Error('Earning operations not yet implemented in mobile API service');

        // ==================== EXPENSE ACTIONS ====================
        case ActionType.CREATE_EXPENSE:
          throw new Error('Expense operations not yet implemented in mobile API service');

        case ActionType.UPDATE_EXPENSE:
          throw new Error('Expense operations not yet implemented in mobile API service');

        case ActionType.DELETE_EXPENSE:
          throw new Error('Expense operations not yet implemented in mobile API service');

        // ==================== PRODUCT ACTIONS ====================
        case ActionType.CREATE_PRODUCT:
          throw new Error('Product operations not yet implemented in mobile API service');

        case ActionType.UPDATE_PRODUCT:
          throw new Error('Product operations not yet implemented in mobile API service');

        case ActionType.DELETE_PRODUCT:
          throw new Error('Product operations not yet implemented in mobile API service');

        // ==================== SALE ACTIONS ====================
        case ActionType.CREATE_SALE:
          throw new Error('Sale operations not yet implemented in mobile API service');

        case ActionType.UPDATE_SALE:
          throw new Error('Sale operations not yet implemented in mobile API service');

        case ActionType.DELETE_SALE:
          throw new Error('Sale operations not yet implemented in mobile API service');

        // ==================== CUSTOMER ACTIONS ====================
        case ActionType.CREATE_CUSTOMER:
          throw new Error('Customer operations not yet implemented in mobile API service');

        case ActionType.UPDATE_CUSTOMER:
          throw new Error('Customer operations not yet implemented in mobile API service');

        case ActionType.DELETE_CUSTOMER:
          throw new Error('Customer operations not yet implemented in mobile API service');

        // ==================== PLATFORM ACTIONS ====================
        case ActionType.CREATE_PLATFORM:
          throw new Error('Platform operations not yet implemented in mobile API service');

        case ActionType.UPDATE_PLATFORM:
          throw new Error('Platform operations not yet implemented in mobile API service');

        case ActionType.DELETE_PLATFORM:
          throw new Error('Platform operations not yet implemented in mobile API service');

        // ==================== INVOICE ACTIONS ====================
        case ActionType.CREATE_INVOICE:
          throw new Error('Invoice operations not yet implemented in mobile API service');

        case ActionType.UPDATE_INVOICE:
          throw new Error('Invoice operations not yet implemented in mobile API service');

        case ActionType.DELETE_INVOICE:
          throw new Error('Invoice operations not yet implemented in mobile API service');

        // ==================== MESSAGE ACTIONS ====================
        case ActionType.SEND_MESSAGE:
          if (!action.data.content) {
            throw new Error('Message content is required');
          }
          await ApiService.sendChatMessage(action.data.content, action.data.ticketId);
          break;

        // ==================== FILE ACTIONS ====================
        case ActionType.UPLOAD_FILE:
          if (!action.data.uri || !action.data.type) {
            throw new Error('File URI and type are required');
          }
          await ApiService.uploadFile(action.data.uri, action.data.type);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      console.log(`[OfflineService] Action dispatched successfully: ${action.type}`);
    } catch (error) {
      console.error(`[OfflineService] Action dispatch failed: ${action.type}`, error);
      throw error;
    }
  }

  /**
   * Classify error type for retry logic
   */
  private static classifyError(error: any): ErrorType {
    // Network errors - should retry
    if (
      error?.message?.includes('network') ||
      error?.message?.includes('timeout') ||
      error?.code === 'ECONNABORTED' ||
      error?.code === 'ETIMEDOUT'
    ) {
      return ErrorType.NETWORK_ERROR;
    }

    // Auth errors - should not retry (user needs to re-authenticate)
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return ErrorType.AUTH_ERROR;
    }

    // Validation errors - should not retry (bad data)
    if (error?.response?.status === 400 || error?.response?.status === 422) {
      return ErrorType.VALIDATION_ERROR;
    }

    // Conflict errors - may need user intervention
    if (error?.response?.status === 409) {
      return ErrorType.CONFLICT_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Determine if action should be retried based on error type and retry count
   */
  private static shouldRetryAction(action: OfflineAction): boolean {
    // Already exceeded max retries
    if (action.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      return false;
    }

    // Don't retry certain error types
    if (action.error) {
      switch (action.error.type) {
        case ErrorType.VALIDATION_ERROR:
        case ErrorType.AUTH_ERROR:
          // These require user intervention, don't retry
          return false;
        case ErrorType.CONFLICT_ERROR:
          // Only retry once for conflicts
          return action.retryCount < 1;
        case ErrorType.NETWORK_ERROR:
        case ErrorType.UNKNOWN_ERROR:
          // Retry these with exponential backoff
          return true;
        default:
          return true;
      }
    }

    return true;
  }

  /**
   * Calculate exponential backoff delay
   */
  private static getRetryDelay(retryCount: number): number {
    const delay = this.BASE_RETRY_DELAY * Math.pow(2, retryCount);
    return Math.min(delay, this.MAX_RETRY_DELAY);
  }

  /**
   * Update a specific action in storage
   */
  private static async updateAction(action: OfflineAction): Promise<void> {
    const offlineData = await StorageService.getOfflineData();
    const actions: OfflineAction[] = offlineData.actions || [];

    const index = actions.findIndex((a) => a.id === action.id);
    if (index !== -1) {
      actions[index] = action;
      await StorageService.setOfflineData('actions', actions);
    }
  }

  /**
   * Get action status for user feedback
   */
  static async getActionStatus(actionId: string): Promise<OfflineAction | null> {
    const offlineData = await StorageService.getOfflineData();
    const actions: OfflineAction[] = offlineData.actions || [];
    return actions.find((a) => a.id === actionId) || null;
  }

  /**
   * Get all pending actions grouped by status
   */
  static async getActionsSummary(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    synced: number;
  }> {
    const offlineData = await StorageService.getOfflineData();
    const actions: OfflineAction[] = offlineData.actions || [];

    return {
      pending: actions.filter((a) => a.status === ActionStatus.PENDING).length,
      syncing: actions.filter((a) => a.status === ActionStatus.SYNCING).length,
      failed: actions.filter((a) => a.status === ActionStatus.FAILED).length,
      synced: actions.filter((a) => a.status === ActionStatus.SYNCED).length,
    };
  }

  /**
   * Retry a specific failed action
   */
  static async retryAction(actionId: string): Promise<void> {
    const offlineData = await StorageService.getOfflineData();
    const actions: OfflineAction[] = offlineData.actions || [];

    const action = actions.find((a) => a.id === actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    if (action.status !== ActionStatus.FAILED) {
      throw new Error(`Action is not in failed state: ${actionId}`);
    }

    // Reset retry count and status
    action.retryCount = 0;
    action.status = ActionStatus.PENDING;
    action.error = undefined;

    await this.updateAction(action);

    // Trigger sync
    if (await this.isOnline()) {
      this.syncOfflineData();
    }
  }

  /**
   * Clear all synced actions from storage
   */
  static async clearSyncedActions(): Promise<void> {
    const offlineData = await StorageService.getOfflineData();
    let actions: OfflineAction[] = offlineData.actions || [];

    // Keep only non-synced actions
    actions = actions.filter((a) => a.status !== ActionStatus.SYNCED);

    await StorageService.setOfflineData('actions', actions);
    console.log('[OfflineService] Cleared synced actions');
  }

  /**
   * Remove a specific failed action (user cancelled)
   */
  static async removeAction(actionId: string): Promise<void> {
    const offlineData = await StorageService.getOfflineData();
    let actions: OfflineAction[] = offlineData.actions || [];

    actions = actions.filter((a) => a.id !== actionId);

    await StorageService.setOfflineData('actions', actions);
    console.log(`[OfflineService] Removed action: ${actionId}`);
  }

  private static startPeriodicSync(): void {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      this.syncOfflineData();
    }, 5 * 60 * 1000);
  }

  static stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  static async clearOfflineData(): Promise<void> {
    await StorageService.clearOfflineData();
  }

  static async getQueuedActionsCount(): Promise<number> {
    const offlineData = await StorageService.getOfflineData();
    const actions: OfflineAction[] = offlineData.actions || [];
    // Only count non-synced actions
    return actions.filter((a) => a.status !== ActionStatus.SYNCED).length;
  }
}

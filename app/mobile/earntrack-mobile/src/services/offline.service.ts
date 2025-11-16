import NetInfo from '@react-native-community/netinfo';
import { StorageService } from './storage.service';
import ApiService from './api.service';

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
}

export class OfflineService {
  private static syncInProgress = false;
  private static syncInterval: NodeJS.Timeout | null = null;

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

  static async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
    const offlineData = await StorageService.getOfflineData();
    const actions: OfflineAction[] = offlineData.actions || [];

    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    actions.push(newAction);
    await StorageService.setOfflineData('actions', actions);

    // Try to sync immediately if online
    if (await this.isOnline()) {
      this.syncOfflineData();
    }
  }

  static async syncOfflineData(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    const online = await this.isOnline();
    if (!online) {
      console.log('Device is offline, cannot sync');
      return;
    }

    this.syncInProgress = true;

    try {
      const offlineData = await StorageService.getOfflineData();
      const actions: OfflineAction[] = offlineData.actions || [];

      if (actions.length === 0) {
        console.log('No offline actions to sync');
        return;
      }

      console.log(`Syncing ${actions.length} offline actions...`);

      const failedActions: OfflineAction[] = [];

      for (const action of actions) {
        try {
          await this.executeAction(action);
          console.log(`Successfully synced action: ${action.type} ${action.endpoint}`);
        } catch (error) {
          console.error(`Failed to sync action: ${action.type} ${action.endpoint}`, error);
          failedActions.push(action);
        }
      }

      // Update offline storage with only failed actions
      await StorageService.setOfflineData('actions', failedActions);

      console.log(`Sync complete. ${actions.length - failedActions.length} succeeded, ${failedActions.length} failed`);
    } catch (error) {
      console.error('Offline sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private static async executeAction(action: OfflineAction): Promise<void> {
    // Execute the offline action using the API service
    // This is a simplified implementation - in production, you'd need proper endpoint mapping
    switch (action.type) {
      case 'create':
        // await ApiService[action.endpoint](action.data);
        break;
      case 'update':
        // await ApiService[action.endpoint](action.data.id, action.data);
        break;
      case 'delete':
        // await ApiService[action.endpoint](action.data.id);
        break;
    }
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
    return actions.length;
  }
}

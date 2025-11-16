/**
 * PWA Utilities - Service Worker Registration, Offline Detection, and App Update Management
 */

/**
 * Service Worker registration result
 */
export interface ServiceWorkerRegistrationResult {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  error?: Error;
}

/**
 * PWA install prompt event
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Pending sync request interface
 */
interface PendingRequest {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

/**
 * Update notification callback
 */
type UpdateCallback = (registration: ServiceWorkerRegistration) => void;

/**
 * Install prompt callback
 */
type InstallPromptCallback = (event: BeforeInstallPromptEvent) => void;

/**
 * Network status callback
 */
type NetworkStatusCallback = (isOnline: boolean) => void;

// Global state
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let updateCallback: UpdateCallback | null = null;
let installPromptCallback: InstallPromptCallback | null = null;
let networkStatusCallback: NetworkStatusCallback | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker not supported');
    return { success: false, error: new Error('Service Worker not supported') };
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none' // Always check for updates
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA] New service worker available');
          if (updateCallback) {
            updateCallback(registration);
          }
        }
      });
    });

    // Listen for controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] New service worker activated');
      window.location.reload();
    });

    return { success: true, registration };
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Unregister service worker (for development/testing)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const results = await Promise.all(
      registrations.map(registration => registration.unregister())
    );
    return results.every(result => result === true);
  } catch (error) {
    console.error('[PWA] Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Update service worker to the new version
 */
export function updateServiceWorker(registration: ServiceWorkerRegistration): void {
  const waitingWorker = registration.waiting;
  if (!waitingWorker) return;

  // Tell the service worker to skip waiting
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Set callback for service worker updates
 */
export function onServiceWorkerUpdate(callback: UpdateCallback): void {
  updateCallback = callback;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
  }

  return Notification.permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PWA] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('[PWA] Subscribed to push notifications');
    }

    return subscription;
  } catch (error) {
    console.error('[PWA] Failed to subscribe to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('[PWA] Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PWA] Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Setup install prompt handling
 */
export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing
    e.preventDefault();

    // Store the event for later use
    deferredPrompt = e as BeforeInstallPromptEvent;

    console.log('[PWA] Install prompt available');

    if (installPromptCallback) {
      installPromptCallback(deferredPrompt);
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
  });
}

/**
 * Set callback for install prompt
 */
export function onInstallPromptAvailable(callback: InstallPromptCallback): void {
  installPromptCallback = callback;

  // Call immediately if prompt is already available
  if (deferredPrompt) {
    callback(deferredPrompt);
  }
}

/**
 * Show the install prompt
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('[PWA] Install prompt not available');
    return false;
  }

  try {
    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    console.log('[PWA] Install prompt outcome:', outcome);

    // Clear the prompt
    deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Failed to show install prompt:', error);
    return false;
  }
}

/**
 * Check if the app is installed
 */
export function isAppInstalled(): boolean {
  // Check if running in standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // Check if running as PWA on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIOSStandalone = (window.navigator as any).standalone === true;

  return isStandalone || (isIOS && isIOSStandalone);
}

/**
 * Check if install prompt is available
 */
export function isInstallPromptAvailable(): boolean {
  return deferredPrompt !== null;
}

/**
 * Setup offline detection
 */
export function setupOfflineDetection(): void {
  // Initial status
  notifyNetworkStatus(navigator.onLine);

  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('[PWA] Back online');
    notifyNetworkStatus(true);
    syncPendingRequests();
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] Gone offline');
    notifyNetworkStatus(false);
  });
}

/**
 * Set callback for network status changes
 */
export function onNetworkStatusChange(callback: NetworkStatusCallback): void {
  networkStatusCallback = callback;

  // Call immediately with current status
  callback(navigator.onLine);
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Notify network status change
 */
function notifyNetworkStatus(isOnline: boolean): void {
  if (networkStatusCallback) {
    networkStatusCallback(isOnline);
  }
}

/**
 * Add request to sync queue
 */
export async function addToSyncQueue(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string
): Promise<void> {
  const request: PendingRequest = {
    url,
    method,
    headers,
    body,
    timestamp: Date.now()
  };

  try {
    const db = await openSyncDB();
    const tx = db.transaction('pending-requests', 'readwrite');
    const store = tx.objectStore('pending-requests');
    await store.add(request);

    console.log('[PWA] Added request to sync queue:', url);

    // Register for background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-earnings');
    }
  } catch (error) {
    console.error('[PWA] Failed to add to sync queue:', error);
  }
}

/**
 * Get pending requests count
 */
export async function getPendingRequestsCount(): Promise<number> {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('pending-requests', 'readonly');
    const store = tx.objectStore('pending-requests');
    const count = await store.count();
    return count;
  } catch (error) {
    console.error('[PWA] Failed to get pending requests count:', error);
    return 0;
  }
}

/**
 * Sync pending requests
 */
export async function syncPendingRequests(): Promise<void> {
  if (!navigator.onLine) {
    console.log('[PWA] Cannot sync - offline');
    return;
  }

  try {
    const db = await openSyncDB();
    const tx = db.transaction('pending-requests', 'readonly');
    const store = tx.objectStore('pending-requests');
    const requests = await store.getAll();

    if (requests.length === 0) {
      console.log('[PWA] No pending requests to sync');
      return;
    }

    console.log(`[PWA] Syncing ${requests.length} pending requests`);

    for (const req of requests) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body
        });

        if (response.ok) {
          // Remove from queue
          const deleteTx = db.transaction('pending-requests', 'readwrite');
          await deleteTx.objectStore('pending-requests').delete(req.id!);
          console.log('[PWA] Synced request:', req.url);
        }
      } catch (error) {
        console.error('[PWA] Failed to sync request:', req.url, error);
      }
    }
  } catch (error) {
    console.error('[PWA] Sync failed:', error);
  }
}

/**
 * Clear all pending requests
 */
export async function clearSyncQueue(): Promise<void> {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('pending-requests', 'readwrite');
    await tx.objectStore('pending-requests').clear();
    console.log('[PWA] Sync queue cleared');
  } catch (error) {
    console.error('[PWA] Failed to clear sync queue:', error);
  }
}

/**
 * Open IndexedDB for sync storage
 */
function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('earntrack-sync', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pending-requests')) {
        db.createObjectStore('pending-requests', {
          keyPath: 'id',
          autoIncrement: true
        });
      }
    };
  });
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('earntrack-'))
        .map(name => caches.delete(name))
    );
    console.log('[PWA] All caches cleared');
  } catch (error) {
    console.error('[PWA] Failed to clear caches:', error);
  }
}

/**
 * Pre-cache specific URLs
 */
export async function precacheUrls(urls: string[]): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'CACHE_URLS',
        urls
      });
    }
  } catch (error) {
    console.error('[PWA] Failed to pre-cache URLs:', error);
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Get cache storage usage
 */
export async function getCacheStorageUsage(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, percentage };
  } catch (error) {
    console.error('[PWA] Failed to get storage estimate:', error);
    return { usage: 0, quota: 0, percentage: 0 };
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

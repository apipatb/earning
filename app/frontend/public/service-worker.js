/**
 * EarnTrack Service Worker - v1.0.0
 * Implements advanced caching, offline support, background sync, and push notifications
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `earntrack-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Cache names for different strategies
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const IMAGE_CACHE = `${CACHE_NAME}-images`;
const API_CACHE = `${CACHE_NAME}-api`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/user/profile',
  '/api/platforms',
  '/api/earnings',
  '/api/analytics/summary'
];

// Maximum cache sizes
const MAX_CACHE_SIZE = {
  [DYNAMIC_CACHE]: 50,
  [IMAGE_CACHE]: 100,
  [API_CACHE]: 30
};

// Cache duration in milliseconds
const CACHE_DURATION = {
  images: 7 * 24 * 60 * 60 * 1000, // 7 days
  api: 5 * 60 * 1000, // 5 minutes
  static: 30 * 24 * 60 * 60 * 1000 // 30 days
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v' + CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(STATIC_ASSETS);
        console.log('[Service Worker] Static assets cached');

        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Installation failed:', error);
      }
    })()
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating v' + CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name.startsWith('earntrack-') && name !== CACHE_NAME)
            .map(name => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );

        // Claim all clients
        await self.clients.claim();
        console.log('[Service Worker] Activated and claimed clients');
      } catch (error) {
        console.error('[Service Worker] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Choose strategy based on request type
  if (url.pathname.startsWith('/api/')) {
    // Network-first for API calls
    event.respondWith(networkFirstStrategy(request, API_CACHE));
  } else if (isImageRequest(request)) {
    // Cache-first for images
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  } else if (isStaticAsset(url.pathname)) {
    // Cache-first for static assets
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else {
    // Stale-while-revalidate for HTML pages
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
  }
});

/**
 * Cache-first strategy: Check cache first, fallback to network
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached && !isCacheExpired(cached)) {
      return cached;
    }

    try {
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
        await limitCacheSize(cacheName);
      }
      return response;
    } catch (error) {
      // Return stale cache if network fails
      if (cached) {
        return cached;
      }
      throw error;
    }
  } catch (error) {
    console.error('[Service Worker] Cache-first strategy failed:', error);
    return await caches.match(OFFLINE_URL);
  }
}

/**
 * Network-first strategy: Try network first, fallback to cache
 */
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful API responses
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.append('sw-cached-at', Date.now().toString());

      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });

      await cache.put(request, cachedResponse);
      await limitCacheSize(cacheName);
    }

    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);

    const cached = await cache.match(request);
    if (cached) {
      // Add header to indicate offline response
      const headers = new Headers(cached.headers);
      headers.append('X-Offline-Response', 'true');

      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: headers
      });
    }

    // Return offline response for failed API calls
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. Please check your connection.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'X-Offline-Response': 'true' }
      }
    );
  }
}

/**
 * Stale-while-revalidate strategy: Return cache immediately, update in background
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch in background
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
        limitCacheSize(cacheName);
      }
      return response;
    })
    .catch(() => null);

  // Return cached version immediately or wait for network
  return cached || fetchPromise || caches.match(OFFLINE_URL);
}

/**
 * Check if cached response is expired
 */
function isCacheExpired(response) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false;

  const age = Date.now() - parseInt(cachedAt);
  const url = new URL(response.url);

  if (isImageRequest({ url: response.url })) {
    return age > CACHE_DURATION.images;
  } else if (url.pathname.startsWith('/api/')) {
    return age > CACHE_DURATION.api;
  } else {
    return age > CACHE_DURATION.static;
  }
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName) {
  const maxSize = MAX_CACHE_SIZE[cacheName] || 50;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    // Remove oldest entries
    const toDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  const url = request.url || request;
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url);
}

/**
 * Check if path is a static asset
 */
function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|ttf|eot)$/i.test(pathname);
}

/**
 * Background Sync - Handle failed requests
 */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-earnings') {
    event.waitUntil(syncPendingRequests());
  }
});

/**
 * Sync pending requests from IndexedDB
 */
async function syncPendingRequests() {
  try {
    // Open IndexedDB to get pending requests
    const db = await openSyncDB();
    const tx = db.transaction('pending-requests', 'readonly');
    const store = tx.objectStore('pending-requests');
    const requests = await store.getAll();

    // Process each pending request
    for (const req of requests) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body
        });

        if (response.ok) {
          // Remove from pending queue
          const deleteTx = db.transaction('pending-requests', 'readwrite');
          await deleteTx.objectStore('pending-requests').delete(req.id);

          // Notify client of successful sync
          await notifyClients({
            type: 'SYNC_SUCCESS',
            data: { requestId: req.id }
          });
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

/**
 * Open IndexedDB for sync storage
 */
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('earntrack-sync', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-requests')) {
        db.createObjectStore('pending-requests', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * Push Notification event
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'EarnTrack', options)
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Message event - Handle messages from clients
 */
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(names => Promise.all(
          names.filter(name => name.startsWith('earntrack-'))
            .map(name => caches.delete(name))
        ))
    );
  }
});

/**
 * Notify all clients with a message
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}

console.log('[Service Worker] Loaded v' + CACHE_VERSION);

// Service Worker for production caching and offline functionality
const CACHE_NAME = 'kutable-v1.0.0';
const STATIC_CACHE = 'kutable-static-v1';
const API_CACHE = 'kutable-api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/Kutable%20Logo.png',
  '/clean%20barbershop.jpeg',
  '/clean%20barbers.webp'
];

// API routes to cache
const API_ROUTES = [
  '/api/barbers',
  '/api/services'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== STATIC_CACHE && 
              cacheName !== API_CACHE &&
              cacheName !== CACHE_NAME
            )
            .map(cacheName => caches.delete(cacheName))
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url || '';
  
  // Only handle http/https GET requests
  if (!url.startsWith('http')) return;
  if (req.method !== 'GET') return;

  // Only cache same-origin requests (prevents CSP noise for 3rd-party like Stripe/Fonts)
  const sameOrigin = new URL(url).origin === self.location.origin;
  if (!sameOrigin) return; // let the browser handle it

  event.respondWith((async () => {
    try {
      const net = await fetch(req);
      // Cache a copy (best-effort)
      const cache = await caches.open('app-cache');
      cache.put(req, net.clone());
      return net;
    } catch {
      const cache = await caches.open('app-cache');
      const hit = await cache.match(req);
      if (hit) return hit;
      throw new Error('Network and cache both unavailable');
    }
  })());
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync any pending data when connection is restored
    const pendingData = await getStoredPendingData();
    for (const item of pendingData) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        // Remove from pending queue on success
        await removePendingData(item.id);
      } catch (error) {
        console.error('Background sync failed for item:', item.id);
      }
    }
  } catch (error) {
    console.error('Background sync error:', error);
  }
}

async function getStoredPendingData() {
  // Implementation would depend on IndexedDB storage
  return [];
}

async function removePendingData(id) {
  // Implementation would depend on IndexedDB storage
  return true;
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/Kutable%20Logo.png',
      badge: '/Kutable%20Logo.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: data.actions || [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});
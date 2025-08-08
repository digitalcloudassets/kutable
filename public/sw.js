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
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    // Static assets
    if (url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|css|js)$/)) {
      event.respondWith(
        caches.open(STATIC_CACHE).then(cache => {
          return cache.match(request).then(response => {
            if (response) {
              return response;
            }
            return fetch(request).then(fetchResponse => {
              cache.put(request, fetchResponse.clone());
              return fetchResponse;
            });
          });
        })
      );
      return;
    }

    // API calls
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
      event.respondWith(
        caches.open(API_CACHE).then(cache => {
          return cache.match(request).then(response => {
            const fetchPromise = fetch(request).then(fetchResponse => {
              // Only cache successful responses
              if (fetchResponse.ok) {
                cache.put(request, fetchResponse.clone());
              }
              return fetchResponse;
            }).catch(() => {
              // Return cached version if network fails
              return response || new Response(
                JSON.stringify({ error: 'Network unavailable' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });

            // Return cache first, then update (stale-while-revalidate)
            return response || fetchPromise;
          });
        })
      );
      return;
    }

    // HTML pages - cache with network fallback
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then(response => {
            // Cache successful page loads
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response.clone());
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback to cached version
            return caches.match(request).then(cachedResponse => {
              return cachedResponse || caches.match('/');
            });
          })
      );
    }
  }
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
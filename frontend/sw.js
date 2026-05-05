// Birdev Jayanti 2K26 - Service Worker
const CACHE_NAME = 'birdev-2k26-v3';

// Core files to cache for offline use
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/api.js',
    '/images/murshidheshwargod.png',
    '/images/shreeram.png',
    '/images/ahilyadevi.png',
    '/images/qr.webp',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ===== INSTALL EVENT — Cache all static files =====
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Birdev Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static files');
            // Cache what we can — ignore failures for CDN resources
            return Promise.allSettled(
                STATIC_CACHE.map(url => cache.add(url).catch(() => console.warn('[SW] Failed to cache:', url)))
            );
        }).then(() => self.skipWaiting()) // Activate immediately
    );
});

// ===== ACTIVATE EVENT — Clean old caches =====
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Birdev Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

// ===== FETCH EVENT — Serve from cache, fallback to network =====
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Always go to network for API calls (never cache dynamic data)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // For all other requests: Cache-first strategy
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // Serve from cache
            }
            // Not in cache — fetch from network & cache for next time
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                    const cloned = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                }
                return networkResponse;
            }).catch(() => {
                // If both cache and network fail, show offline page for HTML requests
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});

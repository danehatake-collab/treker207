// HUSTLE YEAR PWA - Service Worker v10
const CACHE_NAME = 'hustle-year-v10';
const OFFLINE_URL = '/';

// Files to cache on install
const PRECACHE = ['/', '/index.html'];

// Install - cache essential files
self.addEventListener('install', (e) => {
    console.log('[SW] Installing...');
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', (e) => {
    console.log('[SW] Activating...');
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch - Cache First, then Network
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;
    
    e.respondWith(
        caches.match(e.request).then(cached => {
            // Return cached version immediately
            if (cached) {
                // Update cache in background
                e.waitUntil(
                    fetch(e.request).then(response => {
                        if (response && response.ok) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(e.request, response);
                            });
                        }
                    }).catch(() => {})
                );
                return cached;
            }
            
            // No cache - fetch from network
            return fetch(e.request).then(response => {
                if (response && response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback
                if (e.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// Background sync
self.addEventListener('sync', (e) => {
    if (e.tag === 'sync-data') {
        e.waitUntil(
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SYNC_COMPLETE' });
                });
            })
        );
    }
});

// Message handler
self.addEventListener('message', (e) => {
    if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

console.log('[SW] Loaded');

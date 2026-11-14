
const CACHE_NAME = 'kodziva-v2';
const APP_FILES=[
    "/",
    "/index.html",
    "/style.css",
    "/app.js",
    "/manifest.webmanifest"
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(APP_FILES);
            })
    );

    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => caches.delete(name))
            );
        })
    );

    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    //Do not cache AI API requests
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;
    if (request.method !== 'GET') return;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
                return cachedResponse || fetch(request);
        })
    );
});
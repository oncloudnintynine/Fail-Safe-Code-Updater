const CACHE_NAME = 'fail-safe-updater-v1.1.13';
self.addEventListener('install', (e) => {
self.skipWaiting();
});
self.addEventListener('activate', (e) => {
e.waitUntil(clients.claim());
});

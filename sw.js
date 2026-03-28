// Service Worker Minimal pour YARID
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installé');
});

self.addEventListener('fetch', (e) => {
  // Nécessaire pour que l'app soit considérée comme installable
  e.respondWith(fetch(e.request));
});

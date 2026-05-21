/**
 * ============================================================================
 * YARID Service Worker v2.0
 * Offline First | Background Sync | Smart Cache | Push Notifications
 * ============================================================================
 *
 * Strategies:
 *   - Pages HTML       : Network First → offline.html fallback
 *   - Images           : Cache First (produits) → stale-while-revalidate
 *   - API (Supabase)   : Stale-While-Revalidate
 *   - Static assets    : Cache First + versioned
 *   - Fonts/CDN        : Stale-While-Revalidate
 *
 * Features:
 *   - Offline page serving
 *   - Background Sync for queued actions
 *   - Push notification handling
 *   - Cart reminder notifications
 *   - Intelligent cache cleanup
 * ============================================================================
 */

// ─── VERSIONING ─────────────────────────────────────────────────────────────
// INCREMENTER à chaque déploiement pour forcer la mise à jour du cache
const CACHE_VERSION = 'yarid-v2026-05-15';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Ressources critiques (pré-cache au install)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/categories.html',
  '/category-view.html',
  '/services.html',
  '/contact.html',
  '/promo.html',
  '/btp-details.html',
  '/digital-details.html',
  '/produits.html',
  '/promotions-gestion.html',
  '/manifest.json',
  '/cart-global.js',
  '/cart.js',
  '/i18n.js',
  '/notifications.js',
  '/referral-system.js',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/icons/favicon-32x32.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png'
];

// URLs externes à cacher
const EXTERNAL_RESOURCES = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2',
  'https://fonts.gstatic.com'
];

// ─── INSTALL ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Installing...`);
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log(`[SW ${CACHE_VERSION}] Pre-caching ${PRECACHE_ASSETS.length} assets`);
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch(err => {
        console.error(`[SW ${CACHE_VERSION}] Pre-cache error:`, err);
      })
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Activating...`);

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Supprimer les caches d'anciennes versions
          if (cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== IMAGE_CACHE &&
              cacheName !== API_CACHE) {
            console.log(`[SW ${CACHE_VERSION}] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Prendre le contrôle immédiat de tous les clients
      return self.clients.claim();
    }).then(() => {
      // Notifier tous les clients de la mise à jour
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// ─── FETCH STRATEGIES ───────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les extensions Chrome
  if (request.method !== 'GET') return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // ── API Supabase (Stale-While-Revalidate) ──
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('whcpugnkldbmuqzgqxbe.supabase.co')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // ── Images des produits (Cache First) ──
  if (request.destination === 'image' ||
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // ── Fonts & CDN (Stale-While-Revalidate) ──
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.tailwindcss.com') ||
      url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // ── Pages HTML (Network First → offline fallback) ──
  if (request.headers.get('accept')?.includes('text/html') ||
      request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // ── Static assets (Cache First) ──
  if (url.pathname.match(/\.(js|css|json|woff2?)$/i)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── Default: Network First ──
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ─── STRATEGY FUNCTIONS ─────────────────────────────────────────────────────

/**
 * Cache First : retourne le cache, puis met à jour en arrière-plan
 * Parfait pour les images et assets statiques
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Rafraîchir en arrière-plan (pas bloquant)
    fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
    }).catch(() => {});
    return cached;
  }

  // Pas en cache → fetch + cache
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 404, statusText: 'Not found offline' });
  }
}

/**
 * Stale-While-Revalidate : retourne le cache immédiatement, puis refresh
 * Parfait pour les API (prix, stocks, produits)
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Toujours fetch en parallèle pour rafraîchir
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(err => {
    console.log(`[SW ${CACHE_VERSION}] Fetch failed, using cache:`, request.url);
    throw err;
  });

  // Retourner le cache immédiatement s'il existe
  if (cached) {
    fetchPromise.catch(() => {}); // Ne pas bloquer
    return cached;
  }

  // Sinon attendre le fetch
  try {
    return await fetchPromise;
  } catch {
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Network First : fetch d'abord, fallback sur cache
 * Parfait pour les pages HTML
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

/**
 * Network First avec fallback offline.html pour les pages
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Mettre à jour le cache dynamique
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.log(`[SW ${CACHE_VERSION}] Network failed for ${request.url}, trying cache...`);

    // Essayer le cache dynamique d'abord
    const dynamicCache = await caches.open(DYNAMIC_CACHE);
    const cached = await dynamicCache.match(request);
    if (cached) return cached;

    // Essayer le cache statique
    const staticCache = await caches.open(STATIC_CACHE);
    const staticCached = await staticCache.match(request);
    if (staticCached) return staticCached;

    // Fallback sur offline.html
    console.log(`[SW ${CACHE_VERSION}] Serving offline.html`);
    const offlineResponse = await staticCache.match('/offline.html');
    if (offlineResponse) return offlineResponse;

    // Dernier recours
    return new Response(
      '<html><body style="text-align:center;padding:40px;font-family:sans-serif"><h1>YARID</h1><p>Vous etes hors connexion.</p><a href="/">Retour</a></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ─── BACKGROUND SYNC ────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Sync event: ${event.tag}`);

  if (event.tag === 'yarid-sync' || event.tag === 'yarid-sync-queue') {
    event.waitUntil(processSyncQueue());
  }
});

/**
 * Traite la file d'attente de synchronisation
 */
async function processSyncQueue() {
  // Récupérer la queue du localStorage via le client
  const clients = await self.clients.matchAll({ type: 'window' });

  if (clients.length === 0) {
    console.log(`[SW ${CACHE_VERSION}] No clients for sync`);
    return;
  }

  // Notifier le client principal de traiter la queue
  clients[0].postMessage({
    type: 'PROCESS_SYNC_QUEUE',
    timestamp: Date.now()
  });
}

// ─── PUSH NOTIFICATIONS ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Push received:`, event.data?.text());

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'YARID',
      body: event.data?.text() || 'Nouvelle notification',
      icon: '/icons/android-chrome-192x192.png',
      badge: '/icons/favicon-32x32.png',
      url: '/index.html'
    };
  }

  const options = {
    body: data.body || 'Nouvelle notification',
    icon: data.icon || '/icons/android-chrome-192x192.png',
    badge: data.badge || '/icons/favicon-32x32.png',
    tag: data.tag || 'yarid-push',
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: data.url || '/index.html',
      type: data.type || 'push',
      ...data.data
    },
    actions: data.actions || [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'YARID', options)
  );
});

// ─── NOTIFICATION CLICK ─────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { notification } = event;
  const data = notification.data || {};

  if (event.action === 'close') return;

  // Ouvrir ou focus la page cible
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const targetUrl = data.url || '/index.html';

      // Chercher un client existant
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }

      // Sinon ouvrir une nouvelle fenêtre
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── MESSAGE HANDLING (communication avec les pages) ────────────────────────

self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.source?.postMessage({
        type: 'SW_VERSION',
        version: CACHE_VERSION
      });
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then(names =>
          Promise.all(names.map(n => caches.delete(n)))
        )
      );
      break;

    case 'SYNC_COMPLETE':
      // Confirmer la synchronisation au client
      event.source?.postMessage({
        type: 'SYNC_COMPLETE',
        success: data?.success,
        timestamp: Date.now()
      });
      break;

    case 'SHOW_NOTIFICATION':
      event.waitUntil(
        self.registration.showNotification(data.title || 'YARID', {
          body: data.body || '',
          icon: data.icon || '/icons/android-chrome-192x192.png',
          badge: data.badge || '/icons/favicon-32x32.png',
          tag: data.tag || 'yarid-local',
          data: { url: data.url || '/index.html' }
        })
      );
      break;
  }
});

// ─── PERIODIC SYNC (cart reminders) ─────────────────────────────────────────

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cart-reminder') {
    event.waitUntil(sendCartReminder());
  }
});

/**
 * Envoie un rappel de panier via notification
 */
async function sendCartReminder() {
  // Récupérer le panier depuis le cache (pas d'accès direct au localStorage depuis SW)
  const cache = await caches.open(DYNAMIC_CACHE);
  const response = await cache.match('/api/cart-status');

  if (!response) return;

  const data = await response.json();
  if (data.itemCount > 0) {
    await self.registration.showNotification('YARID - Panier', {
      body: `Vous avez ${data.itemCount} article(s) dans votre panier. Finalisez votre commande !`,
      icon: '/icons/android-chrome-192x192.png',
      badge: '/icons/favicon-32x32.png',
      tag: 'cart-reminder',
      requireInteraction: false,
      actions: [
        { action: 'open_cart', title: 'Voir le panier' },
        { action: 'dismiss', title: 'Ignorer' }
      ],
      data: { url: '/index.html', type: 'cart_reminder' }
    });
  }
}

console.log(`[SW ${CACHE_VERSION}] Service Worker loaded`);

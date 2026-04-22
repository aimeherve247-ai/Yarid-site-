/**
 * YARID Service Worker
 * PWA avec stratégie de cache avancée
 */

const CACHE_NAME = 'yarid-v1.0.0';
const STATIC_CACHE = 'yarid-static-v1';
const DYNAMIC_CACHE = 'yarid-dynamic-v1';
const IMAGE_CACHE = 'yarid-images-v1';

// // Ressources à pré-cacher (Version mise à jour avec les icônes)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/services.html',
  '/contact.html',
  '/btp-details.html',
  '/digital-details.html',
  '/marketing-stats.html',
  '/promotions-gestion.html',
  '/analytics.js',
  '/referral-system.js', // Ne pas oublier la virgule ici
  '/icons/icon_192.png',
  '/icons/icon_512.png',
  '/icons/favicon_32.png'
];

];

];

// Ressources externes critiques
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pré-caching des ressources statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return caches.open(DYNAMIC_CACHE);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Erreur lors du pré-caching:', err);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== IMAGE_CACHE
            ) {
              console.log('[SW] Suppression du cache obsolète:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

// Stratégie de cache : Network First avec fallback sur cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Fallback sur le cache pour:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si c'est une page HTML, retourner la page offline
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Stratégie de cache : Cache First pour les images
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Erreur réseau et pas de cache:', request.url);
    throw error;
  }
}

// Stratégie de cache : Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW] Échec du revalidate:', error);
    });
  
  return cachedResponse || fetchPromise;
}

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorer les requêtes Supabase (API)
  if (url.hostname.includes('supabase.co')) {
    return;
  }
  
  // Stratégie pour les images
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Stratégie pour les polices et CSS/JS externes
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  
  // Stratégie pour les pages HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Stratégie par défaut
  event.respondWith(networkFirst(request));
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  // Synchroniser les événements analytics en attente
  console.log('[SW] Synchronisation des analytics...');
}

// Notifications push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Nouvelle notification YARID',
icon: '/icons/icon_192.png',

    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/index.html'
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('YARID', options)
  );
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/index.html')
    );
  }
});

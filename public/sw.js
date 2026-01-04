const CACHE_NAME = 'quiz-africain-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/assets/icon-72x72.png',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png'
];

const DYNAMIC_CACHE = 'quiz-dynamic-v1';

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache des assets statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie: Cache First, Network Fallback pour les assets statiques
// Network First, Cache Fallback pour les API
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Mettre en cache les réponses API réussies
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback au cache si offline
          return caches.match(request);
        })
    );
    return;
  }

  // Assets statiques - Cache First
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then(fetchResponse => {
            // Ne pas mettre en cache les requêtes cross-origin
            if (!fetchResponse || fetchResponse.status !== 200 || 
                fetchResponse.type !== 'basic' || request.method !== 'GET') {
              return fetchResponse;
            }

            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return fetchResponse;
          });
      })
      .catch(() => {
        // Fallback pour la page d'accueil
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return null;
      })
  );
});

// Gestion des messages (pour les mises à jour)
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Synchronisation en arrière-plan
self.addEventListener('sync', event => {
  if (event.tag === 'sync-questions') {
    event.waitUntil(syncQuestions());
  }
});

async function syncQuestions() {
  try {
    // Logique de synchronisation des questions
    console.log('Synchronisation des questions en arrière-plan');
  } catch (error) {
    console.error('Erreur synchronisation:', error);
  }
}
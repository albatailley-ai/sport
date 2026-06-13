/* ============================================================
   Service Worker — Programme Sarah
   ------------------------------------------------------------
   ⚠️  INCRÉMENTE CACHE_VERSION À CHAQUE DÉPLOIEMENT
       (sarah-v2 → sarah-v3 → sarah-v4 …).
   Le simple fait de changer ce numéro modifie les octets de ce
   fichier : le navigateur détecte alors un nouveau Service Worker,
   l'installe, le met « en attente » (waiting) et la page affiche
   le bandeau « mise à jour disponible ».
   ------------------------------------------------------------
   Scope volontairement limité à programme-sarah.html :
   le programme d'Alex n'est JAMAIS contrôlé par ce worker.
   Les appels Supabase / CDN passent directement au réseau :
   la synchro cloud n'est pas touchée.
   ============================================================ */

const CACHE_VERSION = 'sarah-20260613-193814';
const PAGE = 'programme-sarah.html';

// --- Installation : on précharge la page, sans forcer l'activation ---
// (pas de skipWaiting ici → le nouveau SW reste « waiting » → bandeau)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.add(new Request('./' + PAGE, { cache: 'reload' })))
      .catch(() => {})
  );
});

// --- Activation : on supprime les anciens caches versionnés ---
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_VERSION && k.startsWith('sarah-'))
          .map(k => caches.delete(k))
    );
  })());
});

// --- Le bandeau « Actualiser » envoie ce message → on saute l'attente ---
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// --- Stratégie réseau-d'abord pour la page Sarah uniquement ---
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Ne gère QUE la navigation same-origin vers la page Sarah.
  // Tout le reste (Supabase, supabase-js CDN, etc.) → réseau direct, intact.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.endsWith(PAGE)) return;

  event.respondWith((async () => {
    try {
      // no-store : on contourne le cache HTTP de GitHub Pages → toujours frais en ligne
      const fresh = await fetch(req, { cache: 'no-store' });
      const cache = await caches.open(CACHE_VERSION);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      // Hors-ligne : on sert la dernière version en cache
      const cached = await caches.match(req) || await caches.match('./' + PAGE);
      return cached || Response.error();
    }
  })());
});

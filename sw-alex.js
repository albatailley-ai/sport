/* ============================================================
   Service Worker — Programme Alex
   ------------------------------------------------------------
   ⚠️  INCRÉMENTE CACHE_VERSION À CHAQUE DÉPLOIEMENT
       (alex-v1 → alex-v2 → alex-v3 …).
   Changer ce numéro modifie les octets de ce fichier : le
   navigateur détecte un nouveau Service Worker, le met « en
   attente » (waiting), et la page affiche le bandeau
   « mise à jour disponible ».
   ------------------------------------------------------------
   Scope limité à programme-Alex.html : le programme de Sarah
   n'est JAMAIS contrôlé par ce worker. Les appels Supabase /
   CDN passent directement au réseau : la synchro est intacte.
   ============================================================ */

const CACHE_VERSION = 'alex-v6';
const PAGE = 'programme-Alex.html';

// --- Installation : on précharge la page, sans forcer l'activation ---
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
      keys.filter(k => k !== CACHE_VERSION && k.startsWith('alex-'))
          .map(k => caches.delete(k))
    );
  })());
});

// --- Le bandeau « Actualiser » envoie ce message → on saute l'attente ---
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// --- Stratégie réseau-d'abord pour la page Alex uniquement ---
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Ne gère QUE la navigation same-origin vers la page Alex.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.endsWith(PAGE)) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      const cache = await caches.open(CACHE_VERSION);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      const cached = await caches.match(req) || await caches.match('./' + PAGE);
      return cached || Response.error();
    }
  })());
});

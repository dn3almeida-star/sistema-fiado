const CACHE_NAME = 'crediario-digital-v3'
const ASSETS_PARA_CACHE = [
  '/',
  '/index.html',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_PARA_CACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  // Navegação (HTML), manifest e a raiz '/': sempre busca a versão mais recente
  // na rede primeiro, pra não prender o usuário num bundle/manifest antigo após
  // um deploy. A raiz também cobre a checagem de nova versão feita pelo app
  // (fetch('/') programático, que não tem mode:'navigate').
  const url = new URL(event.request.url)
  if (event.request.mode === 'navigate' || url.pathname === '/manifest.json' || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
    })
  )
})

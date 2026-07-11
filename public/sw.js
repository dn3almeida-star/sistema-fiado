const CACHE_NAME = 'crediario-digital-v4'
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

// Notificação push: o cron diário manda { titulo, corpo, url }. Mostra a
// notificação; o toque abre (ou foca) o app na tela indicada.
self.addEventListener('push', event => {
  let dados = {}
  try { dados = event.data ? event.data.json() : {} } catch { dados = {} }
  const titulo = dados.titulo || 'Crediário Digital'
  const opcoes = {
    body: dados.corpo || 'Você tem cobranças pra fazer hoje.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: dados.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(titulo, opcoes))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const destino = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) { client.focus(); client.postMessage({ tipo: 'navegar', url: destino }); return }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino)
    })
  )
})

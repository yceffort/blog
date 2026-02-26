self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const {title = '새 글이 발행되었습니다', body = '', url = '/'} = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon/web-app-manifest-192x192.png',
      data: {url},
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(clients.openWindow(url))
})

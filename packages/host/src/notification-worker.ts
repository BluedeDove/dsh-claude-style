/** Dedicated notification worker: no fetch interception, caching or periodic work. */
export const NOTIFICATION_WORKER_SOURCE = String.raw`
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('notificationclick', event => {
  const sessionId = event.notification.data?.sessionId;
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const target = windows.find(client => new URL(client.url).origin === self.location.origin && new URL(client.url).pathname === '/');
    if (target) {
      if (typeof sessionId === 'string') target.postMessage({type: 'dsh-claude-notification-open', sessionId});
      await target.focus();
    } else await self.clients.openWindow('/');
  })());
});
`

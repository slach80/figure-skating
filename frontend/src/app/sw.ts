/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

self.addEventListener('push', (event: PushEvent) => {
  const raw: unknown = event.data?.json() ?? {}
  const data = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const title = typeof data['title'] === 'string' ? data['title'] : 'Line Creek FSC'
  const body = typeof data['body'] === 'string' ? data['body'] : undefined
  const url = typeof data['url'] === 'string' ? data['url'] : '/'
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const notifData =
    typeof event.notification.data === 'object' && event.notification.data !== null
      ? (event.notification.data as Record<string, unknown>)
      : {}
  const url = typeof notifData['url'] === 'string' ? notifData['url'] : '/'
  event.waitUntil(self.clients.openWindow(url))
})

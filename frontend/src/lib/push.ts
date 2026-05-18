import api from './api'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function subscriptionToPayload(sub: PushSubscription): {
  endpoint: string
  p256dh: string
  auth: string
} {
  const json = sub.toJSON()
  const keys = json.keys ?? {}
  return {
    endpoint: sub.endpoint,
    p256dh: keys['p256dh'] ?? '',
    auth: keys['auth'] ?? '',
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push not supported in this browser')
    return null
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — push notifications disabled')
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return null
  }

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    // Re-register with backend to ensure the subscription is stored
    await api.post('/api/v1/notifications/push/subscribe/', subscriptionToPayload(existing))
    return existing
  }

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
  })

  await api.post('/api/v1/notifications/push/subscribe/', subscriptionToPayload(subscription))
  return subscription
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  const reg = await navigator.serviceWorker.ready
  const subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    return false
  }

  const endpoint = subscription.endpoint

  try {
    await api.delete('/api/v1/notifications/push/unsubscribe/', {
      data: { endpoint },
    })
  } catch {
    // Backend removal is best-effort — still unsubscribe locally
  }

  await subscription.unsubscribe()
  return true
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

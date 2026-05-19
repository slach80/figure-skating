'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { subscribeToPush, unsubscribeFromPush, getPushSubscription } from '@/lib/push'

type SubscriptionState = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export default function NotificationsPage() {
  const [state, setState] = useState<SubscriptionState>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    getPushSubscription().then((sub) => {
      setState(sub ? 'subscribed' : 'unsubscribed')
    }).catch(() => {
      setState('unsubscribed')
    })
  }, [])

  async function handleEnable() {
    setBusy(true)
    setError(null)
    try {
      const sub = await subscribeToPush()
      if (sub) {
        setState('subscribed')
      } else if (Notification.permission === 'denied') {
        setState('denied')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enable notifications.'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    setError(null)
    try {
      await unsubscribeFromPush()
      setState('unsubscribed')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to disable notifications.'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
        <p className="text-sm text-slate-500 mt-1">
          Receive push notifications for lessons, renewals, and club announcements.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        {state === 'loading' && (
          <p className="text-sm text-slate-500">Checking notification status…</p>
        )}

        {state === 'unsupported' && (
          <div className="flex items-start gap-3">
            <BellOff size={20} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Not supported</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Your browser does not support push notifications. Try Chrome or Safari on iOS 16.4+.
              </p>
            </div>
          </div>
        )}

        {state === 'denied' && (
          <div className="flex items-start gap-3">
            <BellOff size={20} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Permission blocked</p>
              <p className="text-xs text-slate-500 mt-0.5">
                You have blocked notifications for this site. To enable them, update your browser
                site settings and reload the page.
              </p>
            </div>
          </div>
        )}

        {state === 'subscribed' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Bell size={20} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Push notifications enabled</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  You will receive alerts for upcoming lessons, membership renewals, and club news.
                </p>
              </div>
            </div>
            <button
              onClick={handleDisable}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:dark:bg-slate-900 transition-colors disabled:opacity-50"
            >
              <BellOff size={15} />
              {busy ? 'Disabling…' : 'Disable push notifications'}
            </button>
          </div>
        )}

        {state === 'unsubscribed' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <BellOff size={20} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Push notifications off</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enable to get timely alerts for lessons, renewals, and announcements.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnable}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Bell size={15} />
              {busy ? 'Enabling…' : 'Enable push notifications'}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}

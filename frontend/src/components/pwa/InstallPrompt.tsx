'use client'
import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredPrompt || dismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto bg-slate-900 text-white rounded-2xl p-4 shadow-xl z-50 flex items-center gap-3">
      <span className="text-2xl">⛸</span>
      <div className="flex-1">
        <p className="font-semibold text-sm">Install Member Portal</p>
        <p className="text-xs text-slate-400">Add to your home screen for quick access</p>
      </div>
      <button
        onClick={async () => {
          await deferredPrompt.prompt()
          const { outcome } = await deferredPrompt.userChoice
          if (outcome === 'accepted') setDeferredPrompt(null)
          else setDismissed(true)
        }}
        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
      >
        <Download size={14} /> Install
      </button>
      <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
    </div>
  )
}

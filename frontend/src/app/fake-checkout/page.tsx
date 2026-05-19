'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, ShieldCheck, Loader2, XCircle } from 'lucide-react'
import api from '@/lib/api'

interface CheckoutDetails {
  payment_id: string
  amount: string
  currency: string
  description: string
  status: string
  skaters: string[]
}

function FakeCheckoutInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('payment_id')

  const [details, setDetails] = useState<CheckoutDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!paymentId) { setError('Missing payment ID'); setLoading(false); return }
    api.get(`/api/v1/payments/fake-checkout/${paymentId}/`)
      .then(r => setDetails(r.data))
      .catch(() => setError('Could not load payment details.'))
      .finally(() => setLoading(false))
  }, [paymentId])

  async function handleAction(action: 'pay' | 'cancel') {
    setProcessing(true)
    try {
      await api.post('/api/v1/payments/fake-checkout/complete/', { payment_id: paymentId, action })
      if (action === 'pay') {
        router.push(`/register/success?session_id=fake_${paymentId}`)
      } else {
        router.push('/register/cancel')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setProcessing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-400" size={32} />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
        <XCircle className="mx-auto mb-4 text-red-400" size={40} />
        <p className="text-white font-semibold">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 rounded-full p-2">
            <CreditCard className="text-amber-400" size={22} />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Test Checkout</p>
            <p className="text-amber-400 text-xs font-medium">Demo mode — no real payment</p>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-slate-900/60 rounded-xl p-4 space-y-3">
          <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Order Summary</p>
          <p className="text-slate-200 text-sm">{details?.description}</p>
          {details?.skaters && details.skaters.length > 0 && (
            <ul className="space-y-1">
              {details.skaters.map(name => (
                <li key={name} className="text-slate-400 text-sm flex items-center gap-2">
                  <span className="text-slate-600">—</span> {name}
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
            <span className="text-slate-400 text-sm">Total</span>
            <span className="text-white font-bold text-xl">
              ${details?.amount} <span className="text-slate-400 text-sm font-normal">{details?.currency}</span>
            </span>
          </div>
        </div>

        {/* Fake card display */}
        <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 flex items-center gap-3">
          <ShieldCheck className="text-green-400 flex-shrink-0" size={20} />
          <div>
            <p className="text-slate-300 text-sm font-medium">Test card: 4242 4242 4242 4242</p>
            <p className="text-slate-500 text-xs">Any expiry / CVV accepted in demo mode</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => handleAction('cancel')}
            disabled={processing}
            className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleAction('pay')}
            disabled={processing}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {processing && <Loader2 size={15} className="animate-spin" />}
            {processing ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FakeCheckoutPage() {
  return (
    <Suspense>
      <FakeCheckoutInner />
    </Suspense>
  )
}

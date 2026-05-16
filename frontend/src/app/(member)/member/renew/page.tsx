'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import { useMembershipTypes } from '@/hooks/useRegistration'
import { useRenewSkater } from '@/hooks/useRenewal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'

export default function MemberRenewPage() {
  const { data: skater, isLoading: skaterLoading, error: skaterError } = useMemberProfile()
  const { data: membershipTypes, isLoading: mtLoading } = useMembershipTypes()
  const renewMutation = useRenewSkater(skater?.id ?? '')

  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [apiError, setApiError] = useState('')

  async function handleRenew() {
    if (!selectedTypeId || !skater) return
    setApiError('')
    try {
      const result = await renewMutation.mutateAsync(selectedTypeId)
      window.location.href = result.checkout_url
    } catch {
      setApiError('Renewal failed. Please try again.')
    }
  }

  if (skaterLoading || mtLoading) return (
    <div className="flex justify-center py-20"><LoadingSpinner /></div>
  )
  if (skaterError) return <ErrorAlert message="Failed to load your profile." />
  if (!skater) return null

  const selectedType = membershipTypes?.find(t => t.id === selectedTypeId)

  return (
    <div className="space-y-6">
      <Link
        href="/member"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to my profile
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Renew Membership</h1>
        <p className="text-slate-500 text-sm mt-1">Choose a membership type to continue</p>
      </div>

      <div className="space-y-3">
        {membershipTypes?.map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedTypeId(type.id)}
            className={`w-full text-left rounded-xl border p-5 transition-all ${
              selectedTypeId === type.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{type.name}</p>
                {type.usfs_category && (
                  <p className="text-xs text-slate-400 mt-0.5">USFS Category: {type.usfs_category}</p>
                )}
              </div>
              <p className="text-xl font-bold text-slate-900">
                ${parseFloat(type.price_in_club).toFixed(2)}
              </p>
            </div>
          </button>
        ))}

        {!membershipTypes?.length && (
          <p className="text-slate-500 text-sm text-center py-8">No membership types available. Contact your club.</p>
        )}
      </div>

      {apiError && <ErrorAlert message={apiError} />}

      {selectedType && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{selectedType.name}</span>
            <span className="font-bold text-slate-900">${parseFloat(selectedType.price_in_club).toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400">
            Secure payment via Stripe. Membership activates automatically after payment.
          </p>
          <button
            onClick={handleRenew}
            disabled={renewMutation.isPending || !skater.id}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} />
            {renewMutation.isPending ? 'Processing…' : `Pay $${parseFloat(selectedType.price_in_club).toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  )
}

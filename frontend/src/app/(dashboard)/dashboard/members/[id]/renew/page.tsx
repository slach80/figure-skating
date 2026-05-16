'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useSkater } from '@/hooks/useSkaters'
import { useMembershipTypes } from '@/hooks/useRegistration'
import { useRenewSkater } from '@/hooks/useRenewal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function RenewPage() {
  const { id } = useParams<{ id: string }>()
  const { data: skater, isLoading: skaterLoading, error: skaterError } = useSkater(id)
  const { data: membershipTypes, isLoading: mtLoading } = useMembershipTypes()
  const renewMutation = useRenewSkater(id)

  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [apiError, setApiError] = useState('')

  async function handleRenew() {
    if (!selectedTypeId) return
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
  if (skaterError) return <ErrorAlert message="Failed to load skater." />
  if (!skater) return null

  const selectedType = membershipTypes?.find(t => t.id === selectedTypeId)

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/members/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to profile
        </Link>
      </div>

      <div>
        <h1>Renew Membership</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Renewing for <strong>{skater.first_name} {skater.last_name}</strong>
        </p>
      </div>

      {/* Current membership status */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Current Membership</h2>
        <div className="flex items-center gap-3">
          <StatusBadge status={skater.membership_status} />
          {skater.membership_type_display && (
            <span className="text-sm text-slate-600">{skater.membership_type_display.name}</span>
          )}
        </div>
        {skater.membership_expiry && (
          <p className="text-sm text-slate-500">
            Expires: {new Date(skater.membership_expiry).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Membership type selection */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Select Membership Type</h2>
        {membershipTypes?.length === 0 ? (
          <p className="text-sm text-slate-500">No active membership types. Configure them in Settings.</p>
        ) : (
          <div className="space-y-2">
            {membershipTypes?.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedTypeId(type.id)}
                className={`w-full text-left rounded-lg border p-4 transition-colors ${
                  selectedTypeId === type.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{type.name}</p>
                    {type.usfs_category && (
                      <p className="text-xs text-slate-500 mt-0.5">USFS: {type.usfs_category}</p>
                    )}
                  </div>
                  <p className="text-base font-bold text-slate-900">
                    ${parseFloat(type.price_in_club).toFixed(2)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {apiError && <ErrorAlert message={apiError} />}

      {/* Summary + pay */}
      {selectedType && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Order Summary</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{selectedType.name} — {skater.first_name} {skater.last_name}</span>
            <span className="font-bold text-slate-900">${parseFloat(selectedType.price_in_club).toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400">
            You will be redirected to Stripe to complete payment. Membership activates automatically on success.
          </p>
          <button
            onClick={handleRenew}
            disabled={renewMutation.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} />
            {renewMutation.isPending ? 'Processing…' : `Renew for $${parseFloat(selectedType.price_in_club).toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  )
}

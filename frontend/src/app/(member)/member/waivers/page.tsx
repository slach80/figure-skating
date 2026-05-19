'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { FileCheck, FileText, AlertCircle, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import type { WaiverStatus } from '@/types/waiver'
import type { SkaterList, PaginatedResponse } from '@/types/skater'

function useWaiverStatus(skaterId: string | undefined) {
  return useQuery({
    queryKey: ['waiver-status', skaterId],
    queryFn: async () => {
      const res = await api.get<WaiverStatus[]>('/api/v1/waivers/status/', {
        params: { skater: skaterId },
      })
      return res.data
    },
    enabled: !!skaterId,
    staleTime: 2 * 60 * 1000,
  })
}

function SkaterWaiverSection({ skater }: { skater: SkaterList }) {
  const { data: statuses = [], isLoading } = useWaiverStatus(skater.id)

  const unsignedCount = statuses.filter(s => !s.signed).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {skater.first_name} {skater.last_name}
          </p>
          {skater.is_minor && (
            <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 px-1.5 py-0.5 rounded font-medium">
              Minor
            </span>
          )}
        </div>
        {!isLoading && unsignedCount > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
            {unsignedCount} unsigned
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : statuses.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-center">
          <p className="text-sm text-slate-500">No waivers required at this time.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          {statuses.map(status => (
            <div key={status.template_id} className="flex items-center gap-3 px-4 py-3.5">
              {status.signed ? (
                <FileCheck size={18} className="text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-amber-500 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{status.title}</p>
                {status.signed && status.signed_at ? (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Signed{' '}
                    {new Date(status.signed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-0.5">Signature required</p>
                )}
              </div>

              {status.signed ? (
                <span className="shrink-0 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                  Signed
                </span>
              ) : (
                <Link
                  href={`/member/waivers/${status.template_id}?skater=${skater.id}`}
                  className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Sign
                  <ChevronRight size={14} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WaiversPage() {
  const { data: ownSkater, isLoading: ownLoading } = useMemberProfile()

  // We need the user's own ID to find managed skaters.
  // The skater profile doesn't carry the user ID directly; we use `managed_by` logic from the API.
  // Instead, fetch skaters where signed_by user is the current user via the member list endpoint.
  // Since we know the user manages skaters with managed_by = user, we query the member endpoint
  // with the skater's user relationship. The simplest approach: fetch all skaters and filter
  // client-side using managed_by_email vs own profile.
  const { data: allSkaters = [], isLoading: skatersLoading } = useQuery({
    queryKey: ['all-my-skaters'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<SkaterList>>('/api/v1/members/')
      return res.data.results
    },
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = ownLoading || skatersLoading

  // Build list of skaters to show waivers for:
  // 1. Own skater profile (if any)
  // 2. Any skaters in the list that the API returns for this user (managed_by relationship
  //    is enforced server-side; the member list for a regular member returns only their own
  //    skater and managed skaters)
  const skaterIds = new Set<string>()
  const skatersToShow: SkaterList[] = []

  if (ownSkater) {
    skaterIds.add(ownSkater.id)
    skatersToShow.push({
      id: ownSkater.id,
      first_name: ownSkater.first_name,
      last_name: ownSkater.last_name,
      usfs_number: ownSkater.usfs_number,
      membership_status: ownSkater.membership_status,
      membership_expiry: ownSkater.membership_expiry,
      is_minor: ownSkater.is_minor,
    })
  }

  for (const s of allSkaters) {
    if (!skaterIds.has(s.id)) {
      skaterIds.add(s.id)
      skatersToShow.push(s)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Waivers</h1>
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-slate-600 dark:text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Waivers</h1>
      </div>

      <p className="text-sm text-slate-500 -mt-2">
        Club waivers must be signed each season. Guardians must sign on behalf of skaters under 13.
      </p>

      {skatersToShow.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <FileText className="mx-auto text-slate-300 mb-3" size={36} />
          <p className="font-medium text-slate-700 dark:text-slate-300">No skater profiles found</p>
          <p className="text-sm text-slate-400 mt-1">
            Contact your club administrator to link your skater profile.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {skatersToShow.map(skater => (
            <SkaterWaiverSection key={skater.id} skater={skater} />
          ))}
        </div>
      )}
    </div>
  )
}

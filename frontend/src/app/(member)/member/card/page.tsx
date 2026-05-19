'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import type { PaginatedResponse, SkaterList } from '@/types/skater'
import { CreditCard } from 'lucide-react'
import Link from 'next/link'

function useManagedSkaters(familyGroupId: string | null) {
  return useQuery({
    queryKey: ['managed-skaters', familyGroupId],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<SkaterList>>('/api/v1/members/', {
        params: { family_group: familyGroupId },
      })
      return res.data.results
    },
    enabled: !!familyGroupId,
    staleTime: 5 * 60 * 1000,
  })
}

export default function MemberCardPage() {
  const router = useRouter()
  const { data: skater, isLoading: skaterLoading, error: skaterError } = useMemberProfile()
  const { data: familySkaters, isLoading: familyLoading } = useManagedSkaters(
    skater?.family_group ?? null
  )

  // Collect all skaters this user can view cards for:
  // own skater + family members (if family group exists)
  const allSkaters: SkaterList[] = (() => {
    if (!skater) return []
    const own: SkaterList = {
      id: skater.id,
      first_name: skater.first_name,
      last_name: skater.last_name,
      usfs_number: skater.usfs_number,
      membership_status: skater.membership_status,
      membership_expiry: skater.membership_expiry,
      is_minor: skater.is_minor,
    }
    const others = (familySkaters ?? []).filter(s => s.id !== skater.id)
    return [own, ...others]
  })()

  // Auto-redirect when there is exactly one skater
  useEffect(() => {
    if (!skaterLoading && !familyLoading && allSkaters.length === 1) {
      router.replace(`/member/card/${allSkaters[0].id}`)
    }
  }, [skaterLoading, familyLoading, allSkaters, router])

  if (skaterLoading || familyLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (skaterError) {
    return <ErrorAlert message="Failed to load your profile." />
  }

  if (!skater) return null

  // Single skater — redirect already fired above; show spinner while navigating
  if (allSkaters.length === 1) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Membership Cards</h1>
        <p className="text-slate-500 text-sm mt-1">Select a skater to view their card</p>
      </div>

      <div className="space-y-3">
        {allSkaters.map(s => (
          <Link
            key={s.id}
            href={`/member/card/${s.id}`}
            className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
              <CreditCard size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {s.first_name} {s.last_name}
              </p>
              {s.usfs_number && (
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  USFS #{s.usfs_number}
                </p>
              )}
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                s.membership_status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : s.membership_status === 'expired'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {s.membership_status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

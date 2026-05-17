'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SkaterList } from '@/types/skater'
import type { PaginatedResponse } from '@/types/skater'

function useFamilyMembers(familyGroupId: string | null) {
  return useQuery({
    queryKey: ['family-members', familyGroupId],
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

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-700',
  suspended: 'bg-slate-100 text-slate-500',
}

export default function MemberFamilyPage() {
  const { data: skater, isLoading: skaterLoading } = useMemberProfile()
  const { data: familyMembers = [], isLoading: familyLoading } = useFamilyMembers(skater?.family_group ?? null)

  const isLoading = skaterLoading || familyLoading

  // Filter to show only other family members (not the current skater)
  const others = familyMembers.filter(m => m.id !== skater?.id)

  if (isLoading) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-slate-900">Family Members</h1>
        <div className="space-y-3">
          {[1,2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Family Members</h1>

      {/* Current user's card */}
      {skater && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your account</p>
          <div className="bg-white rounded-xl border-2 border-primary/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{skater.first_name} {skater.last_name}</p>
                {skater.usfs_number && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">USFS# {skater.usfs_number}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[skater.membership_status] ?? ''}`}>
                {skater.membership_status}
              </span>
            </div>
            {skater.membership_expiry && (
              <p className="text-xs text-slate-400 mt-2">
                Expires {new Date(skater.membership_expiry + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* No family group */}
      {!skater?.family_group && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Users className="mx-auto text-slate-300 mb-3" size={36} />
          <p className="font-medium text-slate-700">No family group linked</p>
          <p className="text-sm text-slate-400 mt-1">Contact your club administrator to link family members.</p>
        </div>
      )}

      {/* Family members */}
      {skater?.family_group && others.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500 text-sm">No other family members linked yet.</p>
          <p className="text-xs text-slate-400 mt-1">Ask your club administrator to add additional skaters to your family group.</p>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Family members ({others.length})</p>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {others.map(member => (
              <div key={member.id} className="flex items-center justify-between px-4 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{member.first_name} {member.last_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {member.usfs_number && (
                      <span className="text-xs text-slate-400 font-mono">USFS# {member.usfs_number}</span>
                    )}
                    {member.is_minor && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Minor</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[member.membership_status] ?? ''}`}>
                    {member.membership_status}
                  </span>
                  {member.membership_status === 'expired' && (
                    <Link
                      href={`/dashboard/members/${member.id}/renew`}
                      className="text-xs text-primary hover:underline"
                    >
                      Renew
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
        <p className="font-medium text-slate-600 mb-1">Managing family memberships</p>
        <p>Family membership renewals are handled by the account holder. Contact your club administrator to add or remove family members.</p>
      </div>
    </div>
  )
}

'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { MembershipCardData } from '@/types/skater'

export function useMembershipCard(skaterId: string) {
  return useQuery({
    queryKey: ['membership-card', skaterId],
    queryFn: async () => {
      const res = await api.get<MembershipCardData>(`/api/v1/members/card/${skaterId}/`)
      return res.data
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!skaterId,
  })
}

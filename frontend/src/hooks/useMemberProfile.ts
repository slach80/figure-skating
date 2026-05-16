'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SkaterDetail } from '@/types/skater'

export function useMemberProfile() {
  return useQuery({
    queryKey: ['member-profile'],
    queryFn: async () => {
      const res = await api.get<SkaterDetail>('/api/v1/members/me/')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

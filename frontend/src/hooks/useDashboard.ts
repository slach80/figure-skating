'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface DashboardStats {
  active_members: number
  pending_renewals: number
  expiring_soon: number
  total_members: number
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/api/v1/members/stats/')
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

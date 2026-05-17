'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SkaterStatsProfile } from '@/types/skater-stats'

export function useSkaterStats(skaterId: string, enabled = true) {
  return useQuery({
    queryKey: ['skater-stats', skaterId],
    queryFn: async () => {
      const res = await api.get<SkaterStatsProfile>(`/api/v1/members/${skaterId}/skater-stats/`)
      return res.data
    },
    enabled: enabled && !!skaterId,
    staleTime: 24 * 60 * 60 * 1000, // 24h — matches Redis TTL
    retry: false, // Don't retry 404 (no slug) or 503 (API down)
  })
}

export function useSetSkaterStatsSlug(skaterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await api.patch<{ slug: string }>(
        `/api/v1/members/${skaterId}/set-skater-stats-slug/`,
        { slug },
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skater-stats', skaterId] })
      qc.invalidateQueries({ queryKey: ['skater', skaterId] })
    },
  })
}

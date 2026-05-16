'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { SkaterList, SkaterDetail, PaginatedResponse } from '@/types/skater'
import { CompetitionHistoryItem, SkaterStatsProfile } from '@/types/competition'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

export function useSkaters(page: number = 1, search: string = '') {
  return useQuery({
    queryKey: ['skaters', page, search],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<SkaterList>>('/api/v1/members/', {
        params: { page, ...(search ? { search } : {}) },
      })
      return response.data
    },
    staleTime: STALE_TIME,
  })
}

export function useSkater(id: string) {
  return useQuery({
    queryKey: ['skater', id],
    queryFn: async () => {
      const response = await api.get<SkaterDetail>(`/api/v1/members/${id}/`)
      return response.data
    },
    staleTime: STALE_TIME,
    enabled: !!id,
  })
}

export function useSkaterCompetitionHistory(id: string) {
  return useQuery({
    queryKey: ['skater-competition-history', id],
    queryFn: async () => {
      const response = await api.get<{
        history: CompetitionHistoryItem[]
        profile: SkaterStatsProfile
      }>(`/api/v1/members/${id}/competition-history/`)
      return response.data
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!id,
  })
}

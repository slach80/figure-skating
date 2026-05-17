'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SkaterLevel, CoachEvaluation } from '@/types/scheduling'
import type { PaginatedResponse } from '@/types/skater'

// ── Skater Levels ─────────────────────────────────────────────────────────────

export function useSkaterLevels(skaterId: string) {
  return useQuery({
    queryKey: ['skater-levels', skaterId],
    queryFn: async () => {
      const res = await api.get<SkaterLevel[]>(`/api/v1/members/${skaterId}/levels/`)
      return res.data
    },
    enabled: !!skaterId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpsertSkaterLevel(skaterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<SkaterLevel>) => {
      const res = await api.post<SkaterLevel>(`/api/v1/members/${skaterId}/levels/`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skater-levels', skaterId] }),
  })
}

// ── Coach Evaluations ─────────────────────────────────────────────────────────

export function useEvaluations(params: { skater?: string; coach?: string } = {}) {
  return useQuery({
    queryKey: ['evaluations', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<CoachEvaluation>>(
        '/api/v1/scheduling/evaluations/',
        { params },
      )
      return res.data.results
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateEvaluation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<CoachEvaluation>) => {
      const res = await api.post<CoachEvaluation>('/api/v1/scheduling/evaluations/', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }),
  })
}

export function useUpdateEvaluation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CoachEvaluation> & { id: string }) => {
      const res = await api.patch<CoachEvaluation>(`/api/v1/scheduling/evaluations/${id}/`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }),
  })
}

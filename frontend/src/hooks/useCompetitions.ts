'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Competition, EventCategory, CompetitionEntry } from '@/types/competition'
import type { PaginatedResponse } from '@/types/skater'

// ── Competitions ──────────────────────────────────────────────────────────────

export function useCompetitions(params: { is_published?: boolean } = {}) {
  return useQuery({
    queryKey: ['competitions', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Competition>>('/api/v1/competitions/competitions/', { params })
      return res.data.results
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCompetition(id: string) {
  return useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const res = await api.get<Competition>(`/api/v1/competitions/competitions/${id}/`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateCompetition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Competition>) => {
      const res = await api.post<Competition>('/api/v1/competitions/competitions/', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competitions'] }),
  })
}

export function useUpdateCompetition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Competition> & { id: string }) => {
      const res = await api.patch<Competition>(`/api/v1/competitions/competitions/${id}/`, data)
      return res.data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['competitions'] })
      qc.invalidateQueries({ queryKey: ['competition', vars.id] })
    },
  })
}

export function usePublishCompetition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<Competition>(`/api/v1/competitions/competitions/${id}/publish/`)
      return res.data
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['competitions'] })
      qc.invalidateQueries({ queryKey: ['competition', id] })
    },
  })
}

// ── Event Categories ──────────────────────────────────────────────────────────

export function useEventCategories(competitionId: string) {
  return useQuery({
    queryKey: ['event-categories', competitionId],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<EventCategory>>('/api/v1/competitions/categories/', {
        params: { competition: competitionId },
      })
      return res.data.results
    },
    enabled: !!competitionId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateEventCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<EventCategory>) => {
      const res = await api.post<EventCategory>('/api/v1/competitions/categories/', data)
      return res.data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['event-categories', vars.competition] })
      qc.invalidateQueries({ queryKey: ['competitions'] })
    },
  })
}

export function useUpdateEventCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<EventCategory> & { id: string }) => {
      const res = await api.patch<EventCategory>(`/api/v1/competitions/categories/${id}/`, data)
      return res.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['event-categories', data.competition] })
    },
  })
}

export function useDeleteEventCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, competitionId }: { id: string; competitionId: string }) => {
      await api.delete(`/api/v1/competitions/categories/${id}/`)
      return { competitionId }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['event-categories', vars.competitionId] })
      qc.invalidateQueries({ queryKey: ['competitions'] })
    },
  })
}

// ── Competition Entries ───────────────────────────────────────────────────────

export function useCompetitionEntries(params: { competition?: string; skater?: string; status?: string }) {
  return useQuery({
    queryKey: ['competition-entries', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<CompetitionEntry>>('/api/v1/competitions/entries/', { params })
      return res.data.results
    },
    enabled: !!(params.competition || params.skater),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      competition: string
      category: string
      skater: string
      coach?: string
      music_title?: string
      music_artist?: string
    }) => {
      const res = await api.post<CompetitionEntry>('/api/v1/competitions/entries/', data)
      return res.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['competition-entries', { competition: data.competition }] })
      qc.invalidateQueries({ queryKey: ['competition-entries', { skater: data.skater }] })
      qc.invalidateQueries({ queryKey: ['competitions'] })
    },
  })
}

export function useScratchEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<CompetitionEntry>(`/api/v1/competitions/entries/${id}/scratch/`)
      return res.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['competition-entries', { competition: data.competition }] })
    },
  })
}

export function useAcceptEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<CompetitionEntry>(`/api/v1/competitions/entries/${id}/accept/`)
      return res.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['competition-entries', { competition: data.competition }] })
    },
  })
}

export function useSetEntryDraw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, draw_number, skating_order }: { id: string; draw_number?: number; skating_order?: number }) => {
      const res = await api.post<CompetitionEntry>(`/api/v1/competitions/entries/${id}/set-draw/`, {
        draw_number,
        skating_order,
      })
      return res.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['competition-entries', { competition: data.competition }] })
    },
  })
}

export function useRecordEntryResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      placement,
      score,
      result_notes,
    }: {
      id: string
      placement?: number
      score?: string
      result_notes?: string
    }) => {
      const res = await api.post<CompetitionEntry>(`/api/v1/competitions/entries/${id}/record-result/`, {
        placement,
        score,
        result_notes,
      })
      return res.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['competition-entries', { competition: data.competition }] })
    },
  })
}

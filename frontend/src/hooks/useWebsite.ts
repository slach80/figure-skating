'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import axios from 'axios'
import type { SiteConfig, Announcement, PublicCoach } from '@/types/website'
import type { PaginatedResponse } from '@/types/skater'

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Public (no auth) ──────────────────────────────────────────────────────────

export function useSiteConfig() {
  return useQuery({
    queryKey: ['site-config'],
    queryFn: async () => {
      const res = await axios.get<SiteConfig>(`${PUBLIC_API}/api/v1/website/config/`)
      return res.data
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function usePublicAnnouncements() {
  return useQuery({
    queryKey: ['public-announcements'],
    queryFn: async () => {
      const res = await axios.get<PaginatedResponse<Announcement>>(
        `${PUBLIC_API}/api/v1/website/announcements/`,
      )
      return res.data.results
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function usePublicCoaches() {
  return useQuery({
    queryKey: ['public-coaches'],
    queryFn: async () => {
      const res = await axios.get<PaginatedResponse<PublicCoach>>(
        `${PUBLIC_API}/api/v1/website/coaches/`,
      )
      return res.data.results
    },
    staleTime: 10 * 60 * 1000,
  })
}

// ── Admin (authenticated) ─────────────────────────────────────────────────────

export function useAdminSiteConfig() {
  return useQuery({
    queryKey: ['admin-site-config'],
    queryFn: async () => {
      const res = await api.get<SiteConfig>('/api/v1/website/admin/config/')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateSiteConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<SiteConfig>) => {
      const res = await api.patch<SiteConfig>('/api/v1/website/admin/config/', data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-site-config'] })
      qc.invalidateQueries({ queryKey: ['site-config'] })
    },
  })
}

export function useAdminAnnouncements() {
  return useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Announcement>>(
        '/api/v1/website/admin/announcements/',
      )
      return res.data.results
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Announcement>) => {
      const res = await api.post<Announcement>('/api/v1/website/admin/announcements/', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-announcements'] }),
  })
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Announcement> & { id: string }) => {
      const res = await api.patch<Announcement>(`/api/v1/website/admin/announcements/${id}/`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-announcements'] }),
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/website/admin/announcements/${id}/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-announcements'] }),
  })
}

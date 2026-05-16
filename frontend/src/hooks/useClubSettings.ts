'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface ClubProfile {
  id: string
  name: string
  slug: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  website_url: string
  primary_color: string
  accent_color: string
  current_season_start: string | null
  current_season_end: string | null
  season_label: string
  stripe_onboarding_complete: boolean
  payments_enabled: boolean
}

export interface MembershipTypeSetting {
  id: string
  name: string
  usfs_category: string
  price_in_club: string
  price_out_of_club: string
  is_family_plan: boolean
  is_active: boolean
  sort_order: number
}

export function useClubProfile() {
  return useQuery({
    queryKey: ['club-profile'],
    queryFn: async () => {
      const res = await api.get<ClubProfile>('/api/v1/clubs/me/')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateClubProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<ClubProfile>) => {
      const res = await api.patch<ClubProfile>('/api/v1/clubs/me/', data)
      return res.data
    },
    onSuccess: (data) => {
      qc.setQueryData(['club-profile'], data)
    },
  })
}

export function useClubMembershipTypes() {
  return useQuery({
    queryKey: ['club-membership-types'],
    queryFn: async () => {
      const res = await api.get<MembershipTypeSetting[]>('/api/v1/clubs/me/membership-types/')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateMembershipType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<MembershipTypeSetting, 'id'>) => {
      const res = await api.post<MembershipTypeSetting>('/api/v1/clubs/me/membership-types/', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-membership-types'] }),
  })
}

export function useUpdateMembershipType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MembershipTypeSetting> & { id: string }) => {
      const res = await api.patch<MembershipTypeSetting>(`/api/v1/clubs/me/membership-types/${id}/`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-membership-types'] }),
  })
}

export function useDeleteMembershipType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/clubs/me/membership-types/${id}/`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-membership-types'] })
      qc.invalidateQueries({ queryKey: ['membership-types'] })
    },
  })
}

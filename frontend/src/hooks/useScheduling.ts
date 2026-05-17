'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Coach, LessonType, AvailabilitySlot, BookingList, BookingDetail, LessonPackage, PurchasedPackage, TestSession, TestRegistration } from '@/types/scheduling'
import type { PaginatedResponse } from '@/types/skater'

// ── Coaches ──────────────────────────────────────────────────────────────────

export function useCoaches() {
  return useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Coach>>('/api/v1/scheduling/coaches/')
      return res.data.results
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ── Lesson Types ──────────────────────────────────────────────────────────────

export function useLessonTypes() {
  return useQuery({
    queryKey: ['lesson-types'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<LessonType>>('/api/v1/scheduling/lesson-types/')
      return res.data.results
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateLessonType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<LessonType>) => {
      const res = await api.post<LessonType>('/api/v1/scheduling/lesson-types/', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-types'] }),
  })
}

export function useUpdateLessonType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<LessonType> & { id: string }) => {
      const res = await api.patch<LessonType>(`/api/v1/scheduling/lesson-types/${id}/`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-types'] }),
  })
}

// ── Availability Slots ────────────────────────────────────────────────────────

export function useSlots(params: { coach?: string; date_from?: string; date_to?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['slots', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<AvailabilitySlot>>('/api/v1/scheduling/slots/', { params })
      return res.data.results
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<AvailabilitySlot>('/api/v1/scheduling/slots/', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  })
}

export function useCancelSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/v1/scheduling/slots/${id}/cancel/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  })
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export function useBookings(params: { coach?: string; date?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<BookingList>>('/api/v1/scheduling/bookings/', { params })
      return res.data.results
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useTodaysBookings() {
  return useQuery({
    queryKey: ['bookings-today'],
    queryFn: async () => {
      const res = await api.get<BookingList[]>('/api/v1/scheduling/bookings/today/')
      return res.data
    },
    staleTime: 60 * 1000,
  })
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get<BookingDetail>(`/api/v1/scheduling/bookings/${id}/`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<BookingDetail>('/api/v1/scheduling/bookings/', data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['slots'] })
    },
  })
}

export function useConfirmBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/v1/scheduling/bookings/${id}/confirm/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason, notes }: { id: string; reason: string; notes?: string }) => {
      await api.post(`/api/v1/scheduling/bookings/${id}/cancel/`, { reason, notes })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['slots'] })
    },
  })
}

export function useCompleteBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/v1/scheduling/bookings/${id}/complete/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

// ── Lesson Packages ───────────────────────────────────────────────────────────

export function useLessonPackages(params: { lesson_type?: string; active?: boolean } = {}) {
  return useQuery({
    queryKey: ['lesson-packages', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<LessonPackage>>('/api/v1/scheduling/packages/', { params })
      return res.data.results
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateLessonPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<LessonPackage>) => {
      const res = await api.post<LessonPackage>('/api/v1/scheduling/packages/', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-packages'] }),
  })
}

export function useUpdateLessonPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<LessonPackage> & { id: string }) => {
      const res = await api.patch<LessonPackage>(`/api/v1/scheduling/packages/${id}/`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-packages'] }),
  })
}

export function usePurchasedPackages(skaterId?: string) {
  return useQuery({
    queryKey: ['purchased-packages', skaterId ?? 'all'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<PurchasedPackage>>('/api/v1/scheduling/purchased-packages/', {
        params: skaterId ? { skater: skaterId } : {},
      })
      return res.data.results
    },
    staleTime: 2 * 60 * 1000,
  })
}

// ── Test Sessions ─────────────────────────────────────────────────────────────

export function useTestSessions(open?: boolean) {
  return useQuery({
    queryKey: ['test-sessions', { open }],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<TestSession>>('/api/v1/scheduling/test-sessions/', {
        params: open ? { open: '1' } : {},
      })
      return res.data.results
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateTestSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<TestSession>) => {
      const res = await api.post<TestSession>('/api/v1/scheduling/test-sessions/', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-sessions'] }),
  })
}

export function useTestRegistrations(sessionId: string) {
  return useQuery({
    queryKey: ['test-registrations', sessionId],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<TestRegistration>>('/api/v1/scheduling/test-registrations/', {
        params: { session: sessionId },
      })
      return res.data.results
    },
    enabled: !!sessionId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateTestRegistration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<TestRegistration>('/api/v1/scheduling/test-registrations/', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-registrations'] }),
  })
}

export function useRecordTestResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, result, notes }: { id: string; result: string; notes?: string }) => {
      const res = await api.post<TestRegistration>(
        `/api/v1/scheduling/test-registrations/${id}/record-result/`,
        { result, notes },
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-registrations'] }),
  })
}

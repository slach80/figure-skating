'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import type { MembershipType, RegistrationFormData } from '@/types/registration'
import type { PaginatedResponse } from '@/types/skater'

export function useMembershipTypes() {
  return useQuery({
    queryKey: ['membership-types'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<MembershipType>>('/api/v1/members/membership-types/')
      return res.data.results
    },
    staleTime: 10 * 60 * 1000,
  })
}

interface RegistrationResponse {
  skater_id: string
  checkout_url: string
  payment_id: string
}

interface FamilyRegistrationResponse {
  family_group_id: string
  skater_ids: string[]
  checkout_url: string
  payment_id: string
  subtotal_amount: string
  family_discount_amount: string
  promo_discount_amount: string
  total_amount: string
}

export interface DiscountValidationResult {
  valid: boolean
  error?: string
  discount_type?: 'percent' | 'fixed'
  value?: string
  discount_amount?: string
  final_amount?: string
  description?: string
}

function toApiPayload(data: RegistrationFormData) {
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    date_of_birth: data.date_of_birth,
    gender: data.gender || undefined,
    usfs_number: data.usfs_number || undefined,
    is_us_citizen: data.is_us_citizen,
    address_line1: data.address_line1,
    address_line2: data.address_line2 || undefined,
    city: data.city,
    state: data.state,
    zip_code: data.zip_code,
    phone: data.phone || undefined,
    email: data.email || undefined,
    membership_type_id: data.membership_type_id,
    emergency_contact_name: data.emergency_contact_name || undefined,
    emergency_contact_phone: data.emergency_contact_phone || undefined,
    emergency_contact_relation: data.emergency_contact_relation || undefined,
    coppa_consented: data.coppa_consent,
  }
}

export function useRegisterSkater() {
  return useMutation({
    mutationFn: async (data: RegistrationFormData): Promise<RegistrationResponse> => {
      const res = await api.post<RegistrationResponse>('/api/v1/members/register/', toApiPayload(data))
      return res.data
    },
  })
}

export function useRegisterFamily() {
  return useMutation({
    mutationFn: async ({ skaters, discountCode }: { skaters: RegistrationFormData[], discountCode?: string }): Promise<FamilyRegistrationResponse> => {
      const res = await api.post<FamilyRegistrationResponse>('/api/v1/members/register/family/', {
        skaters: skaters.map(toApiPayload),
        discount_code: discountCode || '',
      })
      return res.data
    },
  })
}

export function useValidateDiscount() {
  return useMutation({
    mutationFn: async ({ code, subtotal }: { code: string, subtotal: number }): Promise<DiscountValidationResult> => {
      const res = await api.post<DiscountValidationResult>('/api/v1/members/validate-discount/', { code, subtotal })
      return res.data
    },
  })
}

'use client'

import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'

interface RenewalResponse {
  checkout_url: string
  payment_id: string
}

export function useRenewSkater(skaterId: string) {
  return useMutation({
    mutationFn: async (membershipTypeId: string): Promise<RenewalResponse> => {
      const res = await api.post<RenewalResponse>(`/api/v1/members/${skaterId}/renew/`, {
        membership_type_id: membershipTypeId,
      })
      return res.data
    },
  })
}

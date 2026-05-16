'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { PaginatedPayments } from '@/types/payment'

export function usePayments(page = 1, status = '', paymentType = '') {
  return useQuery({
    queryKey: ['payments', page, status, paymentType],
    queryFn: async () => {
      const res = await api.get<PaginatedPayments>('/api/v1/payments/', {
        params: {
          page,
          ...(status ? { status } : {}),
          ...(paymentType ? { payment_type: paymentType } : {}),
        },
      })
      return res.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export interface Payment {
  id: string
  payment_type: 'membership' | 'lesson' | 'test_session' | 'ice_session'
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded'
  amount: string
  currency: string
  description: string
  stripe_checkout_session_id: string
  created_at: string
  payer_email: string
}

export interface PaginatedPayments {
  results: Payment[]
  next: string | null
  previous: string | null
}

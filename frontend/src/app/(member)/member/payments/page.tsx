'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface Payment {
  id: string
  amount: string
  status: 'pending' | 'paid' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded'
  payment_type: string
  description: string
  created_at: string
  stripe_receipt_url: string | null
}

interface PaginatedResponse<T> {
  results: T[]
}

const STATUS_COLOR: Record<string, string> = {
  succeeded: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  paid: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  failed: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  refunded: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  partially_refunded: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
}

const STATUS_LABEL: Record<string, string> = {
  succeeded: 'Paid',
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Part. Refunded',
}

function useMyPayments() {
  return useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Payment>>('/api/v1/payments/me/')
      return res.data.results
    },
    staleTime: 2 * 60 * 1000,
  })
}

export default function MemberPaymentsPage() {
  const { data: payments = [], isLoading } = useMyPayments()

  const total = payments
    .filter(p => p.status === 'paid' || p.status === 'succeeded')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Payment History</h1>

      {/* Summary card */}
      <div className="bg-gradient-to-br from-primary to-accent rounded-2xl p-5 text-white">
        <p className="text-white/70 text-xs uppercase tracking-wider mb-1">Total paid this season</p>
        <p className="text-4xl font-bold">${total.toFixed(2)}</p>
        <p className="text-white/60 text-xs mt-2">{payments.filter(p => p.status === 'paid' || p.status === 'succeeded').length} payments</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && payments.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <p className="text-slate-500">No payments yet.</p>
        </div>
      )}

      {payments.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {p.description || p.payment_type || 'Payment'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right ml-3">
                <p className="font-bold text-slate-900 dark:text-slate-100">${parseFloat(p.amount).toFixed(2)}</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? STATUS_COLOR.pending}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  {p.stripe_receipt_url && (
                    <a
                      href={p.stripe_receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Receipt
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

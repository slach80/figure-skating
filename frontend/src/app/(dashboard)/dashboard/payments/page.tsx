'use client'

import { useState } from 'react'
import { usePayments } from '@/hooks/usePayments'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react'
import type { Payment } from '@/types/payment'

const STATUS_STYLES: Record<Payment['status'], string> = {
  pending:             'bg-yellow-50 text-yellow-700 border-yellow-200',
  succeeded:           'bg-green-50  text-green-700  border-green-200',
  failed:              'bg-red-50    text-red-700    border-red-200',
  refunded:            'bg-slate-100 text-slate-600  border-slate-300',
  partially_refunded:  'bg-orange-50 text-orange-700 border-orange-200',
}

const TYPE_LABELS: Record<Payment['payment_type'], string> = {
  membership:   'Membership',
  lesson:       'Lesson',
  test_session: 'Test Session',
  ice_session:  'Ice Session',
}

function StatusChip({ status }: { status: Payment['status'] }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

const STATUSES = ['', 'pending', 'succeeded', 'failed', 'refunded']
const TYPES    = ['', 'membership', 'lesson', 'test_session', 'ice_session']

export default function PaymentsPage() {
  const [page, setPage]              = useState(1)
  const [status, setStatus]          = useState('')
  const [paymentType, setPaymentType] = useState('')

  const { data, isLoading, error } = usePayments(page, status, paymentType)

  const totalRevenue = data?.results
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Payments</h1>
          <p className="text-slate-600 mt-1 text-sm">Track membership fees and event payments</p>
        </div>
        {data && (
          <div className="bg-white rounded-lg border border-slate-200 px-5 py-3 shadow-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-slate-500">Page revenue</p>
              <p className="text-lg font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All statuses</option>
          {STATUSES.slice(1).map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={paymentType}
          onChange={e => { setPaymentType(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All types</option>
          {TYPES.slice(1).map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t as Payment['payment_type']]}</option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorAlert message="Failed to load payments." />}

      {data && (
        <>
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Payer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{payment.payer_email}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate">{payment.description || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {TYPE_LABELS[payment.payment_type] ?? payment.payment_type}
                    </td>
                    <td className="px-6 py-4">
                      <StatusChip status={payment.status} />
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right tabular-nums">
                      ${parseFloat(payment.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.results.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <DollarSign className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No payments found</p>
              </div>
            )}
          </div>

          {(data.previous || data.next) && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Page {page}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={!data.previous}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.next}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

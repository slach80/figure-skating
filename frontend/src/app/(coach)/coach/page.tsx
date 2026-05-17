'use client'

import { useState } from 'react'
import { CheckCircle, Clock, XCircle, UserX } from 'lucide-react'
import { useTodaysBookings, useConfirmBooking, useCompleteBooking, useCancelBooking } from '@/hooks/useScheduling'
import type { BookingList } from '@/types/scheduling'

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-slate-500 bg-slate-50 border-slate-200' },
  no_show: { label: 'No show', icon: UserX, color: 'text-red-600 bg-red-50 border-red-200' },
}

function BookingCard({ booking }: { booking: BookingList }) {
  const confirm = useConfirmBooking()
  const complete = useCompleteBooking()
  const cancel = useCancelBooking()
  const [cancelling, setCancelling] = useState(false)

  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending
  const Icon = cfg.icon

  return (
    <div className={`bg-white rounded-xl border-2 ${cfg.color.split(' ').find(c => c.startsWith('border')) ?? 'border-slate-200'} p-5 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-slate-900">{booking.skater_name}</p>
          <p className="text-sm text-slate-500">{booking.lesson_type_name}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
          <Icon size={12} />
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span className="font-mono font-semibold text-slate-800 text-base">
          {booking.scheduled_time.slice(0, 5)}
        </span>
        <span className="text-slate-400">·</span>
        <span>{new Date(booking.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded ${booking.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {booking.payment_status === 'paid' ? `Paid $${booking.amount_paid}` : 'Payment pending'}
        </span>
      </div>

      {/* Actions */}
      {!cancelling && (booking.status === 'pending' || booking.status === 'confirmed') && (
        <div className="flex gap-2 pt-1">
          {booking.status === 'pending' && (
            <button
              onClick={() => confirm.mutate(booking.id)}
              disabled={confirm.isPending}
              className="flex-1 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm
            </button>
          )}
          {booking.status === 'confirmed' && (
            <button
              onClick={() => complete.mutate(booking.id)}
              disabled={complete.isPending}
              className="flex-1 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              Mark Complete
            </button>
          )}
          <button
            onClick={() => setCancelling(true)}
            className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            Cancel
          </button>
        </div>
      )}
      {cancelling && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { cancel.mutate({ id: booking.id, reason: 'coach_cancelled' }); setCancelling(false) }}
            disabled={cancel.isPending}
            className="flex-1 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Confirm cancel
          </button>
          <button onClick={() => setCancelling(false)} className="px-3 py-1.5 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">
            Keep
          </button>
        </div>
      )}
    </div>
  )
}

export default function CoachTodayPage() {
  const { data: bookings = [], isLoading, error } = useTodaysBookings()

  const pending = bookings.filter(b => b.status === 'pending')
  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const done = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled' || b.status === 'no_show')

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Today&apos;s Schedule</h1>
        <p className="text-slate-500 text-sm mt-0.5">{today}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total lessons', value: bookings.length, color: 'text-slate-800' },
          { label: 'Confirmed', value: confirmed.length, color: 'text-blue-600' },
          { label: 'Pending', value: pending.length, color: 'text-yellow-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-slate-500">Loading today&apos;s lessons…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          Failed to load schedule. Please refresh.
        </div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">⛸</div>
          <p className="text-slate-600 font-medium">No lessons scheduled today</p>
          <p className="text-slate-400 text-sm mt-1">Enjoy the ice!</p>
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-3">Awaiting confirmation ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        </section>
      )}

      {confirmed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3">Confirmed ({confirmed.length})</h2>
          <div className="space-y-3">
            {confirmed.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Completed / Cancelled</h2>
          <div className="space-y-3">
            {done.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        </section>
      )}
    </div>
  )
}

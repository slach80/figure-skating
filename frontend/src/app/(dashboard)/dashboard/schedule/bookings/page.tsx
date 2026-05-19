'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useBookings, useConfirmBooking, useCancelBooking, useCompleteBooking } from '@/hooks/useScheduling'
import { useCoaches } from '@/hooks/useScheduling'
import type { BookingList } from '@/types/scheduling'

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-500',
  no_show: 'bg-red-100 text-red-700',
}

const PAYMENT_BADGE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-emerald-50 text-emerald-700',
  refunded: 'bg-slate-50 text-slate-500',
}

function BookingRow({ booking }: { booking: BookingList }) {
  const confirm = useConfirmBooking()
  const cancel = useCancelBooking()
  const complete = useCompleteBooking()
  const [cancelling, setCancelling] = useState(false)

  return (
    <tr className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{booking.skater_name}</p>
        <p className="text-xs text-slate-500">{booking.lesson_type_name}</p>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{booking.coach_name}</td>
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
        {new Date(booking.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        <span className="ml-1 text-slate-500">{booking.scheduled_time.slice(0, 5)}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[booking.status] ?? ''}`}>
          {booking.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_BADGE[booking.payment_status] ?? ''}`}>
          {booking.payment_status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">${booking.amount_paid}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {booking.status === 'pending' && (
            <button
              onClick={() => confirm.mutate(booking.id)}
              disabled={confirm.isPending}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm
            </button>
          )}
          {booking.status === 'confirmed' && (
            <button
              onClick={() => complete.mutate(booking.id)}
              disabled={complete.isPending}
              className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              Complete
            </button>
          )}
          {(booking.status === 'pending' || booking.status === 'confirmed') && !cancelling && (
            <button
              onClick={() => setCancelling(true)}
              className="text-xs px-2 py-1 border border-red-300 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Cancel
            </button>
          )}
          {cancelling && (
            <button
              onClick={() => {
                cancel.mutate({ id: booking.id, reason: 'admin_cancelled' })
                setCancelling(false)
              }}
              disabled={cancel.isPending}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Confirm cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function BookingsPage() {
  const [coachFilter, setCoachFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const { data: coaches = [] } = useCoaches()
  const { data: bookings = [], isLoading } = useBookings({
    ...(coachFilter ? { coach: coachFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(dateFilter ? { date: dateFilter } : {}),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/schedule" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">All Bookings</h1>
          <p className="text-slate-500 text-sm mt-0.5">{bookings.length} bookings</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
        <select
          value={coachFilter}
          onChange={e => setCoachFilter(e.target.value)}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-700 dark:text-slate-300"
        >
          <option value="">All coaches</option>
          {coaches.map(c => (
            <option key={c.id} value={c.id}>{c.user_name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-700 dark:text-slate-300"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No show</option>
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-slate-700 dark:text-slate-300"
        />
        {(coachFilter || statusFilter || dateFilter) && (
          <button
            onClick={() => { setCoachFilter(''); setStatusFilter(''); setDateFilter('') }}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:dark:text-slate-300 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {['Skater', 'Coach', 'Date & Time', 'Status', 'Payment', 'Amount', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => <BookingRow key={b.id} booking={b} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

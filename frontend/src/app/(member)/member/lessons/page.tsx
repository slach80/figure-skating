'use client'

import Link from 'next/link'
import { Plus, Calendar, Clock } from 'lucide-react'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import { useBookings, useCancelBooking } from '@/hooks/useScheduling'
import { useState } from 'react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500' },
  no_show: { label: 'No show', color: 'bg-red-100 text-red-700' },
}

export default function MemberLessonsPage() {
  const { data: skater } = useMemberProfile()
  const { data: bookings = [], isLoading } = useBookings(
    skater?.id ? { } : {}
  )
  const cancelBooking = useCancelBooking()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = bookings
    .filter(b => b.scheduled_date >= today && b.status !== 'cancelled')
    .sort((a, b) => `${a.scheduled_date}T${a.scheduled_time}` < `${b.scheduled_date}T${b.scheduled_time}` ? -1 : 1)
  const past = bookings
    .filter(b => b.scheduled_date < today || b.status === 'cancelled')
    .sort((a, b) => `${a.scheduled_date}T${a.scheduled_time}` > `${b.scheduled_date}T${b.scheduled_time}` ? -1 : 1)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">My Lessons</h1>
        <Link
          href="/member/lessons/book"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90"
        >
          <Plus size={14} /> Book
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && upcoming.length === 0 && past.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Calendar className="mx-auto text-slate-300 mb-3" size={36} />
          <p className="font-medium text-slate-700">No lessons yet</p>
          <p className="text-sm text-slate-400 mt-1">Book your first lesson to get started.</p>
          <Link
            href="/member/lessons/book"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90"
          >
            <Plus size={14} /> Book a lesson
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map(b => {
              const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending
              const isCancelling = cancellingId === b.id
              const dateObj = new Date(b.scheduled_date + 'T00:00:00')
              const daysAway = Math.ceil((dateObj.getTime() - new Date().setHours(0,0,0,0)) / 86400000)
              return (
                <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{b.lesson_type_name}</p>
                      <p className="text-sm text-slate-500 mt-0.5">with {b.coach_name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-slate-400" />
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" />
                      {b.scheduled_time.slice(0, 5)}
                    </span>
                    {daysAway === 0 && <span className="text-primary font-semibold text-xs">Today!</span>}
                    {daysAway === 1 && <span className="text-amber-600 font-semibold text-xs">Tomorrow</span>}
                  </div>
                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {!isCancelling ? (
                        <button
                          onClick={() => setCancellingId(b.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Cancel lesson
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              cancelBooking.mutate({ id: b.id, reason: 'member_cancelled' })
                              setCancellingId(null)
                            }}
                            disabled={cancelBooking.isPending}
                            className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            Confirm cancel
                          </button>
                          <button onClick={() => setCancellingId(null)} className="text-xs text-slate-500 hover:text-slate-700">
                            Keep it
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Past lessons</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {past.map(b => {
              const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.completed
              return (
                <div key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.lesson_type_name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(b.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{b.coach_name}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

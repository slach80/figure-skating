'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, List, Settings, ClipboardList, Package } from 'lucide-react'
import { useSlots } from '@/hooks/useScheduling'
import { useCoaches } from '@/hooks/useScheduling'
import type { AvailabilitySlot } from '@/types/scheduling'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am–8pm
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDates(anchor: Date): Date[] {
  const dow = anchor.getDay()
  const sunday = new Date(anchor)
  sunday.setDate(anchor.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 border-emerald-400 text-emerald-800',
  partially_booked: 'bg-blue-100 border-blue-400 text-blue-800',
  fully_booked: 'bg-slate-100 border-slate-400 text-slate-500',
  cancelled: 'bg-red-100 border-red-300 text-red-600 line-through opacity-60',
}

function SlotPill({ slot }: { slot: AvailabilitySlot }) {
  const start = timeToMinutes(slot.start_time)
  const end = timeToMinutes(slot.end_time)
  const top = ((start - 7 * 60) / 60) * 56 // 56px per hour
  const height = Math.max(((end - start) / 60) * 56, 28)
  const colorClass = STATUS_COLORS[slot.status] ?? STATUS_COLORS.available

  return (
    <div
      className={`absolute left-0.5 right-0.5 rounded border-l-4 px-1 py-0.5 text-xs overflow-hidden cursor-pointer ${colorClass}`}
      style={{ top, height }}
      title={`${slot.lesson_type.name} — ${slot.coach.user_name} (${slot.spots_remaining} spots)`}
    >
      <div className="font-medium truncate">{slot.lesson_type.name}</div>
      <div className="truncate opacity-75">{slot.coach.user_name}</div>
    </div>
  )
}

export default function SchedulePage() {
  const [anchor, setAnchor] = useState(() => new Date())
  const [coachFilter, setCoachFilter] = useState('')
  const [view, setView] = useState<'week' | 'list'>('week')

  const days = getWeekDates(anchor)
  const dateFrom = toDateStr(days[0])
  const dateTo = toDateStr(days[6])

  const { data: coaches = [] } = useCoaches()
  const { data: slots = [], isLoading } = useSlots({
    date_from: dateFrom,
    date_to: dateTo,
    ...(coachFilter ? { coach: coachFilter } : {}),
  })

  function prevWeek() {
    const d = new Date(anchor)
    d.setDate(d.getDate() - 7)
    setAnchor(d)
  }
  function nextWeek() {
    const d = new Date(anchor)
    d.setDate(d.getDate() + 7)
    setAnchor(d)
  }
  function goToday() {
    setAnchor(new Date())
  }

  const slotsByDay: Record<string, AvailabilitySlot[]> = {}
  for (const day of days) {
    slotsByDay[toDateStr(day)] = []
  }
  for (const slot of slots) {
    if (slotsByDay[slot.date]) slotsByDay[slot.date].push(slot)
  }

  const today = toDateStr(new Date())
  const monthLabel = anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage availability slots and bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/schedule/lesson-types"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <Settings size={15} /> Lesson Types
          </Link>
          <Link
            href="/dashboard/schedule/test-sessions"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <ClipboardList size={15} /> Test Sessions
          </Link>
          <Link
            href="/dashboard/schedule/packages"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <Package size={15} /> Packages
          </Link>
          <Link
            href="/dashboard/schedule/bookings"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <List size={15} /> All Bookings
          </Link>
          <Link
            href="/dashboard/schedule/slots/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90"
          >
            <Plus size={15} /> Add Slot
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button onClick={prevWeek} className="p-1 rounded hover:bg-slate-100">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToday} className="px-2 py-0.5 text-xs rounded border border-slate-300 hover:bg-slate-50">
            Today
          </button>
          <button onClick={nextWeek} className="p-1 rounded hover:bg-slate-100">
            <ChevronRight size={16} />
          </button>
          <span className="ml-2 font-medium text-slate-700">{monthLabel}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={coachFilter}
            onChange={e => setCoachFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded px-2 py-1 text-slate-700"
          >
            <option value="">All coaches</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{c.user_name}</option>
            ))}
          </select>

          <div className="flex border border-slate-300 rounded overflow-hidden">
            <button
              onClick={() => setView('week')}
              className={`px-2.5 py-1 text-xs flex items-center gap-1 ${view === 'week' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <CalendarDays size={13} /> Week
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-2.5 py-1 text-xs flex items-center gap-1 ${view === 'list' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List size={13} /> List
            </button>
          </div>
        </div>
      </div>

      {/* Calendar / List */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500">
          Loading schedule…
        </div>
      ) : view === 'week' ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            <div className="border-r border-slate-200" />
            {days.map((d, i) => {
              const ds = toDateStr(d)
              const isToday = ds === today
              return (
                <div
                  key={i}
                  className={`py-2 text-center text-xs font-medium border-r border-slate-200 last:border-0 ${isToday ? 'bg-primary/5 text-primary' : 'text-slate-600'}`}
                >
                  <div>{DAYS[i]}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-slate-800'}`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <div className="grid relative" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
              {/* Hour labels */}
              <div>
                {HOURS.map(h => (
                  <div key={h} className="border-b border-slate-100 text-right pr-2 text-xs text-slate-400" style={{ height: 56 }}>
                    <span className="relative -top-2">{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((d, i) => {
                const ds = toDateStr(d)
                const daySlots = slotsByDay[ds] ?? []
                const isToday = ds === today
                return (
                  <div
                    key={i}
                    className={`relative border-l border-slate-200 ${isToday ? 'bg-primary/5' : ''}`}
                    style={{ height: HOURS.length * 56 }}
                  >
                    {HOURS.map(h => (
                      <div key={h} className="border-b border-slate-100" style={{ height: 56 }} />
                    ))}
                    {daySlots.map(slot => (
                      <SlotPill key={slot.id} slot={slot} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        // List view
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {slots.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No slots this week.</p>
          ) : (
            slots
              .slice()
              .sort((a, b) => `${a.date}T${a.start_time}` < `${b.date}T${b.start_time}` ? -1 : 1)
              .map(slot => (
                <div key={slot.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: slot.lesson_type.color || '#6366f1' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{slot.lesson_type.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' · '}{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                        {' · '}{slot.coach.user_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[slot.status]}`}>
                      {slot.status.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">{slot.spots_remaining} spots · ${slot.effective_price}</p>
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}

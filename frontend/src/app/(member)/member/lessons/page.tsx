'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock, User, X, AlertCircle, CheckCircle } from 'lucide-react'
import { useAvailableSlots, useMyPackages, useBookLesson, useBookings, useCancelBooking } from '@/hooks/useScheduling'
import { useMySkaters } from '@/hooks/useSkaters'
import type { AvailableSlot, MyPurchasedPackage } from '@/types/scheduling'
import type { SkaterDetail } from '@/types/skater'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekBounds(anchor: Date): { start: Date; end: Date } {
  const day = anchor.getDay() // 0=Sun
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatTime(isoDatetime: string): string {
  const d = new Date(isoDatetime)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDateShort(isoDatetime: string): string {
  const d = new Date(isoDatetime)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GRID_START_HOUR = 6   // 06:00
const GRID_END_HOUR = 21    // 21:00  (exclusive — last slot at 20:30)
const SLOT_HEIGHT_PER_MIN = 2 // px per minute

function minutesFromMidnight(isoDatetime: string): number {
  const d = new Date(isoDatetime)
  return d.getHours() * 60 + d.getMinutes()
}

interface SlotBlock {
  slot: AvailableSlot
  dayIndex: number  // 0=Mon … 6=Sun
  topPx: number
  heightPx: number
}

function buildSlotBlocks(slots: AvailableSlot[], weekStart: Date): SlotBlock[] {
  const blocks: SlotBlock[] = []
  const gridStartMinutes = GRID_START_HOUR * 60

  for (const slot of slots) {
    const slotDate = new Date(slot.start_datetime)
    const weekDay = slotDate.getDay() // 0=Sun
    const dayIndex = (weekDay + 6) % 7  // Mon=0 … Sun=6

    // Verify slot is within this week
    const slotDateStr = toISODate(slotDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return toISODate(d)
    })
    if (!weekDays.includes(slotDateStr)) continue

    const startMin = minutesFromMidnight(slot.start_datetime)
    const endMin = minutesFromMidnight(slot.end_datetime)
    const clampedStart = Math.max(startMin, gridStartMinutes)
    const clampedEnd = Math.min(endMin, GRID_END_HOUR * 60)
    if (clampedEnd <= clampedStart) continue

    const topPx = (clampedStart - gridStartMinutes) * SLOT_HEIGHT_PER_MIN
    const heightPx = (clampedEnd - clampedStart) * SLOT_HEIGHT_PER_MIN

    blocks.push({ slot, dayIndex, topPx, heightPx })
  }
  return blocks
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400' },
  completed: { label: 'Completed', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
  no_show: { label: 'No show', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' },
}

// ── Booking Modal ─────────────────────────────────────────────────────────────

interface BookingModalProps {
  slot: AvailableSlot
  skaters: SkaterDetail[]
  packages: MyPurchasedPackage[]
  onClose: () => void
  onSuccess: () => void
}

function BookingModal({ slot, skaters, packages, onClose, onSuccess }: BookingModalProps) {
  const [skaterId, setSkaterId] = useState<string>(skaters[0]?.id ?? '')
  const [paymentMethod, setPaymentMethod] = useState<'drop_in' | 'package'>('drop_in')
  const [packageId, setPackageId] = useState<string>(packages[0]?.id ?? '')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const bookLesson = useBookLesson()

  const activePackages = useMemo(
    () => packages.filter(p => p.sessions_remaining > 0),
    [packages]
  )

  const hasPackages = activePackages.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!skaterId) {
      setErrorMsg('Please select a skater.')
      return
    }
    const payload = {
      slot: slot.id,
      skater_id: skaterId,
      payment_method: paymentMethod,
      ...(paymentMethod === 'package' && packageId ? { package_id: packageId } : {}),
    }
    try {
      await bookLesson.mutateAsync(payload)
      onSuccess()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string | string[]> } }
      const data = axiosErr?.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.values(data)
          .flatMap(v => (Array.isArray(v) ? v : [v]))
          .join(' ')
        setErrorMsg(msgs || 'Booking failed. Please try again.')
      } else {
        setErrorMsg('Booking failed. Please try again.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Book Lesson</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Slot summary */}
        <div className="px-5 py-4 bg-violet-50 dark:bg-violet-900/30 border-b border-violet-100 dark:border-violet-800">
          <p className="font-semibold text-violet-900 dark:text-violet-200">{slot.lesson_type_name}</p>
          <p className="text-sm text-violet-700 dark:text-violet-300 mt-0.5">with {slot.coach_name}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-violet-700 dark:text-violet-300">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {formatDateShort(slot.start_datetime)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {formatTime(slot.start_datetime)} · {slot.lesson_type_duration_minutes} min
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Skater selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <User size={13} className="inline mr-1" />
              Skater
            </label>
            {skaters.length === 0 ? (
              <p className="text-sm text-slate-500">No skater profiles found.</p>
            ) : (
              <select
                value={skaterId}
                onChange={e => setSkaterId(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {skaters.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Payment method */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Payment method</p>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="drop_in"
                  checked={paymentMethod === 'drop_in'}
                  onChange={() => setPaymentMethod('drop_in')}
                  className="mt-0.5 accent-violet-600"
                />
                <span className="text-sm text-slate-800 dark:text-slate-200">
                  Drop-in
                  <span className="ml-1.5 font-semibold text-violet-700">${Number(slot.price).toFixed(2)}</span>
                </span>
              </label>

              <label className={`flex items-start gap-2.5 ${!hasPackages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="payment"
                  value="package"
                  checked={paymentMethod === 'package'}
                  onChange={() => setPaymentMethod('package')}
                  disabled={!hasPackages}
                  className="mt-0.5 accent-violet-600"
                />
                <span className="text-sm text-slate-800 dark:text-slate-200">
                  Use package credit
                  {!hasPackages && (
                    <span className="ml-1.5 text-xs text-slate-400 font-normal">(no active packages)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Package selector */}
          {paymentMethod === 'package' && hasPackages && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Select package</label>
              <select
                value={packageId}
                onChange={e => setPackageId(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {activePackages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.package_name} — {p.sessions_remaining} session{p.sessions_remaining !== 1 ? 's' : ''} left
                    {p.expiry_date ? ` (expires ${p.expiry_date})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={bookLesson.isPending || skaters.length === 0}
            className="w-full py-2.5 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {bookLesson.isPending ? 'Booking…' : 'Book Lesson'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
      <CheckCircle size={16} />
      {message}
    </div>
  )
}

// ── Week Calendar Grid ────────────────────────────────────────────────────────

interface WeekGridProps {
  slots: AvailableSlot[]
  weekStart: Date
  onSelectSlot: (slot: AvailableSlot) => void
}

function WeekGrid({ slots, weekStart, onSelectSlot }: WeekGridProps) {
  const totalMinutes = (GRID_END_HOUR - GRID_START_HOUR) * 60
  const gridHeightPx = totalMinutes * SLOT_HEIGHT_PER_MIN

  const timeLabels: string[] = []
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
    timeLabels.push(`${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`)
  }

  const blocks = useMemo(() => buildSlotBlocks(slots, weekStart), [slots, weekStart])

  const blocksByDay = useMemo(() => {
    const map: Record<number, SlotBlock[]> = {}
    for (const b of blocks) {
      if (!map[b.dayIndex]) map[b.dayIndex] = []
      map[b.dayIndex].push(b)
    }
    return map
  }, [blocks])

  const allDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  // On mobile show 3 days centred around today (or Mon–Wed if today not in week)
  const todayStr = toISODate(new Date())
  const todayIndexInWeek = allDates.findIndex(d => toISODate(d) === todayStr)
  const [mobileOffset, setMobileOffset] = useState(() => {
    if (todayIndexInWeek >= 0) return Math.min(Math.max(todayIndexInWeek - 1, 0), 4)
    return 0
  })
  const weekDates = typeof window !== 'undefined' && window.innerWidth < 768
    ? allDates.slice(mobileOffset, mobileOffset + 3)
    : allDates
  const dayOffset = typeof window !== 'undefined' && window.innerWidth < 768 ? mobileOffset : 0

  return (
    <div>
      {/* Mobile day navigator */}
      <div className="flex items-center justify-between mb-1 md:hidden">
        <button
          onClick={() => setMobileOffset(o => Math.max(0, o - 3))}
          disabled={mobileOffset === 0}
          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {weekDates[0] && weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' — '}
          {weekDates[weekDates.length - 1] && weekDates[weekDates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <button
          onClick={() => setMobileOffset(o => Math.min(4, o + 3))}
          disabled={mobileOffset >= 4}
          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="overflow-x-hidden">
        <div className="w-full">
        {/* Day headers */}
        <div className="flex pl-10 border-b border-slate-200 dark:border-slate-700">
          {weekDates.map((d, i) => {
            const ds = toISODate(d)
            const isToday = ds === todayStr
            return (
              <div
                key={i}
                className={`flex-1 text-center py-2 text-xs font-medium ${isToday ? 'text-violet-700' : 'text-slate-500'}`}
              >
                <span className={`block ${isToday ? 'font-bold' : ''}`}>{DAY_LABELS[i + dayOffset]}</span>
                <span className={`block text-base ${isToday ? 'text-violet-700 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                  {d.getDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* Grid body */}
        <div className="flex">
          {/* Time axis */}
          <div className="w-10 shrink-0 relative" style={{ height: gridHeightPx }}>
            {timeLabels.map((label, i) => (
              <div
                key={i}
                className="absolute right-1 text-[10px] text-slate-400 leading-none"
                style={{ top: i * 60 * SLOT_HEIGHT_PER_MIN - 6 }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((_, i) => {
            const dayIndex = i + dayOffset
            return (
            <div
              key={dayIndex}
              className="flex-1 relative border-l border-slate-100 dark:border-slate-700"
              style={{ height: gridHeightPx }}
            >
              {/* Hour lines */}
              {timeLabels.map((_, j) => (
                <div
                  key={j}
                  className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-700"
                  style={{ top: j * 60 * SLOT_HEIGHT_PER_MIN }}
                />
              ))}

              {/* Slot blocks */}
              {(blocksByDay[dayIndex] ?? []).map(({ slot, topPx, heightPx }) => (
                <button
                  key={slot.id}
                  onClick={() => onSelectSlot(slot)}
                  className="absolute left-0.5 right-0.5 rounded text-left overflow-hidden hover:opacity-90 active:scale-[0.98] transition-all border-l-4 border-violet-500 bg-violet-100 dark:bg-violet-900/40 cursor-pointer"
                  style={{ top: topPx, height: Math.max(heightPx, 20) }}
                  title={`${slot.lesson_type_name} with ${slot.coach_name}`}
                >
                  <div className="px-1 pt-0.5">
                    <p className="text-[10px] font-semibold text-violet-900 dark:text-violet-200 leading-tight truncate">
                      {slot.lesson_type_name}
                    </p>
                    {heightPx >= 30 && (
                      <p className="text-[9px] text-violet-700 dark:text-violet-300 truncate">{slot.coach_name}</p>
                    )}
                    {heightPx >= 44 && (
                      <p className="text-[9px] text-violet-600 dark:text-violet-400">{formatTime(slot.start_datetime)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )})}
        </div>
      </div>
    </div>
  </div>
  )
}

// ── Sidebar: Upcoming bookings ────────────────────────────────────────────────

function UpcomingBookingsSidebar() {
  const { data: bookings = [], isLoading } = useBookings({
    status: 'confirmed',
    ordering: 'scheduled_date',
  })
  const cancelBooking = useCancelBooking()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = bookings
    .filter(b => b.scheduled_date >= today && b.status !== 'cancelled')
    .slice(0, 5)

  return (
    <aside className="w-full md:w-72 shrink-0">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upcoming Lessons</h2>
        </div>

        {isLoading && (
          <div className="p-4 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4 mb-1.5" />
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && upcoming.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-400">
            No upcoming lessons
          </div>
        )}

        {upcoming.map(b => {
          const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.confirmed
          const isCancelling = cancellingId === b.id
          return (
            <div key={b.id} className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{b.lesson_type_name}</p>
                  <p className="text-xs text-slate-500 truncate">with {b.coach_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(b.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                    {' '}· {b.scheduled_time.slice(0, 5)}
                  </p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>

              {(b.status === 'pending' || b.status === 'confirmed') && (
                <div className="mt-2">
                  {!isCancelling ? (
                    <button
                      onClick={() => setCancellingId(b.id)}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      Cancel
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          cancelBooking.mutate({ id: b.id, reason: 'member_cancelled' })
                          setCancellingId(null)
                        }}
                        disabled={cancelBooking.isPending}
                        className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button onClick={() => setCancellingId(null)} className="text-xs text-slate-500">
                        Keep
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MemberLessonsPage() {
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekBounds(anchorDate), [anchorDate])

  const startStr = toISODate(weekStart)
  const endStr = toISODate(weekEnd)

  const { data: slots = [], isLoading: slotsLoading, error: slotsError } = useAvailableSlots({
    start: startStr,
    end: endStr,
  })

  const { data: skaters = [] } = useMySkaters()
  const { data: myPackages = [] } = useMyPackages()

  const prevWeek = useCallback(() => {
    setAnchorDate(d => {
      const n = new Date(d)
      n.setDate(d.getDate() - 7)
      return n
    })
  }, [])

  const nextWeek = useCallback(() => {
    setAnchorDate(d => {
      const n = new Date(d)
      n.setDate(d.getDate() + 7)
      return n
    })
  }, [])

  const goToToday = useCallback(() => setAnchorDate(new Date()), [])

  function handleBookingSuccess() {
    setSelectedSlot(null)
    setToast('Lesson booked!')
  }

  const weekLabel = (() => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const s = weekStart.toLocaleDateString('en-US', opts)
    const e = weekEnd.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
    return `${s} – ${e}`
  })()

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Book a Lesson</h1>
      </div>

      {/* Two-column layout on md+ */}
      <div className="flex flex-col md:flex-row gap-4 md:items-start">
        {/* Calendar panel */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Week navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1">
              <button
                onClick={prevWeek}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                aria-label="Previous week"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextWeek}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                aria-label="Next week"
              >
                <ChevronRight size={18} />
              </button>
              <span className="ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{weekLabel}</span>
            </div>
            <button
              onClick={goToToday}
              className="text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              Today
            </button>
          </div>

          {/* Loading state */}
          {slotsLoading && (
            <div className="px-4 py-16 text-center text-sm text-slate-400 animate-pulse">
              Loading available slots…
            </div>
          )}

          {/* Error state */}
          {slotsError && !slotsLoading && (
            <div className="px-4 py-8 text-center text-sm text-red-500">
              Failed to load slots. Please refresh.
            </div>
          )}

          {/* Empty state */}
          {!slotsLoading && !slotsError && slots.length === 0 && (
            <div className="px-4 py-16 text-center">
              <Calendar className="mx-auto text-slate-300 mb-3" size={36} />
              <p className="font-medium text-slate-600 dark:text-slate-400">No available slots this week</p>
              <p className="text-sm text-slate-400 mt-1">Try another week or check back later.</p>
            </div>
          )}

          {/* Week grid */}
          {!slotsLoading && !slotsError && slots.length > 0 && (
            <WeekGrid
              slots={slots}
              weekStart={weekStart}
              onSelectSlot={setSelectedSlot}
            />
          )}
        </div>

        {/* Sidebar: upcoming booked lessons */}
        <UpcomingBookingsSidebar />
      </div>

      {/* Booking modal */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          skaters={skaters}
          packages={myPackages}
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Success toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

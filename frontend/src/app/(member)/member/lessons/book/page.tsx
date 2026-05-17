'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCoaches, useLessonTypes, useSlots, useCreateBooking } from '@/hooks/useScheduling'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import type { AvailabilitySlot, Coach, LessonType } from '@/types/scheduling'

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

const FORMAT_LABELS: Record<string, string> = {
  private: 'Private',
  semi_private: 'Semi-private',
  group: 'Group',
  test_session: 'Test Session',
  club_ice: 'Club Ice',
}

export default function BookLessonPage() {
  const router = useRouter()
  const { data: skater } = useMemberProfile()
  const { data: coaches = [] } = useCoaches()
  const { data: lessonTypes = [] } = useLessonTypes()
  const createBooking = useCreateBooking()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [selectedType, setSelectedType] = useState<LessonType | null>(null)
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [error, setError] = useState('')

  const dateFrom = toDateStr(weekAnchor)
  const dateTo = (() => {
    const d = new Date(weekAnchor)
    d.setDate(d.getDate() + 13) // 2 weeks
    return toDateStr(d)
  })()

  const { data: slots = [], isLoading: slotsLoading } = useSlots({
    date_from: dateFrom,
    date_to: dateTo,
    status: 'available',
    ...(selectedCoach ? { coach: selectedCoach.id } : {}),
  })

  const filteredSlots = selectedType
    ? slots.filter(s => s.lesson_type.id === selectedType.id)
    : slots

  // Group slots by date
  const slotsByDate: Record<string, AvailabilitySlot[]> = {}
  for (const slot of filteredSlots) {
    if (!slotsByDate[slot.date]) slotsByDate[slot.date] = []
    slotsByDate[slot.date].push(slot)
  }
  const slotDates = Object.keys(slotsByDate).sort()

  async function handleBook() {
    if (!selectedSlot || !skater) return
    setError('')
    try {
      await createBooking.mutateAsync({
        skater: skater.id,
        coach: selectedSlot.coach.id,
        lesson_type: selectedSlot.lesson_type.id,
        availability_slot: selectedSlot.id,
        scheduled_date: selectedSlot.date,
        scheduled_time: selectedSlot.start_time,
        duration_minutes: selectedSlot.lesson_type.duration_minutes,
      })
      router.push('/member/lessons')
    } catch {
      setError('Booking failed. The slot may no longer be available.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/member/lessons" className="text-slate-400 hover:text-slate-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Book a Lesson</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['Pick type', 'Find time', 'Confirm'] as const).map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
            }`}>{step > i + 1 ? '✓' : i + 1}</div>
            <span className={`text-xs ${step === i + 1 ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{label}</span>
            {i < 2 && <div className="w-6 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose coach + lesson type */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Coach (optional)</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCoach(null)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${!selectedCoach ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}
              >
                Any coach
              </button>
              {coaches.filter(c => c.is_active).map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCoach(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${selectedCoach?.id === c.id ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}
                >
                  {c.user_name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Lesson type</p>
            <div className="space-y-2">
              {lessonTypes.filter(lt => lt.is_active && lt.lesson_format !== 'club_ice').map(lt => (
                <button
                  key={lt.id}
                  onClick={() => setSelectedType(lt)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    selectedType?.id === lt.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: lt.color }} />
                      <span className="font-medium text-slate-900">{lt.name}</span>
                    </div>
                    <span className="text-slate-700 font-semibold">${lt.price}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-5">
                    {FORMAT_LABELS[lt.lesson_format]} · {lt.duration_minutes} min
                    {lt.max_participants > 1 && ` · up to ${lt.max_participants} skaters`}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!selectedType}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40"
          >
            Find available times
          </button>
        </div>
      )}

      {/* Step 2: Pick a time slot */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { const d = new Date(weekAnchor); d.setDate(d.getDate() - 14); setWeekAnchor(d) }}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-slate-700">
              {weekAnchor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} —{' '}
              {(() => { const d = new Date(weekAnchor); d.setDate(d.getDate() + 13); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })()}
            </span>
            <button
              onClick={() => { const d = new Date(weekAnchor); d.setDate(d.getDate() + 14); setWeekAnchor(d) }}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {slotsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : slotDates.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No available slots in this period.</p>
              <p className="text-xs text-slate-400 mt-1">Try a different date range or lesson type.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {slotDates.map(date => (
                <div key={date}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="space-y-2">
                    {slotsByDate[date].map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => { setSelectedSlot(slot); setStep(3) }}
                        className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">
                              {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {slot.coach.user_name} · {slot.spots_remaining} spot{slot.spots_remaining !== 1 ? 's' : ''} left
                            </p>
                          </div>
                          <span className="font-bold text-slate-800">${slot.effective_price}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700">
            ← Back
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && selectedSlot && selectedType && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            <div className="px-5 py-4">
              <p className="text-xs text-slate-500 mb-0.5">Lesson</p>
              <p className="font-semibold text-slate-900">{selectedType.name}</p>
              <p className="text-sm text-slate-500">{FORMAT_LABELS[selectedType.lesson_format]} · {selectedType.duration_minutes} min</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-500 mb-0.5">Coach</p>
              <p className="font-semibold text-slate-900">{selectedSlot.coach.user_name}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-500 mb-0.5">Date & time</p>
              <p className="font-semibold text-slate-900">
                {new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-sm text-slate-500">{selectedSlot.start_time.slice(0, 5)} — {selectedSlot.end_time.slice(0, 5)}</p>
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-900">${selectedSlot.effective_price}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <button
            onClick={handleBook}
            disabled={createBooking.isPending}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            {createBooking.isPending ? 'Booking…' : 'Confirm Booking'}
          </button>
          <button onClick={() => setStep(2)} className="text-sm text-slate-500 hover:text-slate-700 w-full text-center">
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}

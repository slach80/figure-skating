'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useCoaches, useLessonTypes, useCreateSlot } from '@/hooks/useScheduling'

export default function NewSlotPage() {
  const router = useRouter()
  const { data: coaches = [] } = useCoaches()
  const { data: lessonTypes = [] } = useLessonTypes()
  const createSlot = useCreateSlot()

  const [form, setForm] = useState({
    coach: '',
    lesson_type: '',
    date: '',
    start_time: '',
    end_time: '',
    recurrence: 'none',
    recurrence_end_date: '',
    notes: '',
  })
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Auto-fill end_time from lesson type duration
  function onLessonTypeChange(id: string) {
    set('lesson_type', id)
    if (!form.start_time) return
    const lt = lessonTypes.find(l => l.id === id)
    if (!lt) return
    const [h, m] = form.start_time.split(':').map(Number)
    const endMins = h * 60 + m + lt.duration_minutes
    const endH = Math.floor(endMins / 60).toString().padStart(2, '0')
    const endM = (endMins % 60).toString().padStart(2, '0')
    set('end_time', `${endH}:${endM}`)
  }

  function onStartTimeChange(val: string) {
    set('start_time', val)
    const lt = lessonTypes.find(l => l.id === form.lesson_type)
    if (!lt) return
    const [h, m] = val.split(':').map(Number)
    const endMins = h * 60 + m + lt.duration_minutes
    const endH = Math.floor(endMins / 60).toString().padStart(2, '0')
    const endM = (endMins % 60).toString().padStart(2, '0')
    set('end_time', `${endH}:${endM}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.coach || !form.lesson_type || !form.date || !form.start_time || !form.end_time) {
      setError('Please fill in all required fields.')
      return
    }
    const payload: Record<string, unknown> = {
      coach: form.coach,
      lesson_type: form.lesson_type,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      recurrence: form.recurrence,
      notes: form.notes,
    }
    if (form.recurrence !== 'none' && form.recurrence_end_date) {
      payload.recurrence_end_date = form.recurrence_end_date
    }
    createSlot.mutate(payload, {
      onSuccess: () => router.push('/dashboard/schedule'),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(msg ?? 'Failed to create slot.')
      },
    })
  }

  const selectedLt = lessonTypes.find(l => l.id === form.lesson_type)

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/schedule" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add Availability Slot</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create one or a recurring series of coach slots</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Coach <span className="text-red-500">*</span></label>
          <select
            value={form.coach}
            onChange={e => set('coach', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            required
          >
            <option value="">Select a coach…</option>
            {coaches.filter(c => c.is_active).map(c => (
              <option key={c.id} value={c.id}>{c.user_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lesson Type <span className="text-red-500">*</span></label>
          <select
            value={form.lesson_type}
            onChange={e => onLessonTypeChange(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            required
          >
            <option value="">Select a lesson type…</option>
            {lessonTypes.filter(l => l.is_active).map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.duration_minutes} min — ${l.price})</option>
            ))}
          </select>
          {selectedLt && (
            <p className="text-xs text-slate-500 mt-1">
              {selectedLt.lesson_format.replace('_', ' ')} · max {selectedLt.max_participants} participant{selectedLt.max_participants !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start time <span className="text-red-500">*</span></label>
            <input
              type="time"
              value={form.start_time}
              onChange={e => onStartTimeChange(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End time <span className="text-red-500">*</span></label>
            <input
              type="time"
              value={form.end_time}
              onChange={e => set('end_time', e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recurrence</label>
          <div className="flex gap-2">
            {[
              { value: 'none', label: 'None' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'biweekly', label: 'Biweekly' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence"
                  value={opt.value}
                  checked={form.recurrence === opt.value}
                  onChange={e => set('recurrence', e.target.value)}
                  className="accent-primary"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {form.recurrence !== 'none' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recurrence end date</label>
            <input
              type="date"
              value={form.recurrence_end_date}
              onChange={e => set('recurrence_end_date', e.target.value)}
              min={form.date}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 resize-none"
            placeholder="Optional notes for this slot…"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createSlot.isPending}
            className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {createSlot.isPending ? 'Creating…' : form.recurrence === 'none' ? 'Create Slot' : 'Create Series'}
          </button>
          <Link
            href="/dashboard/schedule"
            className="px-5 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

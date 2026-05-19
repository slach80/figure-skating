'use client'

import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { useBookings, useCompleteBooking } from '@/hooks/useScheduling'
import api from '@/lib/api'
import type { BookingList } from '@/types/scheduling'

function NoteRow({ booking }: { booking: BookingList }) {
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const complete = useCompleteBooking()

  async function saveNote() {
    setSaving(true)
    try {
      await api.patch(`/api/v1/scheduling/bookings/${booking.id}/`, { coach_notes: notes })
      setSaved(true)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{booking.skater_name}</p>
          <p className="text-sm text-slate-500">
            {booking.lesson_type_name} ·{' '}
            {new Date(booking.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' at '}{booking.scheduled_time.slice(0, 5)}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
          {booking.status}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            autoFocus
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 resize-none"
            placeholder="Notes on today's session, progress, areas to focus on…"
          />
          <div className="flex gap-2">
            <button
              onClick={saveNote}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              <Check size={13} /> {saving ? 'Saving…' : 'Save note'}
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900">
              Cancel
            </button>
          </div>
        </div>
      ) : saved ? (
        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
          <p className="text-sm text-emerald-700 dark:text-emerald-400 italic">{notes || 'Note saved.'}</p>
          <button onClick={() => { setEditing(true); setSaved(false) }} className="text-slate-400 hover:text-slate-600 dark:hover:dark:text-slate-400 ml-2">
            <Pencil size={13} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <Pencil size={13} /> Add note
          </button>
          {booking.status === 'confirmed' && (
            <button
              onClick={() => complete.mutate(booking.id)}
              disabled={complete.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check size={13} /> Mark complete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function CoachNotesPage() {
  const today = new Date().toISOString().slice(0, 10)
  const { data: bookings = [], isLoading } = useBookings({ status: 'confirmed' })
  const past = bookings.filter(b => b.scheduled_date <= today)
  const [skaterFilter, setSkaterFilter] = useState('')

  const skaters = [...new Set(bookings.map(b => b.skater_name))].sort()
  const filtered = past.filter(b => !skaterFilter || b.skater_name === skaterFilter)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Session Notes</h1>
        <p className="text-slate-500 text-sm mt-0.5">Add progress notes to completed and recent lessons</p>
      </div>

      <select
        value={skaterFilter}
        onChange={e => setSkaterFilter(e.target.value)}
        className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
      >
        <option value="">All students</option>
        {skaters.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {isLoading ? (
        <p className="text-center py-8 text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-slate-500">No recent confirmed lessons.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered
            .sort((a, b) => `${b.scheduled_date}T${b.scheduled_time}` > `${a.scheduled_date}T${a.scheduled_time}` ? 1 : -1)
            .map(b => <NoteRow key={b.id} booking={b} />)}
        </div>
      )}
    </div>
  )
}

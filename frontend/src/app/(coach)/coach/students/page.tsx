'use client'

import { useState } from 'react'
import { useBookings } from '@/hooks/useScheduling'

interface StudentSummary {
  skater_name: string
  total: number
  completed: number
  upcoming: number
  last_lesson: string
  earned: number
}

export default function CoachStudentsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const { data: allBookings = [], isLoading } = useBookings()

  // Aggregate by skater name
  const bySkater: Record<string, StudentSummary> = {}
  for (const b of allBookings) {
    if (!bySkater[b.skater_name]) {
      bySkater[b.skater_name] = {
        skater_name: b.skater_name,
        total: 0,
        completed: 0,
        upcoming: 0,
        last_lesson: '',
        earned: 0,
      }
    }
    const s = bySkater[b.skater_name]
    s.total++
    if (b.status === 'completed') {
      s.completed++
      s.earned += parseFloat(b.amount_paid) || 0
    }
    if ((b.status === 'pending' || b.status === 'confirmed') && b.scheduled_date >= today) {
      s.upcoming++
    }
    if (b.scheduled_date > s.last_lesson) {
      s.last_lesson = b.scheduled_date
    }
  }

  const students = Object.values(bySkater).sort((a, b) => b.upcoming - a.upcoming || a.skater_name.localeCompare(b.skater_name))
  const [search, setSearch] = useState('')
  const filtered = students.filter(s => s.skater_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Students</h1>
        <p className="text-slate-500 text-sm mt-0.5">All skaters you have booked lessons with</p>
      </div>

      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search students…"
        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
      />

      {isLoading ? (
        <p className="text-center py-8 text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-slate-500">No students yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.map(s => (
            <div key={s.skater_name} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-900">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">{s.skater_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Last lesson: {s.last_lesson ? new Date(s.last_lesson).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                </p>
              </div>
              <div className="flex items-center gap-6 text-center">
                <div>
                  <p className="text-lg font-bold text-blue-600">{s.upcoming}</p>
                  <p className="text-xs text-slate-500">Upcoming</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{s.completed}</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300">${s.earned.toFixed(0)}</p>
                  <p className="text-xs text-slate-500">Earned</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

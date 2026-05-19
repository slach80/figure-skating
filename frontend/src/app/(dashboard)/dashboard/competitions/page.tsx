'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Trophy, MapPin, Calendar, Users, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useCompetitions, useCreateCompetition } from '@/hooks/useCompetitions'
import type { Competition } from '@/types/competition'

const EMPTY_FORM = {
  name: '',
  comp_type: 'home' as Competition['comp_type'],
  start_date: '',
  end_date: '',
  venue: '',
  city: '',
  state: '',
  sanction_number: '',
  entry_deadline: '',
  late_entry_deadline: '',
  base_entry_fee: '0',
  late_fee: '0',
  music_upload_deadline: '',
  notes: '',
  is_published: false,
}

function StatusBadge({ comp }: { comp: Competition }) {
  if (!comp.is_published) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
        <Clock size={11} /> Draft
      </span>
    )
  }
  if (!comp.is_entry_open) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:text-red-400">
        <XCircle size={11} /> Closed
      </span>
    )
  }
  if (comp.is_late) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:text-amber-400">
        <Clock size={11} /> Late Entry
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-400">
      <CheckCircle size={11} /> Open
    </span>
  )
}

export default function CompetitionsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: competitions = [], isLoading } = useCompetitions()
  const createComp = useCreateCompetition()

  function set(field: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, unknown> = { ...form }
    // Convert empty strings to null for nullable datetime fields
    const datetimeFields = ['entry_deadline', 'late_entry_deadline', 'music_upload_deadline'] as const
    for (const f of datetimeFields) {
      if (!payload[f]) payload[f] = null
    }
    await createComp.mutateAsync(payload as Partial<Competition>)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Competitions</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage competition events and entries</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 text-sm font-medium"
        >
          <Plus size={16} /> New Competition
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">New Competition</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
              <input
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
                placeholder="Spring Showcase 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <select
                value={form.comp_type}
                onChange={e => set('comp_type', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="home">Home Competition</option>
                <option value="away">Away Competition</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sanction #</label>
              <input
                value={form.sanction_number}
                onChange={e => set('sanction_number', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
                placeholder="USFS-2026-XXXX"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date *</label>
              <input
                required
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Date *</label>
              <input
                required
                type="date"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Venue</label>
              <input
                value={form.venue}
                onChange={e => set('venue', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
                placeholder="Ice Rink Name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">City</label>
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">State</label>
              <input
                value={form.state}
                onChange={e => set('state', e.target.value)}
                maxLength={2}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm uppercase"
                placeholder="MO"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Base Entry Fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.base_entry_fee}
                onChange={e => set('base_entry_fee', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Late Fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.late_fee}
                onChange={e => set('late_fee', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Entry Deadline</label>
              <input
                type="datetime-local"
                value={form.entry_deadline}
                onChange={e => set('entry_deadline', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Late Entry Deadline</label>
              <input
                type="datetime-local"
                value={form.late_entry_deadline}
                onChange={e => set('late_entry_deadline', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Music Upload Deadline</label>
              <input
                type="datetime-local"
                value={form.music_upload_deadline}
                onChange={e => set('music_upload_deadline', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                id="is_published"
                type="checkbox"
                checked={form.is_published}
                onChange={e => set('is_published', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="is_published" className="text-sm text-slate-700 dark:text-slate-300">Publish immediately</label>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createComp.isPending}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {createComp.isPending ? 'Creating…' : 'Create Competition'}
            </button>
          </div>

          {createComp.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">Failed to create competition. Please try again.</p>
          )}
        </form>
      )}

      {/* Competition cards */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading competitions…</div>
      ) : competitions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Trophy size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No competitions yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first competition to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {competitions.map(comp => (
            <Link
              key={comp.id}
              href={`/dashboard/competitions/${comp.id}`}
              className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{comp.name}</h2>
                    <StatusBadge comp={comp} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      comp.comp_type === 'home'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-sky-100 text-sky-700'
                    }`}>
                      {comp.comp_type === 'home' ? 'Home' : 'Away'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {new Date(comp.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {comp.start_date !== comp.end_date && (
                        <> – {new Date(comp.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                      )}
                      {comp.start_date === comp.end_date && (
                        <>, {new Date(comp.start_date).getFullYear()}</>
                      )}
                    </span>
                    {(comp.city || comp.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} />
                        {[comp.venue, comp.city, comp.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={13} />
                      {comp.entry_count} {comp.entry_count === 1 ? 'entry' : 'entries'}
                    </span>
                    <span className="text-slate-400">{comp.category_count} categories</span>
                    {comp.sanction_number && (
                      <span className="text-slate-400">#{comp.sanction_number}</span>
                    )}
                  </div>

                  {comp.entry_deadline && (
                    <p className="text-xs text-slate-400 mt-1">
                      Deadline: {new Date(comp.entry_deadline).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">${comp.base_entry_fee}</p>
                  <p className="text-xs text-slate-400">base fee</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

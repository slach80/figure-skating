'use client'

import { useState } from 'react'
import { useCoaches } from '@/hooks/useScheduling'
import { useEvaluations, useCreateEvaluation } from '@/hooks/useProgress'
import { useSkaters } from '@/hooks/useSkaters'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Star, ChevronDown, Send } from 'lucide-react'
import type { CoachEvaluation } from '@/types/scheduling'

const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

function StarRating({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              n <= (hover || value || 0)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-slate-200'
            }`}
          />
        </button>
      ))}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="text-xs text-slate-400 hover:text-red-500 ml-1 transition-colors"
          title="Clear"
        >
          ×
        </button>
      )}
    </div>
  )
}

const SCORE_FIELDS: { key: keyof Pick<CoachEvaluation, 'skating_skills' | 'transitions' | 'performance' | 'choreography' | 'interpretation'>; label: string }[] = [
  { key: 'skating_skills', label: 'Skating Skills' },
  { key: 'transitions', label: 'Transitions' },
  { key: 'performance', label: 'Performance' },
  { key: 'choreography', label: 'Choreography' },
  { key: 'interpretation', label: 'Interpretation' },
]

type FormData = {
  skater: string
  coach: string
  evaluation_date: string
  skating_skills: number | null
  transitions: number | null
  performance: number | null
  choreography: number | null
  interpretation: number | null
  strengths: string
  areas_to_improve: string
  goals_next_period: string
  overall_notes: string
}

const EMPTY_FORM: FormData = {
  skater: '',
  coach: '',
  evaluation_date: new Date().toISOString().slice(0, 10),
  skating_skills: null,
  transitions: null,
  performance: null,
  choreography: null,
  interpretation: null,
  strengths: '',
  areas_to_improve: '',
  goals_next_period: '',
  overall_notes: '',
}

export default function CoachEvaluationsPage() {
  const { data: coaches = [], isLoading: coachesLoading } = useCoaches()
  const { data: skaterPages, isLoading: skatersLoading } = useSkaters(1, '')
  const skaters = skaterPages?.results ?? []
  const createEval = useCreateEvaluation()

  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [selectedSkater, setSelectedSkater] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const { data: pastEvals = [], isLoading: evalsLoading } = useEvaluations(
    selectedSkater ? { skater: selectedSkater } : {},
  )

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.skater || !form.coach || !form.evaluation_date) {
      setError('Skater, coach, and date are required.')
      return
    }
    try {
      await createEval.mutateAsync(form)
      setSubmitted(true)
      setForm(f => ({ ...EMPTY_FORM, skater: f.skater, coach: f.coach }))
      setTimeout(() => setSubmitted(false), 4000)
    } catch {
      setError('Failed to save evaluation. Please try again.')
    }
  }

  if (coachesLoading || skatersLoading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Evaluations</h1>
        <p className="text-slate-500 text-sm mt-0.5">Write a formal progress evaluation for a student.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3">New Evaluation</h2>

        {error && <ErrorAlert message={error} />}
        {submitted && (
          <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-lg px-4 py-3">
            Evaluation saved successfully.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Student *</label>
            <div className="relative">
              <select
                className={inputCls + ' appearance-none pr-8'}
                value={form.skater}
                onChange={e => {
                  set('skater', e.target.value)
                  setSelectedSkater(e.target.value)
                }}
                required
              >
                <option value="">Select student…</option>
                {skaters.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Coach *</label>
            <div className="relative">
              <select
                className={inputCls + ' appearance-none pr-8'}
                value={form.coach}
                onChange={e => set('coach', e.target.value)}
                required
              >
                <option value="">Select coach…</option>
                {coaches.map(c => (
                  <option key={c.id} value={c.id}>{c.user_name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Evaluation date *</label>
            <input
              type="date"
              className={inputCls}
              value={form.evaluation_date}
              onChange={e => set('evaluation_date', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Scores */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Scored Areas (1–5)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SCORE_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <StarRating
                  value={form[key]}
                  onChange={v => set(key, v === 0 ? null : v)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Text fields */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Strengths</label>
            <textarea
              className={inputCls + ' resize-y min-h-[80px]'}
              value={form.strengths}
              onChange={e => set('strengths', e.target.value)}
              placeholder="What is this skater doing well?"
            />
          </div>
          <div>
            <label className={labelCls}>Areas to Improve</label>
            <textarea
              className={inputCls + ' resize-y min-h-[80px]'}
              value={form.areas_to_improve}
              onChange={e => set('areas_to_improve', e.target.value)}
              placeholder="What should they focus on next?"
            />
          </div>
          <div>
            <label className={labelCls}>Goals for Next Period</label>
            <textarea
              className={inputCls + ' resize-y min-h-[80px]'}
              value={form.goals_next_period}
              onChange={e => set('goals_next_period', e.target.value)}
              placeholder="Specific goals to accomplish before the next evaluation."
            />
          </div>
          <div>
            <label className={labelCls}>Overall Notes</label>
            <textarea
              className={inputCls + ' resize-y min-h-[80px]'}
              value={form.overall_notes}
              onChange={e => set('overall_notes', e.target.value)}
              placeholder="Any other observations…"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={createEval.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            {createEval.isPending ? 'Saving…' : 'Save Evaluation'}
          </button>
        </div>
      </form>

      {/* Past evaluations for selected student */}
      {selectedSkater && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Past Evaluations for{' '}
            {skaters.find(s => s.id === selectedSkater)
              ? `${skaters.find(s => s.id === selectedSkater)!.first_name} ${skaters.find(s => s.id === selectedSkater)!.last_name}`
              : 'Student'}
          </h2>
          {evalsLoading ? (
            <LoadingSpinner />
          ) : pastEvals.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No evaluations yet for this student.</p>
          ) : (
            <div className="space-y-3">
              {pastEvals.map(ev => (
                <div key={ev.id} className="border border-slate-100 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {new Date(ev.evaluation_date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">by {ev.coach_name}</span>
                      {ev.average_score !== null && (
                        <span className="text-sm font-bold text-primary">
                          {ev.average_score.toFixed(1)}<span className="text-xs font-normal text-slate-400">/5</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['Skills', ev.skating_skills],
                      ['Trans.', ev.transitions],
                      ['Perf.', ev.performance],
                      ['Choreo.', ev.choreography],
                      ['Interp.', ev.interpretation],
                    ].map(([label, score]) =>
                      score !== null ? (
                        <span key={String(label)} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
                          {label}: {score}/5
                        </span>
                      ) : null,
                    )}
                  </div>
                  {ev.strengths && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      <span className="font-medium">Strengths:</span> {ev.strengths}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

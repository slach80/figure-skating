'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSkater } from '@/hooks/useSkaters'
import { useSkaterLevels, useUpsertSkaterLevel, useEvaluations } from '@/hooks/useProgress'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CompetitionHistory } from '@/components/skater/CompetitionHistory'
import {
  ArrowLeft, Trophy, User, MapPin, Phone, AlertTriangle,
  Calendar, RefreshCw, TrendingUp, ChevronDown, Check,
} from 'lucide-react'
import type { Discipline, SkaterLevelValue } from '@/types/scheduling'

const DISCIPLINES: { key: Discipline; label: string }[] = [
  { key: 'moves', label: 'Moves in the Field' },
  { key: 'freestyle', label: 'Freestyle' },
  { key: 'dance', label: 'Ice Dance' },
  { key: 'pairs', label: 'Pairs' },
]

const LEVEL_CHOICES: { value: SkaterLevelValue; label: string }[] = [
  { value: 'pre_alpha', label: 'Pre-Alpha' },
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
  { value: 'delta', label: 'Delta' },
  { value: 'pre_juvenile', label: 'Pre-Juvenile' },
  { value: 'juvenile', label: 'Juvenile' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'novice', label: 'Novice' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
]

const LEVEL_COLORS: Record<SkaterLevelValue, string> = {
  pre_alpha: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  alpha: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  beta: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  gamma: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  delta: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  pre_juvenile: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  juvenile: 'bg-lime-50 dark:bg-lime-950/40 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-800',
  intermediate: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  novice: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  junior: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  senior: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-400 text-xs">—</span>
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <div
          key={n}
          className={`w-4 h-4 rounded-full border ${n <= score ? 'bg-primary border-primary' : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}
        />
      ))}
      <span className="text-xs text-slate-500 ml-1">{score}/5</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}

function ProgressTab({ skaterId }: { skaterId: string }) {
  const { data: levels = [], isLoading } = useSkaterLevels(skaterId)
  const { data: evaluations = [], isLoading: evalsLoading } = useEvaluations({ skater: skaterId })
  const upsert = useUpsertSkaterLevel(skaterId)
  const [editing, setEditing] = useState<Discipline | null>(null)
  const [editValue, setEditValue] = useState<SkaterLevelValue>('pre_alpha')
  const [editDate, setEditDate] = useState('')
  const [editJudge, setEditJudge] = useState('')

  const levelMap = Object.fromEntries(levels.map(l => [l.discipline, l]))

  function startEdit(disc: Discipline) {
    const existing = levelMap[disc]
    setEditValue(existing?.level ?? 'pre_alpha')
    setEditDate(existing?.passed_date ?? '')
    setEditJudge(existing?.judge_name ?? '')
    setEditing(disc)
  }

  async function saveLevel() {
    if (!editing) return
    await upsert.mutateAsync({
      discipline: editing,
      level: editValue,
      passed_date: editDate || undefined,
      judge_name: editJudge,
    })
    setEditing(null)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Discipline grid */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          USFS Levels
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DISCIPLINES.map(({ key, label }) => {
            const lvl = levelMap[key]
            const isEditing = editing === key
            return (
              <div key={key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(key)}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      {lvl ? 'Edit' : 'Set'}
                    </button>
                  )}
                </div>

                {!isEditing && (
                  <div className="mt-2">
                    {lvl ? (
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${LEVEL_COLORS[lvl.level]}`}>
                          {lvl.level_display}
                        </span>
                        {lvl.passed_date && (
                          <p className="text-xs text-slate-400">
                            Passed {new Date(lvl.passed_date + 'T00:00:00').toLocaleDateString()}
                            {lvl.judge_name && ` · ${lvl.judge_name}`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not set</span>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div className="mt-3 space-y-2">
                    <div className="relative">
                      <select
                        value={editValue}
                        onChange={e => setEditValue(e.target.value as SkaterLevelValue)}
                        className="w-full rounded border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {LEVEL_CHOICES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      placeholder="Passed date"
                      className="w-full rounded border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="text"
                      value={editJudge}
                      onChange={e => setEditJudge(e.target.value)}
                      placeholder="Judge name (optional)"
                      className="w-full rounded border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveLevel}
                        disabled={upsert.isPending}
                        className="flex items-center gap-1 px-2.5 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Evaluations */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Coach Evaluations</h2>
        {evalsLoading ? (
          <LoadingSpinner />
        ) : evaluations.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No evaluations on record.</p>
        ) : (
          <div className="space-y-4">
            {evaluations.map(ev => (
              <div key={ev.id} className="border border-slate-100 dark:border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {new Date(ev.evaluation_date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-slate-500">by {ev.coach_name}</p>
                  </div>
                  {ev.average_score !== null && (
                    <span className="text-sm font-bold text-primary">
                      {ev.average_score.toFixed(1)}<span className="text-xs font-normal text-slate-400">/5 avg</span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    ['Skating Skills', ev.skating_skills],
                    ['Transitions', ev.transitions],
                    ['Performance', ev.performance],
                    ['Choreography', ev.choreography],
                    ['Interpretation', ev.interpretation],
                  ].map(([label, score]) => (
                    <div key={String(label)}>
                      <p className="text-slate-400 mb-1">{label}</p>
                      <ScoreBar score={score as number | null} />
                    </div>
                  ))}
                </div>
                {ev.strengths && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Strengths</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{ev.strengths}</p>
                  </div>
                )}
                {ev.areas_to_improve && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Areas to Improve</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{ev.areas_to_improve}</p>
                  </div>
                )}
                {ev.goals_next_period && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Goals</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{ev.goals_next_period}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SkaterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: skater, isLoading, error } = useSkater(id)
  const [tab, setTab] = useState<'profile' | 'progress' | 'competition'>('profile')

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorAlert message="Failed to load skater profile." />
  if (!skater) return null

  const fullName = skater.preferred_name
    ? `${skater.preferred_name} ${skater.last_name}`
    : `${skater.first_name} ${skater.last_name}`
  const dob = skater.date_of_birth
    ? new Date(skater.date_of_birth + 'T00:00:00').toLocaleDateString()
    : null

  const tabCls = (t: typeof tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-primary text-primary'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="flex items-center gap-3">
            {fullName}
            {skater.is_minor && (
              <span className="text-xs font-normal bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">Minor</span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">USFS #{skater.usfs_number || 'Not assigned'}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={skater.membership_status} />
          <Link
            href={`/dashboard/members/${id}/renew`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={14} />
            Renew
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 flex gap-0">
        <button className={tabCls('profile')} onClick={() => setTab('profile')}>Profile</button>
        <button className={tabCls('progress')} onClick={() => setTab('progress')}>Progress</button>
        <button className={tabCls('competition')} onClick={() => setTab('competition')}>
          <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" />Competition</span>
        </button>
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                <User className="w-4 h-4 text-slate-400" />
                Profile
              </h2>
              <dl>
                <InfoRow label="Full name" value={`${skater.first_name} ${skater.middle_name || ''} ${skater.last_name}`.replace(/\s+/g, ' ').trim()} />
                <InfoRow label="Preferred name" value={skater.preferred_name} />
                <InfoRow label="Date of birth" value={dob} />
                <InfoRow label="Gender" value={skater.gender || undefined} />
                <InfoRow label="Email" value={skater.email} />
                <InfoRow label="Phone" value={skater.phone} />
                <InfoRow label="USFS number" value={skater.usfs_number} />
                <InfoRow label="Name pronunciation" value={skater.name_pronunciation} />
              </dl>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                <MapPin className="w-4 h-4 text-slate-400" />
                Address
              </h2>
              <dl>
                <InfoRow label="Address" value={[skater.address_line1, skater.address_line2].filter(Boolean).join(', ')} />
                <InfoRow label="City / State / Zip" value={[skater.city, skater.state, skater.zip_code].filter(Boolean).join(', ')} />
              </dl>
            </div>

            {(skater.emergency_contact_name || skater.medical_notes) && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                  Emergency &amp; Medical
                </h2>
                <dl>
                  <InfoRow label="Emergency contact" value={skater.emergency_contact_name} />
                  <InfoRow label="Relationship" value={skater.emergency_contact_relation} />
                  <InfoRow label="Phone" value={skater.emergency_contact_phone} />
                  <InfoRow label="Medical notes" value={skater.medical_notes} />
                </dl>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                <Calendar className="w-4 h-4 text-slate-400" />
                Membership
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</dt>
                  <dd><StatusBadge status={skater.membership_status} /></dd>
                </div>
                {skater.membership_type_display && (
                  <div>
                    <dt className="text-xs text-slate-500 uppercase tracking-wide mb-1">Type</dt>
                    <dd className="text-sm text-slate-900 dark:text-slate-100">{skater.membership_type_display.name}</dd>
                  </div>
                )}
                {skater.membership_expiry && (
                  <div>
                    <dt className="text-xs text-slate-500 uppercase tracking-wide mb-1">Expires</dt>
                    <dd className="text-sm text-slate-900 dark:text-slate-100">{new Date(skater.membership_expiry).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
            </div>

            {skater.managed_by && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Guardian
                </h2>
                <p className="text-sm text-slate-900 dark:text-slate-100">{skater.managed_by}</p>
                {skater.managed_by_email && (
                  <p className="text-sm text-slate-500 mt-1">{skater.managed_by_email}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress tab */}
      {tab === 'progress' && <ProgressTab skaterId={id} />}

      {/* Competition tab */}
      {tab === 'competition' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            <Trophy className="w-4 h-4 text-slate-400" />
            Competition History
          </h2>
          <CompetitionHistory
            skaterId={id}
            skaterStatsSlug={skater.skater_stats_slug || null}
          />
        </div>
      )}
    </div>
  )
}

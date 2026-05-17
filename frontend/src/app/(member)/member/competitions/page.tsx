'use client'

import { useState } from 'react'
import { Trophy, Calendar, MapPin, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import {
  useCompetitions,
  useEventCategories,
  useCompetitionEntries,
  useCreateEntry,
  useScratchEntry,
} from '@/hooks/useCompetitions'
import type { Competition, EventCategory, CompetitionEntry } from '@/types/competition'

// ── Status helpers ────────────────────────────────────────────────────────────

const ENTRY_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  submitted: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-violet-100 text-violet-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  scratched: 'bg-red-100 text-red-500',
}

function EntryStatusBadge({ status }: { status: CompetitionEntry['status'] }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTRY_STATUS_STYLES[status] ?? 'bg-slate-100'}`}>
      {label}
    </span>
  )
}

// ── Competition card ──────────────────────────────────────────────────────────

function CompetitionCard({
  comp,
  skaterId,
}: {
  comp: Competition
  skaterId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [enteringCatId, setEnteringCatId] = useState<string | null>(null)
  const [scratchingId, setScratchingId] = useState<string | null>(null)

  const { data: categories = [] } = useEventCategories(comp.id)
  const { data: myEntries = [] } = useCompetitionEntries({ competition: comp.id, skater: skaterId })
  const createEntry = useCreateEntry()
  const scratchEntry = useScratchEntry()

  const enteredCatIds = new Set(myEntries.filter(e => e.status !== 'scratched').map(e => e.category))

  async function handleEnter(cat: EventCategory) {
    await createEntry.mutateAsync({
      competition: comp.id,
      category: cat.id,
      skater: skaterId,
    })
    setEnteringCatId(null)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="font-bold text-slate-900">{comp.name}</h2>
              {comp.is_late ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                  <Clock size={10} /> Late Entry
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <CheckCircle size={10} /> Open
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {new Date(comp.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' – '}
                {new Date(comp.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {comp.venue && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {[comp.city, comp.state].filter(Boolean).join(', ')}
                </span>
              )}
              {comp.entry_deadline && (
                <span className="flex items-center gap-1">
                  <AlertCircle size={11} />
                  Deadline: {new Date(comp.entry_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* My entries summary */}
        {myEntries.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">Your entries</p>
            <div className="space-y-1.5">
              {myEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 truncate">{entry.category_name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <EntryStatusBadge status={entry.status} />
                    {entry.status !== 'scratched' && (
                      <>
                        {scratchingId === entry.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                scratchEntry.mutate(entry.id)
                                setScratchingId(null)
                              }}
                              className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Confirm scratch
                            </button>
                            <button
                              onClick={() => setScratchingId(null)}
                              className="text-xs text-slate-500"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setScratchingId(entry.id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Scratch
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expanded: categories list */}
      {expanded && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Categories ({categories.length})
            </p>
            {categories.length === 0 ? (
              <p className="text-sm text-slate-400">No categories added yet.</p>
            ) : (
              <div className="space-y-2">
                {categories.map(cat => {
                  const isEntered = enteredCatIds.has(cat.id)
                  const isFull = cat.max_entries != null && cat.entry_count >= cat.max_entries

                  return (
                    <div key={cat.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{cat.name}</p>
                        <p className="text-xs text-slate-500">
                          {cat.discipline} · {cat.segment.replace('_', ' ')} · {cat.level}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Fee: ${(parseFloat(comp.base_entry_fee) + parseFloat(cat.additional_fee)).toFixed(2)}
                          {cat.max_entries != null && (
                            <> · {cat.entry_count}/{cat.max_entries} entered</>
                          )}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        {isEntered ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle size={12} /> Entered
                          </span>
                        ) : isFull ? (
                          <span className="text-xs text-slate-400">Full</span>
                        ) : enteringCatId === cat.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEnter(cat)}
                              disabled={createEntry.isPending}
                              className="text-xs px-3 py-1 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                            >
                              {createEntry.isPending ? 'Entering…' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setEnteringCatId(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEnteringCatId(cat.id)}
                            className="text-xs px-3 py-1 border border-primary text-primary rounded-lg hover:bg-primary/5"
                          >
                            Enter
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MemberCompetitionsPage() {
  const { data: skater } = useMemberProfile()
  const { data: openComps = [], isLoading } = useCompetitions({ is_published: true })
  const { data: myEntries = [] } = useCompetitionEntries(
    skater?.id ? { skater: skater.id } : { skater: '' }
  )

  const openCompetitions = openComps.filter(c => c.is_entry_open)
  const closedCompetitions = openComps.filter(c => !c.is_entry_open)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Competitions</h1>
        <p className="text-slate-500 text-sm mt-0.5">Enter upcoming competitions</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !skater && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Trophy className="mx-auto text-slate-300 mb-3" size={36} />
          <p className="text-slate-500">Loading profile…</p>
        </div>
      )}

      {!isLoading && skater && openCompetitions.length === 0 && closedCompetitions.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Trophy className="mx-auto text-slate-300 mb-3" size={36} />
          <p className="font-medium text-slate-700">No open competitions</p>
          <p className="text-sm text-slate-400 mt-1">Check back later for upcoming events.</p>
        </div>
      )}

      {skater && openCompetitions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Open for Entry</h2>
          <div className="space-y-4">
            {openCompetitions.map(comp => (
              <CompetitionCard key={comp.id} comp={comp} skaterId={skater.id} />
            ))}
          </div>
        </section>
      )}

      {skater && closedCompetitions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Upcoming (Closed)</h2>
          <div className="space-y-3">
            {closedCompetitions.map(comp => (
              <div key={comp.id} className="bg-white rounded-xl border border-slate-200 p-4 opacity-75">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="font-bold text-slate-800">{comp.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                    <AlertCircle size={10} /> Entry Closed
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(comp.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {(comp.city || comp.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {[comp.city, comp.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My entry history across all comps */}
      {myEntries.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">All My Entries</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {myEntries.map(entry => (
              <div key={entry.id} className={`flex items-center justify-between px-4 py-3 ${entry.status === 'scratched' ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{entry.competition_name}</p>
                  <p className="text-xs text-slate-500 truncate">{entry.category_name}</p>
                </div>
                <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                  {entry.placement != null && (
                    <span className="text-xs font-bold text-slate-700">#{entry.placement}</span>
                  )}
                  <EntryStatusBadge status={entry.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

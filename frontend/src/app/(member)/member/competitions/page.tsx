'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  ChevronRight,
  CheckCircle,
} from 'lucide-react'
import { useCompetitions, useMyEntries } from '@/hooks/useCompetitions'
import type { Competition, CompetitionEntry } from '@/types/competition'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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

// ── Competition card (open tab) ───────────────────────────────────────────────

function OpenCompetitionCard({ comp }: { comp: Competition }) {
  const router = useRouter()

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-slate-900">{comp.name}</h3>
            {comp.is_late ? (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                <Clock size={10} />
                LATE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                <CheckCircle size={10} />
                Open
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDateShort(comp.start_date)}
              {' – '}
              {formatDate(comp.end_date)}
            </span>
            {(comp.city || comp.state) && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {[comp.city, comp.state].filter(Boolean).join(', ')}
              </span>
            )}
            {comp.entry_deadline && (
              <span className="flex items-center gap-1">
                <AlertCircle size={11} />
                Deadline: {formatDate(comp.entry_deadline)}
              </span>
            )}
          </div>

          {comp.category_count > 0 && (
            <p className="text-xs text-slate-400 mt-1.5">
              {comp.category_count} {comp.category_count === 1 ? 'category' : 'categories'}
              {comp.entry_count > 0 && ` · ${comp.entry_count} entries`}
            </p>
          )}

          {comp.is_late && comp.late_fee && parseFloat(comp.late_fee) > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Late fee: +${parseFloat(comp.late_fee).toFixed(2)} per entry
            </p>
          )}
        </div>

        <button
          onClick={() => router.push(`/member/competitions/${comp.id}/enter`)}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Enter
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Competition card (closed/past tab) ───────────────────────────────────────

function ClosedCompetitionCard({ comp }: { comp: Competition }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 opacity-70">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <h3 className="font-bold text-slate-800">{comp.name}</h3>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
          <AlertCircle size={10} />
          Entry Closed
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {formatDate(comp.start_date)}
        </span>
        {(comp.city || comp.state) && (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {[comp.city, comp.state].filter(Boolean).join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}

// ── My Entries grouped by competition ────────────────────────────────────────

function MyEntriesSection({ entries }: { entries: CompetitionEntry[] }) {
  if (entries.length === 0) return null

  // Group by competition
  const grouped = new Map<string, { name: string; entries: CompetitionEntry[] }>()
  for (const e of entries) {
    const existing = grouped.get(e.competition)
    if (existing) {
      existing.entries.push(e)
    } else {
      grouped.set(e.competition, { name: e.competition_name, entries: [e] })
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        My Entries
      </h2>
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([compId, group]) => (
          <div key={compId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">{group.name}</p>
            </div>
            <div className="divide-y divide-slate-50">
              {group.entries.map(entry => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-4 py-2.5 ${entry.status === 'scratched' ? 'opacity-50' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate">{entry.category_name}</p>
                    {entry.skater_name && (
                      <p className="text-xs text-slate-400">{entry.skater_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-xs text-slate-500">${parseFloat(entry.total_fee).toFixed(2)}</span>
                    <EntryStatusBadge status={entry.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'open' | 'past'

function Tabs({
  active,
  onChange,
  openCount,
  pastCount,
}: {
  active: Tab
  onChange: (t: Tab) => void
  openCount: number
  pastCount: number
}) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
      {(['open', 'past'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-colors ${
            active === tab
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab === 'open' ? `Open (${openCount})` : `Upcoming / Past (${pastCount})`}
        </button>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MemberCompetitionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('open')

  const { data: allComps = [], isLoading } = useCompetitions({ is_published: true })
  const { data: myEntries = [] } = useMyEntries()

  const now = new Date()
  const openCompetitions = allComps.filter(c => c.is_entry_open)
  const closedCompetitions = allComps.filter(c => !c.is_entry_open)

  // Only show "past" tab for competitions that are actually in the past or have closed entry
  const pastCompetitions = closedCompetitions.filter(
    c => new Date(c.end_date) < now || !c.is_entry_open
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Competitions</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Enter upcoming competitions and track your entries
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <Tabs
            active={activeTab}
            onChange={setActiveTab}
            openCount={openCompetitions.length}
            pastCount={pastCompetitions.length}
          />

          {activeTab === 'open' && (
            <>
              {openCompetitions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <Trophy className="mx-auto text-slate-300 mb-3" size={36} />
                  <p className="font-medium text-slate-700">No open competitions</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Check back later for upcoming events.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openCompetitions.map(comp => (
                    <OpenCompetitionCard key={comp.id} comp={comp} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'past' && (
            <>
              {pastCompetitions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <Trophy className="mx-auto text-slate-300 mb-3" size={36} />
                  <p className="text-slate-500">No past competitions yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastCompetitions.map(comp => (
                    <ClosedCompetitionCard key={comp.id} comp={comp} />
                  ))}
                </div>
              )}
            </>
          )}

          <MyEntriesSection entries={myEntries} />
        </>
      )}
    </div>
  )
}

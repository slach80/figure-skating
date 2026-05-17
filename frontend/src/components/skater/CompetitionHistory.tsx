'use client'

import { useState } from 'react'
import { Pencil, Trophy, Loader2 } from 'lucide-react'
import { useSkaterStats, useSetSkaterStatsSlug } from '@/hooks/useSkaterStats'
import type { SkaterStatsHistory } from '@/types/skater-stats'

// ── Placement badge ──────────────────────────────────────────────────────────

function PlacementBadge({ placement }: { placement: string }) {
  if (placement === '1') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Trophy className="w-3 h-3" />
        1st
      </span>
    )
  }
  if (placement === '2') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 border border-slate-300">
        2nd
      </span>
    )
  }
  if (placement === '3') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
        3rd
      </span>
    )
  }
  return <span className="text-slate-700 text-sm">{placement}</span>
}

// ── History table ─────────────────────────────────────────────────────────────

function HistoryTable({ rows }: { rows: SkaterStatsHistory[] }) {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Date</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Competition</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Event</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Score</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700">Placement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                {item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-slate-900 font-medium">{item.competition}</td>
              <td className="px-4 py-3 text-slate-600">{item.event}</td>
              <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                {item.score != null ? item.score.toFixed(2) : '—'}
              </td>
              <td className="px-4 py-3 text-center">
                {item.placement ? <PlacementBadge placement={item.placement} /> : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Slug editor form ──────────────────────────────────────────────────────────

function SlugForm({
  skaterId,
  initialSlug,
  onCancel,
}: {
  skaterId: string
  initialSlug: string
  onCancel?: () => void
}) {
  const [value, setValue] = useState(initialSlug)
  const mutation = useSetSkaterStatsSlug(skaterId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. emma-anderson"
        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        disabled={mutation.isPending}
        autoFocus
      />
      <button
        type="submit"
        disabled={mutation.isPending || !value.trim()}
        className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Link
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      )}
      {mutation.isError && (
        <span className="text-xs text-red-600 ml-1">Failed to save.</span>
      )}
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface CompetitionHistoryProps {
  skaterId: string
  skaterStatsSlug: string | null
}

export function CompetitionHistory({ skaterId, skaterStatsSlug }: CompetitionHistoryProps) {
  const [editing, setEditing] = useState(false)
  const hasSlug = !!skaterStatsSlug && skaterStatsSlug.trim() !== ''

  const { data, isLoading, isError } = useSkaterStats(skaterId, hasSlug)

  // ── No slug set ──
  if (!hasSlug) {
    return (
      <div className="py-4">
        <p className="text-slate-500 text-sm mb-3">No competition history linked.</p>
        <SlugForm skaterId={skaterId} initialSlug="" />
      </div>
    )
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading competition history…
      </div>
    )
  }

  // ── Error / API down ──
  if (isError || !data) {
    return (
      <div className="py-4">
        <p className="text-slate-500 text-sm">Competition history temporarily unavailable.</p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit slug ({skaterStatsSlug})
          </button>
        )}
        {editing && (
          <div className="mt-3">
            <SlugForm skaterId={skaterId} initialSlug={skaterStatsSlug} onCancel={() => setEditing(false)} />
          </div>
        )}
      </div>
    )
  }

  // ── Success ──
  return (
    <div>
      {/* Stat chips + edit slug button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
            {data.totalCompetitions} competitions
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
            {data.totalEvents} events
          </span>
          {data.club && (
            <span className="text-slate-500 text-sm">{data.club}</span>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            title="Edit Skater-Stats slug"
          >
            <Pencil className="w-3 h-3" />
            Edit slug
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-4">
          <SlugForm
            skaterId={skaterId}
            initialSlug={skaterStatsSlug}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {data.history.length === 0 ? (
        <p className="text-slate-500 text-sm py-2">No competition history on record.</p>
      ) : (
        <HistoryTable rows={data.history} />
      )}
    </div>
  )
}

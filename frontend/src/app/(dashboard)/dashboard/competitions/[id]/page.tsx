'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, Download,
  Trophy, MapPin, Calendar, Clock, CheckCircle, AlertCircle,
} from 'lucide-react'
import {
  useCompetition,
  useEventCategories,
  useCreateEventCategory,
  useUpdateEventCategory,
  useDeleteEventCategory,
  useCompetitionEntries,
  useAcceptEntry,
  useScratchEntry,
  useSetEntryDraw,
  useRecordEntryResult,
  usePublishCompetition,
} from '@/hooks/useCompetitions'
import type { EventCategory, CompetitionEntry } from '@/types/competition'

// ── Status badge ─────────────────────────────────────────────────────────────

const ENTRY_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  submitted: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-violet-100 text-violet-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  scratched: 'bg-red-100 text-red-500 line-through',
}

function EntryStatusBadge({ status }: { status: CompetitionEntry['status'] }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTRY_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(entries: CompetitionEntry[]) {
  const headers = [
    'Skater', 'USFS#', 'Category', 'Coach', 'Status',
    'Entry Fee', 'Late', 'Music Title', 'Music Artist',
    'Draw#', 'Skating Order', 'Placement', 'Score',
  ]
  const rows = entries.map(e => [
    e.skater_name,
    e.skater_usfs,
    e.category_name,
    e.coach_name ?? '',
    e.status,
    e.entry_fee,
    e.is_late ? 'Yes' : 'No',
    e.music_title,
    e.music_artist,
    e.draw_number ?? '',
    e.skating_order ?? '',
    e.placement ?? '',
    e.score ?? '',
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `entries.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Category form ─────────────────────────────────────────────────────────────

const EMPTY_CAT = {
  name: '',
  discipline: 'singles' as EventCategory['discipline'],
  segment: 'free_skate',
  level: '',
  additional_fee: '0',
  max_entries: '',
}

function CategoryForm({
  competitionId,
  onDone,
  initial,
  catId,
}: {
  competitionId: string
  onDone: () => void
  initial?: typeof EMPTY_CAT
  catId?: string
}) {
  const [form, setForm] = useState(initial ?? EMPTY_CAT)
  const create = useCreateEventCategory()
  const update = useUpdateEventCategory()

  function set(field: keyof typeof EMPTY_CAT, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      competition: competitionId,
      additional_fee: form.additional_fee || '0',
      max_entries: form.max_entries ? Number(form.max_entries) : null,
    }
    if (catId) {
      await update.mutateAsync({ id: catId, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onDone()
  }

  const isPending = create.isPending || update.isPending

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category Name *</label>
          <input
            required
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm"
            placeholder="Pre-Juvenile Ladies Free Skate"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Discipline</label>
          <select
            value={form.discipline}
            onChange={e => set('discipline', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm"
          >
            <option value="singles">Singles</option>
            <option value="pairs">Pairs</option>
            <option value="dance">Ice Dance</option>
            <option value="synchronized">Synchronized</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Segment</label>
          <select
            value={form.segment}
            onChange={e => set('segment', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm"
          >
            <option value="free_skate">Free Skate</option>
            <option value="short_program">Short Program</option>
            <option value="moves">Moves in the Field</option>
            <option value="pattern">Pattern Dance</option>
            <option value="rhythm_dance">Rhythm Dance</option>
            <option value="free_dance">Free Dance</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Level *</label>
          <input
            required
            value={form.level}
            onChange={e => set('level', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm"
            placeholder="Pre-Juvenile"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Additional Fee ($)</label>
          <input
            type="number" min="0" step="0.01"
            value={form.additional_fee}
            onChange={e => set('additional_fee', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Max Entries</label>
          <input
            type="number" min="1"
            value={form.max_entries}
            onChange={e => set('max_entries', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm"
            placeholder="No limit"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded hover:bg-white dark:hover:bg-slate-800">
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:opacity-90 disabled:opacity-50">
          {isPending ? 'Saving…' : catId ? 'Update' : 'Add Category'}
        </button>
      </div>
    </form>
  )
}

// ── Entry row actions ─────────────────────────────────────────────────────────

function DrawInput({ entry }: { entry: CompetitionEntry }) {
  const [editing, setEditing] = useState(false)
  const [draw, setDraw] = useState(String(entry.draw_number ?? ''))
  const [order, setOrder] = useState(String(entry.skating_order ?? ''))
  const setDrawMutation = useSetEntryDraw()

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-slate-400 hover:text-slate-700 dark:hover:dark:text-slate-300 tabular-nums"
      >
        {entry.draw_number != null ? `#${entry.draw_number}` : '—'}
        {entry.skating_order != null ? ` / ${entry.skating_order}` : ''}
      </button>
    )
  }

  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        value={draw}
        onChange={e => setDraw(e.target.value)}
        className="w-12 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-xs text-center"
        placeholder="Draw"
      />
      <input
        type="number"
        value={order}
        onChange={e => setOrder(e.target.value)}
        className="w-12 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-xs text-center"
        placeholder="Order"
      />
      <button
        onClick={async () => {
          await setDrawMutation.mutateAsync({
            id: entry.id,
            draw_number: draw ? Number(draw) : undefined,
            skating_order: order ? Number(order) : undefined,
          })
          setEditing(false)
        }}
        className="p-0.5 text-emerald-600 hover:text-emerald-800"
      >
        <Check size={13} />
      </button>
      <button onClick={() => setEditing(false)} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-400">
        <X size={13} />
      </button>
    </span>
  )
}

function ResultInput({ entry }: { entry: CompetitionEntry }) {
  const [editing, setEditing] = useState(false)
  const [placement, setPlacement] = useState(String(entry.placement ?? ''))
  const [score, setScore] = useState(entry.score ?? '')
  const recordResult = useRecordEntryResult()

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-slate-400 hover:text-slate-700 dark:hover:dark:text-slate-300 tabular-nums"
      >
        {entry.placement != null ? `${entry.placement}${ordinalSuffix(entry.placement)}` : '—'}
        {entry.score != null ? ` (${entry.score})` : ''}
      </button>
    )
  }

  return (
    <span className="flex items-center gap-1 flex-wrap">
      <input
        type="number"
        value={placement}
        onChange={e => setPlacement(e.target.value)}
        className="w-12 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-xs text-center"
        placeholder="Place"
      />
      <input
        type="text"
        value={score}
        onChange={e => setScore(e.target.value)}
        className="w-16 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-xs text-center"
        placeholder="Score"
      />
      <button
        onClick={async () => {
          await recordResult.mutateAsync({
            id: entry.id,
            placement: placement ? Number(placement) : undefined,
            score: score || undefined,
            result_notes: entry.result_notes,
          })
          setEditing(false)
        }}
        className="p-0.5 text-emerald-600 hover:text-emerald-800"
      >
        <Check size={13} />
      </button>
      <button onClick={() => setEditing(false)} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-400">
        <X size={13} />
      </button>
    </span>
  )
}

function ordinalSuffix(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [showCatForm, setShowCatForm] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)

  const { data: comp, isLoading: loadingComp } = useCompetition(id)
  const { data: categories = [], isLoading: loadingCats } = useEventCategories(id)
  const { data: entries = [], isLoading: loadingEntries } = useCompetitionEntries({ competition: id })

  const deleteCategory = useDeleteEventCategory()
  const acceptEntry = useAcceptEntry()
  const scratchEntry = useScratchEntry()
  const publishComp = usePublishCompetition()

  if (loadingComp || !comp) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">{loadingComp ? 'Loading…' : 'Competition not found.'}</p>
      </div>
    )
  }

  const editingCat = categories.find(c => c.id === editingCatId)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + title */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/dashboard/competitions')}
          className="mt-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:dark:bg-slate-800 text-slate-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">{comp.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              comp.comp_type === 'home' ? 'bg-primary/10 text-primary' : 'bg-sky-100 text-sky-700'
            }`}>
              {comp.comp_type === 'home' ? 'Home' : 'Away'}
            </span>
            {!comp.is_published && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center gap-1">
                <Clock size={11} /> Draft
              </span>
            )}
            {comp.is_published && comp.is_entry_open && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle size={11} /> Open
              </span>
            )}
            {comp.is_published && !comp.is_entry_open && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle size={11} /> Closed
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {new Date(comp.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              {' – '}
              {new Date(comp.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            {comp.venue && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {[comp.venue, comp.city, comp.state].filter(Boolean).join(', ')}
              </span>
            )}
            {comp.sanction_number && <span>Sanction #{comp.sanction_number}</span>}
            {comp.entry_deadline && (
              <span className="flex items-center gap-1">
                <Clock size={13} />
                Deadline: {new Date(comp.entry_deadline).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {!comp.is_published && (
          <button
            onClick={() => publishComp.mutate(id)}
            disabled={publishComp.isPending}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <Trophy size={14} /> Publish
          </button>
        )}
      </div>

      {/* Categories section */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Event Categories</h2>
          <button
            onClick={() => { setShowCatForm(v => !v); setEditingCatId(null) }}
            className="flex items-center gap-1 text-sm text-primary hover:opacity-80"
          >
            <Plus size={15} /> Add Category
          </button>
        </div>

        {showCatForm && !editingCatId && (
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <CategoryForm
              competitionId={id}
              onDone={() => setShowCatForm(false)}
            />
          </div>
        )}

        {loadingCats ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">No categories yet. Add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2.5">Category</th>
                <th className="text-left px-3 py-2.5">Discipline</th>
                <th className="text-left px-3 py-2.5">Level</th>
                <th className="text-left px-3 py-2.5">Segment</th>
                <th className="text-right px-3 py-2.5">+Fee</th>
                <th className="text-right px-3 py-2.5">Entries</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {categories.map(cat => (
                <>
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{cat.name}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-400 capitalize">{cat.discipline}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-400">{cat.level}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{cat.segment.replace('_', ' ')}</td>
                    <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-400">${cat.additional_fee}</td>
                    <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-400">
                      {cat.entry_count}
                      {cat.max_entries != null && <span className="text-slate-400">/{cat.max_entries}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditingCatId(cat.id); setShowCatForm(false) }}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete category "${cat.name}"?`)) {
                              deleteCategory.mutate({ id: cat.id, competitionId: id })
                            }
                          }}
                          className="p-1 rounded hover:bg-red-50 dark:hover:dark:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingCatId === cat.id && editingCat && (
                    <tr key={`edit-${cat.id}`}>
                      <td colSpan={7} className="px-5 py-3">
                        <CategoryForm
                          competitionId={id}
                          catId={cat.id}
                          initial={{
                            name: editingCat.name,
                            discipline: editingCat.discipline,
                            segment: editingCat.segment,
                            level: editingCat.level,
                            additional_fee: editingCat.additional_fee,
                            max_entries: editingCat.max_entries != null ? String(editingCat.max_entries) : '',
                          }}
                          onDone={() => setEditingCatId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Entries section */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Entries</h2>
            <p className="text-xs text-slate-400 mt-0.5">{comp.entry_count} confirmed · {entries.length} total</p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={() => exportCsv(entries)}
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>

        {loadingEntries ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-2.5">Skater</th>
                  <th className="text-left px-3 py-2.5">USFS#</th>
                  <th className="text-left px-3 py-2.5">Category</th>
                  <th className="text-left px-3 py-2.5">Coach</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-right px-3 py-2.5">Fee</th>
                  <th className="text-left px-3 py-2.5">Music</th>
                  <th className="text-left px-3 py-2.5">Draw/Order</th>
                  <th className="text-left px-3 py-2.5">Placement</th>
                  <th className="px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {entries.map(entry => (
                  <tr key={entry.id} className={`hover:bg-slate-50 dark:hover:bg-slate-900 ${entry.status === 'scratched' ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{entry.skater_name}</td>
                    <td className="px-3 py-3 text-slate-500 tabular-nums">{entry.skater_usfs || '—'}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={entry.category_name}>
                      {entry.category_name}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{entry.coach_name ?? '—'}</td>
                    <td className="px-3 py-3">
                      <EntryStatusBadge status={entry.status} />
                      {entry.is_late && <span className="ml-1 text-xs text-amber-600">late</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-400 tabular-nums">${entry.total_fee}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs max-w-[120px] truncate">
                      {entry.music_title || '—'}
                    </td>
                    <td className="px-3 py-3">
                      <DrawInput entry={entry} />
                    </td>
                    <td className="px-3 py-3">
                      <ResultInput entry={entry} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {entry.status !== 'accepted' && entry.status !== 'scratched' && (
                          <button
                            onClick={() => acceptEntry.mutate(entry.id)}
                            title="Accept"
                            className="p-1 rounded hover:bg-emerald-50 dark:hover:dark:bg-emerald-950/40 text-slate-400 hover:text-emerald-600"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {entry.status !== 'scratched' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Scratch ${entry.skater_name} from ${entry.category_name}?`)) {
                                scratchEntry.mutate(entry.id)
                              }
                            }}
                            title="Scratch"
                            className="p-1 rounded hover:bg-red-50 dark:hover:dark:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

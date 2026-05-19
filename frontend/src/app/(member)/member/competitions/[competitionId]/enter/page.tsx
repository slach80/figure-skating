'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Trophy,
  Loader2,
} from 'lucide-react'
import { AxiosError } from 'axios'
import { useCompetition, useEventCategories, useCreateEntry } from '@/hooks/useCompetitions'
import { useMySkaters } from '@/hooks/useSkaters'
import type { Competition, EventCategory, CompetitionEntry } from '@/types/competition'
import type { SkaterDetail } from '@/types/skater'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EntryResult {
  categoryId: string
  categoryName: string
  status: 'success' | 'error'
  entry?: CompetitionEntry
  error?: string
}

// ── Step indicator ────────────────────────────────────────────────────────────

interface StepIndicatorProps {
  step: number
}

function StepIndicator({ step }: StepIndicatorProps) {
  const steps = ['Select Skater', 'Select Categories', 'Review & Submit']
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const num = i + 1
        const active = num === step
        const done = num < step
        return (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                done
                  ? 'bg-emerald-500 text-white'
                  : active
                  ? 'bg-primary text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              {done ? <CheckCircle size={14} /> : num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                active ? 'text-slate-900 dark:text-slate-100' : done ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Select Skater ─────────────────────────────────────────────────────

interface Step1Props {
  skaters: SkaterDetail[]
  selectedSkater: SkaterDetail | null
  onSelect: (s: SkaterDetail) => void
  onNext: () => void
}

function Step1SelectSkater({ skaters, selectedSkater, onSelect, onNext }: Step1Props) {
  if (skaters.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto text-slate-300 mb-3" size={36} />
        <p className="font-medium text-slate-700 dark:text-slate-300">No skater profiles found</p>
        <p className="text-sm text-slate-400 mt-1">
          Please contact club staff to set up your skater profile.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Who is entering?</h2>
      <div className="space-y-2">
        {skaters.map(skater => {
          const selected = selectedSkater?.id === skater.id
          return (
            <button
              key={skater.id}
              onClick={() => onSelect(skater)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    selected ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {skater.first_name[0]}
                  {skater.last_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {skater.first_name} {skater.last_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {skater.usfs_number ? `USFS #${skater.usfs_number}` : 'No USFS number'}
                    {' · '}
                    <span
                      className={
                        skater.membership_status === 'active'
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }
                    >
                      {skater.membership_status}
                    </span>
                  </p>
                </div>
                {selected && <CheckCircle size={18} className="text-primary flex-shrink-0" />}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!selectedSkater}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Next: Select Categories
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Select Categories ─────────────────────────────────────────────────

interface Step2Props {
  competition: Competition
  categories: EventCategory[]
  selectedIds: Set<string>
  existingEntryIds: Set<string>
  onToggle: (id: string) => void
  onBack: () => void
  onNext: () => void
}

const DISCIPLINE_LABELS: Record<string, string> = {
  singles: 'Singles',
  pairs: 'Pairs',
  dance: 'Ice Dance',
  synchronized: 'Synchronized Skating',
}

const SEGMENT_LABELS: Record<string, string> = {
  free_skate: 'Free Skate',
  short_program: 'Short Program',
  moves: 'Moves in the Field',
  pattern: 'Pattern Dance',
  rhythm_dance: 'Rhythm Dance',
  free_dance: 'Free Dance',
}

function disciplineLabel(d: string) {
  return DISCIPLINE_LABELS[d] ?? d
}

function segmentLabel(s: string) {
  return SEGMENT_LABELS[s] ?? s
}

function Step2SelectCategories({
  competition,
  categories,
  selectedIds,
  existingEntryIds,
  onToggle,
  onBack,
  onNext,
}: Step2Props) {
  const baseEntryFee = parseFloat(competition.base_entry_fee)
  const lateFee = parseFloat(competition.late_fee)
  const isLate = competition.is_late

  const runningTotal = Array.from(selectedIds).reduce((acc, id) => {
    const cat = categories.find(c => c.id === id)
    if (!cat) return acc
    return acc + baseEntryFee + parseFloat(cat.additional_fee) + (isLate ? lateFee : 0)
  }, 0)

  // Group by discipline
  const grouped = useMemo(() => {
    const map = new Map<string, EventCategory[]>()
    for (const cat of categories) {
      const disc = cat.discipline
      const list = map.get(disc)
      if (list) list.push(cat)
      else map.set(disc, [cat])
    }
    return map
  }, [categories])

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="mx-auto text-slate-300 mb-3" size={36} />
        <p className="font-medium text-slate-700 dark:text-slate-300">No categories available</p>
        <p className="text-sm text-slate-400 mt-1">
          Categories have not been added to this competition yet.
        </p>
        <button
          onClick={onBack}
          className="mt-4 flex items-center gap-2 mx-auto text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">Select categories to enter</h2>
      <p className="text-sm text-slate-500 mb-4">
        Base entry fee: ${baseEntryFee.toFixed(2)} per event
        {isLate && lateFee > 0 && (
          <span className="text-amber-600"> + ${lateFee.toFixed(2)} late fee each</span>
        )}
      </p>

      {isLate && (
        <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <Clock size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            The standard entry deadline has passed. A late fee of $
            {lateFee.toFixed(2)} will be added to each entry.
          </span>
        </div>
      )}

      <div className="space-y-5">
        {Array.from(grouped.entries()).map(([discipline, cats]) => (
          <div key={discipline}>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              {disciplineLabel(discipline)}
            </p>
            <div className="space-y-1.5">
              {cats.map(cat => {
                const alreadyEntered = existingEntryIds.has(cat.id)
                const isFull =
                  cat.max_entries != null && cat.entry_count >= cat.max_entries && !alreadyEntered
                const checked = selectedIds.has(cat.id)
                const disabled = alreadyEntered || isFull
                const catFee = baseEntryFee + parseFloat(cat.additional_fee) + (isLate ? lateFee : 0)

                return (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      disabled
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 cursor-not-allowed opacity-60'
                        : checked
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked || alreadyEntered}
                      disabled={disabled}
                      onChange={() => !disabled && onToggle(cat.id)}
                      className="w-4 h-4 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
                        {alreadyEntered && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-400 font-medium">
                            Already entered
                          </span>
                        )}
                        {isFull && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Full
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {segmentLabel(cat.segment)}{cat.level ? ` · ${cat.level}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
                      ${catFee.toFixed(2)}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Running total */}
      {selectedIds.size > 0 && (
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {selectedIds.size} {selectedIds.size === 1 ? 'event' : 'events'} selected
          </span>
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">
            Total: ${runningTotal.toFixed(2)}
          </span>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={selectedIds.size === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Review Entries
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Review & Submit ───────────────────────────────────────────────────

interface Step3Props {
  competition: Competition
  skater: SkaterDetail
  selectedCategories: EventCategory[]
  results: EntryResult[] | null
  isSubmitting: boolean
  onBack: () => void
  onSubmit: () => void
}

function Step3ReviewSubmit({
  competition,
  skater,
  selectedCategories,
  results,
  isSubmitting,
  onBack,
  onSubmit,
}: Step3Props) {
  const router = useRouter()
  const baseEntryFee = parseFloat(competition.base_entry_fee)
  const lateFee = parseFloat(competition.late_fee)
  const isLate = competition.is_late

  const total = selectedCategories.reduce((acc, cat) => {
    return acc + baseEntryFee + parseFloat(cat.additional_fee) + (isLate ? lateFee : 0)
  }, 0)

  // Confirmation screen after submission
  if (results !== null) {
    const succeeded = results.filter(r => r.status === 'success')
    const failed = results.filter(r => r.status === 'error')

    return (
      <div>
        <div className="text-center mb-6">
          {failed.length === 0 ? (
            <>
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={28} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Entries Submitted!</h2>
              <p className="text-sm text-slate-500 mt-1">
                Your entries have been submitted for {competition.name}.
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={28} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Partially Submitted</h2>
              <p className="text-sm text-slate-500 mt-1">
                {succeeded.length} of {results.length} entries were submitted successfully.
              </p>
            </>
          )}
        </div>

        {succeeded.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
              Submitted
            </p>
            <div className="space-y-1.5">
              {succeeded.map(r => (
                <div
                  key={r.categoryId}
                  className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg"
                >
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{r.categoryName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {failed.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
              Failed
            </p>
            <div className="space-y-1.5">
              {failed.map(r => (
                <div
                  key={r.categoryId}
                  className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg"
                >
                  <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{r.categoryName}</p>
                    {r.error && <p className="text-xs text-red-500 mt-0.5">{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => router.push('/member/competitions')}
          className="w-full mt-4 py-2.5 bg-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          View My Entries
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Review your entries</h2>

      {isLate && (
        <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <Clock size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Late entries include a ${lateFee.toFixed(2)} late fee per event.
          </span>
        </div>
      )}

      {/* Skater */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 mb-4">
        <p className="text-xs text-slate-500 mb-0.5">Skater</p>
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          {skater.first_name} {skater.last_name}
        </p>
        {skater.usfs_number && (
          <p className="text-xs text-slate-500">USFS #{skater.usfs_number}</p>
        )}
      </div>

      {/* Entries table */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-right px-3 py-2">Base</th>
              {isLate && <th className="text-right px-3 py-2 text-amber-600">Late</th>}
              <th className="text-right px-3 py-2">Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {selectedCategories.map(cat => {
              const catFee = baseEntryFee + parseFloat(cat.additional_fee)
              const total = catFee + (isLate ? lateFee : 0)
              return (
                <tr key={cat.id}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{cat.name}</td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    ${catFee.toFixed(2)}
                  </td>
                  {isLate && (
                    <td className="px-3 py-2 text-right text-amber-600">
                      +${lateFee.toFixed(2)}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                    ${total.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <td
                colSpan={isLate ? 3 : 2}
                className="px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 text-right"
              >
                Total
              </td>
              <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                ${total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit {selectedCategories.length} {selectedCategories.length === 1 ? 'Entry' : 'Entries'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Main wizard page ──────────────────────────────────────────────────────────

export default function CompetitionEnterPage() {
  const params = useParams()
  const router = useRouter()
  const competitionId = typeof params.competitionId === 'string' ? params.competitionId : ''

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedSkater, setSelectedSkater] = useState<SkaterDetail | null>(null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [entryResults, setEntryResults] = useState<EntryResult[] | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: competition, isLoading: loadingComp } = useCompetition(competitionId)
  const { data: categories = [], isLoading: loadingCats } = useEventCategories(competitionId)
  const { data: mySkaters = [], isLoading: loadingSkaters } = useMySkaters()
  const createEntry = useCreateEntry()

  // Find categories the selected skater is already entered in (not scratched)
  // We infer this from the entry list embedded on the category entry_count,
  // but we need the actual entry list. We'll fetch it lazily via useCompetitionEntries
  // inside Step2 would require passing it down — instead we pass it as a Set from parent.
  // Since we don't fetch per-skater entries here, we start with an empty set and
  // the backend will reject duplicates with a clear error in Step 3 if needed.
  // (The category card will show "Already entered" based on the my/ endpoint on the list page.)
  const existingEntryIds = useMemo<Set<string>>(() => new Set(), [])

  const isLoading = loadingComp || loadingCats || loadingSkaters

  function toggleCategory(id: string) {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedCategories = useMemo(
    () => categories.filter(c => selectedCategoryIds.has(c.id)),
    [categories, selectedCategoryIds]
  )

  async function handleSubmit() {
    if (!competition || !selectedSkater) return
    setIsSubmitting(true)

    const results: EntryResult[] = []
    for (const cat of selectedCategories) {
      try {
        const entry = await createEntry.mutateAsync({
          competition: competition.id,
          category: cat.id,
          skater: selectedSkater.id,
        })
        results.push({ categoryId: cat.id, categoryName: cat.name, status: 'success', entry })
      } catch (err) {
        let message = 'Submission failed'
        if (err instanceof AxiosError) {
          const data = err.response?.data as Record<string, unknown> | undefined
          if (data) {
            if (typeof data['error'] === 'string') message = data['error']
            else if (typeof data['detail'] === 'string') message = data['detail']
            else {
              // Try to extract first field error
              const firstVal = Object.values(data)[0]
              if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') {
                message = firstVal[0]
              }
            }
          }
        }
        results.push({ categoryId: cat.id, categoryName: cat.name, status: 'error', error: message })
      }
    }

    setEntryResults(results)
    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Competition not found.</p>
        <button
          onClick={() => router.push('/member/competitions')}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Back to competitions
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push('/member/competitions')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4"
      >
        <ArrowLeft size={14} />
        All competitions
      </button>

      {/* Competition header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{competition.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date(competition.start_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          {competition.venue && ` · ${competition.venue}`}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        {/* Only show step indicator when not on confirmation screen */}
        {entryResults === null && <StepIndicator step={step} />}

        {step === 1 && entryResults === null && (
          <Step1SelectSkater
            skaters={mySkaters}
            selectedSkater={selectedSkater}
            onSelect={setSelectedSkater}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && entryResults === null && (
          <Step2SelectCategories
            competition={competition}
            categories={categories}
            selectedIds={selectedCategoryIds}
            existingEntryIds={existingEntryIds}
            onToggle={toggleCategory}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <Step3ReviewSubmit
            competition={competition}
            skater={selectedSkater!}
            selectedCategories={selectedCategories}
            results={entryResults}
            isSubmitting={isSubmitting}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}

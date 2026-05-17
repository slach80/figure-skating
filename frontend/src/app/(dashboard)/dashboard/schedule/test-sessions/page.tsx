'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  ClipboardList,
} from 'lucide-react'
import {
  useTestSessions,
  useCreateTestSession,
  useTestRegistrations,
  useRecordTestResult,
} from '@/hooks/useScheduling'
import type { TestSession, TestRegistration } from '@/types/scheduling'
import { TEST_TYPE_LABELS } from '@/types/scheduling'

// ── Result badge ──────────────────────────────────────────────────────────────

const RESULT_STYLES: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-700',
  pass: 'bg-emerald-100 text-emerald-700',
  retry: 'bg-amber-100 text-amber-700',
  scratch: 'bg-slate-100 text-slate-500 line-through',
}

const RESULT_LABELS: Record<string, string> = {
  registered: 'Registered',
  pass: 'Pass',
  retry: 'Retry',
  scratch: 'Scratched',
}

function ResultBadge({ result }: { result: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RESULT_STYLES[result] ?? 'bg-slate-100 text-slate-600'}`}>
      {RESULT_LABELS[result] ?? result}
    </span>
  )
}

// ── Registration row ──────────────────────────────────────────────────────────

function RegistrationRow({ reg }: { reg: TestRegistration }) {
  const recordResult = useRecordTestResult()
  const [result, setResult] = useState<TestRegistration['result']>(reg.result)

  function handleResultChange(newResult: string) {
    const typed = newResult as TestRegistration['result']
    setResult(typed)
    recordResult.mutate({ id: reg.id, result: typed })
  }

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-2.5">
        <p className="text-sm font-medium text-slate-800">{reg.skater_name}</p>
        <p className="text-xs text-slate-500">{reg.skater_usfs || '—'}</p>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap gap-1">
          {reg.test_types.map(t => (
            <span key={t} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {TEST_TYPE_LABELS[t] ?? t}
              {reg.test_levels[t] ? ` — ${reg.test_levels[t]}` : ''}
            </span>
          ))}
          {reg.test_types.length === 0 && <span className="text-xs text-slate-400">—</span>}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <ResultBadge result={result} />
      </td>
      <td className="px-4 py-2.5">
        <select
          value={result}
          onChange={e => handleResultChange(e.target.value)}
          disabled={recordResult.isPending}
          className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-700 disabled:opacity-50"
        >
          <option value="registered">Registered</option>
          <option value="pass">Pass</option>
          <option value="retry">Retry</option>
          <option value="scratch">Scratch</option>
        </select>
      </td>
    </tr>
  )
}

// ── Session roster (expanded panel) ──────────────────────────────────────────

function SessionRoster({ session }: { session: TestSession }) {
  const { data: registrations = [], isLoading } = useTestRegistrations(session.id)

  if (isLoading) {
    return <p className="px-6 py-4 text-sm text-slate-500">Loading roster…</p>
  }

  if (registrations.length === 0) {
    return (
      <div className="px-6 py-6 text-center text-slate-400 text-sm">
        No registrations yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-y border-slate-200">
          <tr>
            {['Skater', 'Tests', 'Result', 'Record Result'].map(h => (
              <th key={h} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registrations.map(reg => (
            <RegistrationRow key={reg.id} reg={reg} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: TestSession }) {
  const [expanded, setExpanded] = useState(false)

  const dateLabel = new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Card header — clickable to expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-slate-900">{session.name}</h3>
              {session.is_registration_open ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Open</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Closed</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-500">
              <span>{dateLabel}</span>
              {session.location && <span>{session.location}</span>}
              {session.judge_name && <span>Judge: {session.judge_name}</span>}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">
                {session.registration_count} / {session.max_registrations}
              </p>
              <p className="text-xs text-slate-400">registrations</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">${session.fee_per_test}</p>
              <p className="text-xs text-slate-400">per test</p>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <ClipboardList size={15} />
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>

        {/* Test types chips */}
        {session.test_types.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {session.test_types.map(t => (
              <span key={t} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {TEST_TYPE_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        )}

        {/* Deadline */}
        {session.registration_deadline && (
          <p className="mt-1 text-xs text-slate-400">
            Registration deadline: {new Date(session.registration_deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </button>

      {/* Expanded roster */}
      {expanded && (
        <div className="border-t border-slate-200">
          <SessionRoster session={session} />
        </div>
      )}
    </div>
  )
}

// ── New session form ──────────────────────────────────────────────────────────

interface FormState {
  name: string
  date: string
  location: string
  judge_name: string
  test_types: string[]
  fee_per_test: string
  registration_deadline: string
  max_registrations: number
  is_open: boolean
  notes: string
}

const BLANK_FORM: FormState = {
  name: '',
  date: '',
  location: '',
  judge_name: '',
  test_types: [],
  fee_per_test: '0.00',
  registration_deadline: '',
  max_registrations: 50,
  is_open: true,
  notes: '',
}

function NewSessionForm({ onDone }: { onDone: () => void }) {
  const create = useCreateTestSession()
  const [form, setForm] = useState<FormState>({ ...BLANK_FORM })

  function toggleTestType(type: string) {
    setForm(f => ({
      ...f,
      test_types: f.test_types.includes(type)
        ? f.test_types.filter(t => t !== type)
        : [...f.test_types, type],
    }))
  }

  function save() {
    if (!form.name || !form.date) return
    const payload: Partial<TestSession> = {
      ...form,
      registration_deadline: form.registration_deadline || null,
    }
    create.mutate(payload, {
      onSuccess: () => {
        setForm({ ...BLANK_FORM })
        onDone()
      },
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">New Test Session</h3>
        <button onClick={onDone} className="text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Session Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Spring 2026 Test Session"
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Registration deadline */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Registration Deadline</label>
          <input
            type="date"
            value={form.registration_deadline}
            onChange={e => setForm(f => ({ ...f, registration_deadline: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="Rink name or address"
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Judge */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Judge Name</label>
          <input
            type="text"
            value={form.judge_name}
            onChange={e => setForm(f => ({ ...f, judge_name: e.target.value }))}
            placeholder="Full name"
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Fee per test */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fee Per Test ($)</label>
          <input
            type="text"
            value={form.fee_per_test}
            onChange={e => setForm(f => ({ ...f, fee_per_test: e.target.value }))}
            placeholder="0.00"
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Max registrations */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Max Registrations</label>
          <input
            type="number"
            value={form.max_registrations}
            onChange={e => setForm(f => ({ ...f, max_registrations: Number(e.target.value) }))}
            min={1}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Test types */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-2">Test Types Offered</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TEST_TYPE_LABELS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.test_types.includes(value)}
                  onChange={() => toggleTestType(value)}
                  className="rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Any additional information for skaters…"
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* is_open toggle */}
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_open}
              onChange={e => setForm(f => ({ ...f, is_open: e.target.checked }))}
              className="rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-slate-700">Open for registration</span>
          </label>
        </div>
      </div>

      {create.isError && (
        <p className="text-sm text-red-600">Failed to create session. Please try again.</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onDone}
          className="px-4 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={create.isPending || !form.name || !form.date}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          <Check size={15} />
          {create.isPending ? 'Saving…' : 'Create Session'}
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TestSessionsPage() {
  const { data: sessions = [], isLoading } = useTestSessions()
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/schedule" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Test Sessions</h1>
            <p className="text-slate-500 text-sm mt-0.5">Schedule USFS test sessions and manage registrations</p>
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          disabled={adding}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={15} /> New Test Session
        </button>
      </div>

      {/* New session form */}
      {adding && <NewSessionForm onDone={() => setAdding(false)} />}

      {/* Session list */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500">
          Loading test sessions…
        </div>
      ) : sessions.length === 0 && !adding ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <ClipboardList className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="text-slate-500">No test sessions yet.</p>
          <button
            onClick={() => setAdding(true)}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Create your first test session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}

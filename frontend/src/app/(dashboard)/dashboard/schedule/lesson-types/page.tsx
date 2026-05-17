'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Check, X } from 'lucide-react'
import {
  useLessonTypes,
  useCreateLessonType,
  useUpdateLessonType,
} from '@/hooks/useScheduling'
import type { LessonType } from '@/types/scheduling'

const FORMAT_LABELS: Record<string, string> = {
  private: 'Private',
  semi_private: 'Semi-private',
  group: 'Group',
  test_session: 'Test Session',
  club_ice: 'Club Ice',
}

const PRESET_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

interface RowState {
  name: string
  description: string
  lesson_format: string
  duration_minutes: number
  price: string
  drop_in_price: string
  max_participants: number
  color: string
  is_active: boolean
}

const BLANK: RowState = {
  name: '', description: '', lesson_format: 'private',
  duration_minutes: 30, price: '0.00', drop_in_price: '',
  max_participants: 1, color: '#6366f1', is_active: true,
}

function TypeRow({ lt }: { lt: LessonType }) {
  const update = useUpdateLessonType()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<RowState>({
    name: lt.name,
    description: lt.description,
    lesson_format: lt.lesson_format,
    duration_minutes: lt.duration_minutes,
    price: lt.price,
    drop_in_price: lt.drop_in_price ?? '',
    max_participants: lt.max_participants,
    color: lt.color,
    is_active: lt.is_active,
  })

  function save() {
    update.mutate(
      { id: lt.id, ...form, drop_in_price: form.drop_in_price || null } as Parameters<typeof update.mutate>[0],
      { onSuccess: () => setEditing(false) }
    )
  }

  if (!editing) {
    return (
      <tr className="border-t border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: lt.color }} />
            <span className="text-sm font-medium text-slate-800">{lt.name}</span>
          </div>
          {lt.description && <p className="text-xs text-slate-500 mt-0.5 ml-5">{lt.description}</p>}
        </td>
        <td className="px-4 py-3 text-sm text-slate-700">{FORMAT_LABELS[lt.lesson_format]}</td>
        <td className="px-4 py-3 text-sm text-slate-700">{lt.duration_minutes} min</td>
        <td className="px-4 py-3 text-sm text-slate-700">${lt.price}</td>
        <td className="px-4 py-3 text-sm text-slate-500">{lt.drop_in_price ? `$${lt.drop_in_price}` : '—'}</td>
        <td className="px-4 py-3 text-sm text-slate-700">{lt.max_participants}</td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${lt.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {lt.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3">
          <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-primary">
            <Pencil size={14} />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-slate-100 bg-blue-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <input
            type="color"
            value={form.color}
            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            className="w-7 h-7 rounded cursor-pointer border border-slate-300"
          />
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="text-sm border border-slate-300 rounded px-2 py-1 w-40"
            placeholder="Name"
          />
        </div>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="text-xs border border-slate-300 rounded px-2 py-1 w-full"
          placeholder="Description"
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={form.lesson_format}
          onChange={e => setForm(f => ({ ...f, lesson_format: e.target.value }))}
          className="text-sm border border-slate-300 rounded px-2 py-1"
        >
          {Object.entries(FORMAT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={form.duration_minutes}
          onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
          className="text-sm border border-slate-300 rounded px-2 py-1 w-16"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          className="text-sm border border-slate-300 rounded px-2 py-1 w-20"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={form.drop_in_price}
          onChange={e => setForm(f => ({ ...f, drop_in_price: e.target.value }))}
          className="text-sm border border-slate-300 rounded px-2 py-1 w-20"
          placeholder="Optional"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={form.max_participants}
          onChange={e => setForm(f => ({ ...f, max_participants: Number(e.target.value) }))}
          className="text-sm border border-slate-300 rounded px-2 py-1 w-16"
        />
      </td>
      <td className="px-4 py-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
          />
          <span className="text-xs text-slate-600">Active</span>
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button
            onClick={save}
            disabled={update.isPending}
            className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            <Check size={16} />
          </button>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function AddRow({ onDone }: { onDone: () => void }) {
  const create = useCreateLessonType()
  const [form, setForm] = useState<RowState>({ ...BLANK })

  function save() {
    if (!form.name) return
    create.mutate(
      { ...form, drop_in_price: form.drop_in_price || null } as Parameters<typeof create.mutate>[0],
      { onSuccess: () => { setForm({ ...BLANK }); onDone() } }
    )
  }

  return (
    <tr className="border-t border-slate-100 bg-emerald-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <input
            type="color"
            value={form.color}
            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            className="w-7 h-7 rounded cursor-pointer border border-slate-300"
          />
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="text-sm border border-slate-300 rounded px-2 py-1 w-40"
            placeholder="Name *"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-1 ml-9">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setForm(f => ({ ...f, color: c }))}
              className={`w-4 h-4 rounded-full border-2 ${form.color === c ? 'border-slate-700' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <select
          value={form.lesson_format}
          onChange={e => setForm(f => ({ ...f, lesson_format: e.target.value }))}
          className="text-sm border border-slate-300 rounded px-2 py-1"
        >
          {Object.entries(FORMAT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={form.duration_minutes}
          onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
          className="text-sm border border-slate-300 rounded px-2 py-1 w-16"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          className="text-sm border border-slate-300 rounded px-2 py-1 w-20"
          placeholder="0.00"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={form.drop_in_price}
          onChange={e => setForm(f => ({ ...f, drop_in_price: e.target.value }))}
          className="text-sm border border-slate-300 rounded px-2 py-1 w-20"
          placeholder="Optional"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={form.max_participants}
          onChange={e => setForm(f => ({ ...f, max_participants: Number(e.target.value) }))}
          className="text-sm border border-slate-300 rounded px-2 py-1 w-16"
        />
      </td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button
            onClick={save}
            disabled={create.isPending || !form.name}
            className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            <Check size={16} />
          </button>
          <button onClick={onDone} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function LessonTypesPage() {
  const { data: lessonTypes = [], isLoading } = useLessonTypes()
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/schedule" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lesson Types</h1>
            <p className="text-slate-500 text-sm mt-0.5">Define your coaching formats, durations, and pricing</p>
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90"
        >
          <Plus size={15} /> Add Type
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Name', 'Format', 'Duration', 'Price', 'Drop-in', 'Max', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lessonTypes.map(lt => <TypeRow key={lt.id} lt={lt} />)}
                {adding && <AddRow onDone={() => setAdding(false)} />}
                {!adding && lessonTypes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No lesson types yet. Click &ldquo;Add Type&rdquo; to create your first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

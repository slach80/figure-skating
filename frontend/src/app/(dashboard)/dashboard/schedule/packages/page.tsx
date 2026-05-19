'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Check, X } from 'lucide-react'
import {
  useLessonPackages,
  useCreateLessonPackage,
  useUpdateLessonPackage,
  usePurchasedPackages,
} from '@/hooks/useScheduling'
import { useLessonTypes } from '@/hooks/useScheduling'
import type { LessonPackage } from '@/types/scheduling'

const PAYMENT_BADGE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-emerald-50 text-emerald-700',
  refunded: 'bg-slate-50 text-slate-500',
}

interface PackageRowState {
  name: string
  description: string
  lesson_type: string
  lesson_count: number
  price: string
  is_active: boolean
}

const BLANK: PackageRowState = {
  name: '',
  description: '',
  lesson_type: '',
  lesson_count: 5,
  price: '0.00',
  is_active: true,
}

function PackageRow({ pkg, lessonTypeOptions }: { pkg: LessonPackage; lessonTypeOptions: { id: string; name: string }[] }) {
  const update = useUpdateLessonPackage()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PackageRowState>({
    name: pkg.name,
    description: pkg.description,
    lesson_type: pkg.lesson_type,
    lesson_count: pkg.lesson_count,
    price: pkg.price,
    is_active: pkg.is_active,
  })

  function save() {
    update.mutate(
      { id: pkg.id, ...form },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (!editing) {
    return (
      <tr className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900">
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{pkg.name}</p>
          {pkg.description && <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>}
        </td>
        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{pkg.lesson_type_name}</td>
        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-center">{pkg.lesson_count}</td>
        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">${pkg.price}</td>
        <td className="px-4 py-3 text-sm text-slate-500">${Number(pkg.price_per_lesson).toFixed(2)}</td>
        <td className="px-4 py-3 text-sm">
          {Number(pkg.savings_vs_individual) > 0 ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">${Number(pkg.savings_vs_individual).toFixed(2)}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {pkg.is_active ? 'Active' : 'Inactive'}
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
    <tr className="border-t border-slate-100 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/40">
      <td className="px-4 py-3">
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-44 mb-1 block"
          placeholder="Name"
        />
        <input
          type="text"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-full"
          placeholder="Description"
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={form.lesson_type}
          onChange={e => setForm(f => ({ ...f, lesson_type: e.target.value }))}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1"
        >
          {lessonTypeOptions.map(lt => (
            <option key={lt.id} value={lt.id}>{lt.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={1}
          value={form.lesson_count}
          onChange={e => setForm(f => ({ ...f, lesson_count: Number(e.target.value) }))}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-16 text-center"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-20"
          placeholder="0.00"
        />
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 italic">auto</td>
      <td className="px-4 py-3 text-xs text-slate-400 italic">auto</td>
      <td className="px-4 py-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
          />
          <span className="text-xs text-slate-600 dark:text-slate-400">Active</span>
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button
            onClick={save}
            disabled={update.isPending}
            className="text-emerald-600 hover:text-emerald-700 dark:hover:dark:text-emerald-400 disabled:opacity-50"
          >
            <Check size={16} />
          </button>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-400">
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function AddRow({
  onDone,
  lessonTypeOptions,
}: {
  onDone: () => void
  lessonTypeOptions: { id: string; name: string }[]
}) {
  const create = useCreateLessonPackage()
  const [form, setForm] = useState<PackageRowState>({
    ...BLANK,
    lesson_type: lessonTypeOptions[0]?.id ?? '',
  })

  function save() {
    if (!form.name || !form.lesson_type) return
    create.mutate(
      { ...form },
      {
        onSuccess: () => {
          setForm({ ...BLANK, lesson_type: lessonTypeOptions[0]?.id ?? '' })
          onDone()
        },
      },
    )
  }

  return (
    <tr className="border-t border-slate-100 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/40">
      <td className="px-4 py-3">
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-44 mb-1 block"
          placeholder="Name *"
          autoFocus
        />
        <input
          type="text"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-full"
          placeholder="Description"
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={form.lesson_type}
          onChange={e => setForm(f => ({ ...f, lesson_type: e.target.value }))}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1"
        >
          <option value="">Select type…</option>
          {lessonTypeOptions.map(lt => (
            <option key={lt.id} value={lt.id}>{lt.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={1}
          value={form.lesson_count}
          onChange={e => setForm(f => ({ ...f, lesson_count: Number(e.target.value) }))}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-16 text-center"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-20"
          placeholder="0.00"
        />
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 italic">auto</td>
      <td className="px-4 py-3 text-xs text-slate-400 italic">auto</td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button
            onClick={save}
            disabled={create.isPending || !form.name || !form.lesson_type}
            className="text-emerald-600 hover:text-emerald-700 dark:hover:dark:text-emerald-400 disabled:opacity-50"
          >
            <Check size={16} />
          </button>
          <button onClick={onDone} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-400">
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function PackagesPage() {
  const [adding, setAdding] = useState(false)
  const { data: packages = [], isLoading: packagesLoading } = useLessonPackages()
  const { data: lessonTypes = [] } = useLessonTypes()
  const { data: recentPurchases = [], isLoading: purchasesLoading } = usePurchasedPackages()

  const lessonTypeOptions = lessonTypes.map(lt => ({ id: lt.id, name: lt.name }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/schedule" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Lesson Packages</h1>
            <p className="text-slate-500 text-sm mt-0.5">Pre-purchased lesson bundles for skaters</p>
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90"
        >
          <Plus size={15} /> Add Package
        </button>
      </div>

      {/* Packages table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {packagesLoading ? (
          <p className="p-8 text-center text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {['Name', 'Lesson Type', 'Count', 'Bundle Price', 'Price/Lesson', 'Savings', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packages.map(pkg => (
                  <PackageRow key={pkg.id} pkg={pkg} lessonTypeOptions={lessonTypeOptions} />
                ))}
                {adding && (
                  <AddRow onDone={() => setAdding(false)} lessonTypeOptions={lessonTypeOptions} />
                )}
                {!adding && packages.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No lesson packages yet. Click &ldquo;Add Package&rdquo; to create your first bundle.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Purchases */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Recent Purchases</h2>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {purchasesLoading ? (
            <p className="p-6 text-center text-slate-500">Loading…</p>
          ) : recentPurchases.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {['Skater', 'Package', 'Lessons Remaining', 'Status', 'Purchased'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPurchases.slice(0, 20).map(purchase => (
                    <tr key={purchase.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{purchase.skater_name}</p>
                        <p className="text-xs text-slate-500">{purchase.lesson_type_name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{purchase.package_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${purchase.lessons_total > 0 ? (purchase.lessons_remaining / purchase.lessons_total) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {purchase.lessons_remaining} / {purchase.lessons_total}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_BADGE[purchase.payment_status] ?? ''}`}>
                          {purchase.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(purchase.purchased_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

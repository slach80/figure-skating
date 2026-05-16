'use client'

import { useState } from 'react'
import { Save, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import {
  useClubProfile,
  useUpdateClubProfile,
  useClubMembershipTypes,
  useCreateMembershipType,
  useUpdateMembershipType,
  useDeleteMembershipType,
  type MembershipTypeSetting,
} from '@/hooks/useClubSettings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

const EMPTY_TYPE: Omit<MembershipTypeSetting, 'id'> = {
  name: '',
  usfs_category: '',
  price_in_club: '',
  price_out_of_club: '',
  is_family_plan: false,
  is_active: true,
  sort_order: 0,
}

function MembershipTypeRow({
  mt,
  onSave,
  onDelete,
}: {
  mt: MembershipTypeSetting
  onSave: (data: Partial<MembershipTypeSetting> & { id: string }) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<MembershipTypeSetting>(mt)

  function set(k: keyof MembershipTypeSetting, v: unknown) {
    setForm(f => ({ ...f, [k]: v }))
  }

  if (!editing) {
    return (
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-slate-900">{mt.name}</td>
        <td className="px-4 py-3 text-sm text-slate-600">{mt.usfs_category || '—'}</td>
        <td className="px-4 py-3 text-sm tabular-nums text-slate-900">${parseFloat(mt.price_in_club).toFixed(2)}</td>
        <td className="px-4 py-3 text-sm tabular-nums text-slate-500">${parseFloat(mt.price_out_of_club).toFixed(2)}</td>
        <td className="px-4 py-3 text-sm text-slate-500">{mt.is_family_plan ? 'Yes' : 'No'}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${mt.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {mt.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(mt.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="bg-blue-50/40">
      <td className="px-4 py-2"><input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} /></td>
      <td className="px-4 py-2"><input className={inputCls} value={form.usfs_category} onChange={e => set('usfs_category', e.target.value)} placeholder="e.g., Adult" /></td>
      <td className="px-4 py-2"><input type="number" step="0.01" className={inputCls} value={form.price_in_club} onChange={e => set('price_in_club', e.target.value)} /></td>
      <td className="px-4 py-2"><input type="number" step="0.01" className={inputCls} value={form.price_out_of_club} onChange={e => set('price_out_of_club', e.target.value)} /></td>
      <td className="px-4 py-2">
        <input type="checkbox" checked={form.is_family_plan} onChange={e => set('is_family_plan', e.target.checked)} className="rounded border-slate-300" />
      </td>
      <td className="px-4 py-2">
        <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded border-slate-300" />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => { onSave(form); setEditing(false) }} className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors">
            <Check size={14} />
          </button>
          <button onClick={() => { setForm(mt); setEditing(false) }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function SettingsPage() {
  const { data: club, isLoading: clubLoading, error: clubError } = useClubProfile()
  const { data: membershipTypes, isLoading: mtLoading } = useClubMembershipTypes()
  const updateClub = useUpdateClubProfile()
  const createMt = useCreateMembershipType()
  const updateMt = useUpdateMembershipType()
  const deleteMt = useDeleteMembershipType()

  const [clubForm, setClubForm] = useState<Record<string, string>>({})
  const [clubDirty, setClubDirty] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [newType, setNewType] = useState<typeof EMPTY_TYPE | null>(null)

  function setClubField(k: string, v: string) {
    setClubForm(f => ({ ...f, [k]: v }))
    setClubDirty(true)
  }

  function clubVal(k: string, fallback = '') {
    return k in clubForm ? clubForm[k] : ((club as unknown as Record<string, string>)?.[k] ?? fallback)
  }

  async function saveClub() {
    await updateClub.mutateAsync(clubForm as never)
    setClubForm({})
    setClubDirty(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 3000)
  }

  function setNewField(k: keyof typeof EMPTY_TYPE, v: unknown) {
    setNewType(f => f ? { ...f, [k]: v } : f)
  }

  async function createType() {
    if (!newType || !newType.name) return
    await createMt.mutateAsync(newType)
    setNewType(null)
  }

  if (clubLoading) return <LoadingSpinner />
  if (clubError) return <ErrorAlert message="Failed to load club settings." />

  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <h1>Settings</h1>
        <p className="text-slate-600 mt-1 text-sm">Manage your club profile, season, and membership types.</p>
      </div>

      {/* Club Profile */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-900">Club Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Club name">
            <input className={inputCls} value={clubVal('name')} onChange={e => setClubField('name', e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={clubVal('email')} onChange={e => setClubField('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={clubVal('phone')} onChange={e => setClubField('phone', e.target.value)} />
          </Field>
          <Field label="Website">
            <input type="url" className={inputCls} value={clubVal('website_url')} onChange={e => setClubField('website_url', e.target.value)} />
          </Field>
          <Field label="Address">
            <input className={inputCls} value={clubVal('address')} onChange={e => setClubField('address', e.target.value)} />
          </Field>
          <Field label="City">
            <input className={inputCls} value={clubVal('city')} onChange={e => setClubField('city', e.target.value)} />
          </Field>
          <Field label="State">
            <select className={inputCls} value={clubVal('state')} onChange={e => setClubField('state', e.target.value)}>
              <option value="">—</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="ZIP">
            <input className={inputCls} value={clubVal('zip_code')} onChange={e => setClubField('zip_code', e.target.value)} />
          </Field>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 pt-2">Season</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Season label (e.g., 2025-2026)">
            <input className={inputCls} value={clubVal('season_label')} onChange={e => setClubField('season_label', e.target.value)} />
          </Field>
          <Field label="Season start">
            <input type="date" className={inputCls} value={clubVal('current_season_start')} onChange={e => setClubField('current_season_start', e.target.value)} />
          </Field>
          <Field label="Season end">
            <input type="date" className={inputCls} value={clubVal('current_season_end')} onChange={e => setClubField('current_season_end', e.target.value)} />
          </Field>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 pt-2">Branding</h3>
        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <Field label="Primary color">
            <div className="flex items-center gap-2">
              <input type="color" value={clubVal('primary_color', '#5B2C91')} onChange={e => setClubField('primary_color', e.target.value)} className="w-10 h-9 rounded border border-slate-200 p-0.5 cursor-pointer" />
              <input className={inputCls} value={clubVal('primary_color', '#5B2C91')} onChange={e => setClubField('primary_color', e.target.value)} maxLength={7} />
            </div>
          </Field>
          <Field label="Accent color">
            <div className="flex items-center gap-2">
              <input type="color" value={clubVal('accent_color', '#D946EF')} onChange={e => setClubField('accent_color', e.target.value)} className="w-10 h-9 rounded border border-slate-200 p-0.5 cursor-pointer" />
              <input className={inputCls} value={clubVal('accent_color', '#D946EF')} onChange={e => setClubField('accent_color', e.target.value)} maxLength={7} />
            </div>
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={saveClub}
            disabled={!clubDirty || updateClub.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            <Save size={15} />
            {updateClub.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {savedMsg && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>
      </section>

      {/* Membership Types */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Membership Types</h2>
          <button
            onClick={() => setNewType(EMPTY_TYPE)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Add type
          </button>
        </div>

        {mtLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">USFS Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">In-club $</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Out-of-club $</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Family?</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {membershipTypes?.map(mt => (
                <MembershipTypeRow
                  key={mt.id}
                  mt={mt}
                  onSave={updateMt.mutate}
                  onDelete={deleteMt.mutate}
                />
              ))}

              {/* New type inline row */}
              {newType && (
                <tr className="bg-green-50/40">
                  <td className="px-4 py-2"><input className={inputCls} placeholder="e.g., Adult" value={newType.name} onChange={e => setNewField('name', e.target.value)} /></td>
                  <td className="px-4 py-2"><input className={inputCls} placeholder="e.g., Adult" value={newType.usfs_category} onChange={e => setNewField('usfs_category', e.target.value)} /></td>
                  <td className="px-4 py-2"><input type="number" step="0.01" className={inputCls} placeholder="0.00" value={newType.price_in_club} onChange={e => setNewField('price_in_club', e.target.value)} /></td>
                  <td className="px-4 py-2"><input type="number" step="0.01" className={inputCls} placeholder="0.00" value={newType.price_out_of_club} onChange={e => setNewField('price_out_of_club', e.target.value)} /></td>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={newType.is_family_plan} onChange={e => setNewField('is_family_plan', e.target.checked)} className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={newType.is_active} onChange={e => setNewField('is_active', e.target.checked)} className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={createType} disabled={createMt.isPending} className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setNewType(null)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!membershipTypes?.length && !newType && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No membership types yet. Click <strong>Add type</strong> to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* Stripe status */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Payments (Stripe)</h2>
        {club?.payments_enabled ? (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3 border border-green-200">
            Stripe is connected and payments are enabled.
          </p>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3 border border-amber-200">
            Stripe is not yet connected. Contact your administrator to complete Stripe onboarding.
          </p>
        )}
      </section>
    </div>
  )
}

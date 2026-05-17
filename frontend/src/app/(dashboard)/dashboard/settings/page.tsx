'use client'

import { useState } from 'react'
import { Save, Plus, Trash2, Pencil, Check, X, Globe, ExternalLink } from 'lucide-react'
import {
  useClubProfile,
  useUpdateClubProfile,
  useClubMembershipTypes,
  useCreateMembershipType,
  useUpdateMembershipType,
  useDeleteMembershipType,
  type MembershipTypeSetting,
} from '@/hooks/useClubSettings'
import {
  useAdminSiteConfig,
  useUpdateSiteConfig,
  useAdminAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from '@/hooks/useWebsite'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import type { Announcement } from '@/types/website'

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

// ── Website Tab ───────────────────────────────────────────────────────────────

const EMPTY_ANNOUNCEMENT: Omit<Announcement, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  body: '',
  is_published: false,
  published_at: null,
}

function WebsiteTab() {
  const { data: config } = useAdminSiteConfig()
  const updateConfig = useUpdateSiteConfig()
  const { data: announcements = [], isLoading: announcementsLoading } = useAdminAnnouncements()
  const createAnn = useCreateAnnouncement()
  const updateAnn = useUpdateAnnouncement()
  const deleteAnn = useDeleteAnnouncement()

  const [siteForm, setSiteForm] = useState<Record<string, string>>({})
  const [siteDirty, setSiteDirty] = useState(false)
  const [siteSaved, setSiteSaved] = useState(false)
  const [newAnn, setNewAnn] = useState<typeof EMPTY_ANNOUNCEMENT | null>(null)
  const [editingAnn, setEditingAnn] = useState<string | null>(null)
  const [editAnnForm, setEditAnnForm] = useState<Partial<Announcement>>({})

  function siteVal(k: string, fallback = '') {
    return k in siteForm ? siteForm[k] : ((config as unknown as Record<string, string>)?.[k] ?? fallback)
  }

  function setSiteField(k: string, v: string) {
    setSiteForm(f => ({ ...f, [k]: v }))
    setSiteDirty(true)
  }

  async function saveSite() {
    await updateConfig.mutateAsync(siteForm)
    setSiteForm({})
    setSiteDirty(false)
    setSiteSaved(true)
    setTimeout(() => setSiteSaved(false), 3000)
  }

  async function togglePublished(ann: Announcement) {
    await updateAnn.mutateAsync({
      id: ann.id,
      is_published: !ann.is_published,
      published_at: !ann.is_published ? new Date().toISOString() : null,
    })
  }

  return (
    <div className="space-y-8">
      {/* Site Config */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Public Website Content</h2>
          <a href="/home" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ExternalLink size={12} />
            Preview site
          </a>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Field label="Tagline (shown on homepage hero)">
            <input className={inputCls} value={siteVal('tagline')} onChange={e => setSiteField('tagline', e.target.value)} placeholder="Where champions are made, one edge at a time." />
          </Field>
          <Field label="About text (shown on About page)">
            <textarea className={inputCls + ' resize-y min-h-[120px]'} value={siteVal('about_text')} onChange={e => setSiteField('about_text', e.target.value)} placeholder="Describe your club…" />
          </Field>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 pt-2">Contact Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Contact email">
            <input type="email" className={inputCls} value={siteVal('contact_email')} onChange={e => setSiteField('contact_email', e.target.value)} />
          </Field>
          <Field label="Contact phone">
            <input className={inputCls} value={siteVal('contact_phone')} onChange={e => setSiteField('contact_phone', e.target.value)} />
          </Field>
          <Field label="Mailing address">
            <textarea className={inputCls + ' resize-y'} rows={2} value={siteVal('address')} onChange={e => setSiteField('address', e.target.value)} />
          </Field>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 pt-2">Home Rink</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Rink name">
            <input className={inputCls} value={siteVal('rink_name')} onChange={e => setSiteField('rink_name', e.target.value)} placeholder="e.g., Line Creek Recreation Center" />
          </Field>
          <Field label="Rink address">
            <textarea className={inputCls + ' resize-y'} rows={2} value={siteVal('rink_address')} onChange={e => setSiteField('rink_address', e.target.value)} />
          </Field>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 pt-2">Social Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Facebook URL">
            <input type="url" className={inputCls} value={siteVal('facebook_url')} onChange={e => setSiteField('facebook_url', e.target.value)} placeholder="https://facebook.com/…" />
          </Field>
          <Field label="Instagram URL">
            <input type="url" className={inputCls} value={siteVal('instagram_url')} onChange={e => setSiteField('instagram_url', e.target.value)} placeholder="https://instagram.com/…" />
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={saveSite}
            disabled={!siteDirty || updateConfig.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            <Save size={15} />
            {updateConfig.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {siteSaved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>
      </section>

      {/* Announcements */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Announcements</h2>
          <button
            onClick={() => setNewAnn(EMPTY_ANNOUNCEMENT)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Add announcement
          </button>
        </div>

        {announcementsLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* New announcement form */}
            {newAnn && (
              <div className="p-4 bg-green-50/40 space-y-3">
                <input
                  className={inputCls}
                  placeholder="Title"
                  value={newAnn.title}
                  onChange={e => setNewAnn(f => f ? { ...f, title: e.target.value } : f)}
                />
                <textarea
                  className={inputCls + ' resize-y min-h-[80px]'}
                  placeholder="Body text…"
                  value={newAnn.body}
                  onChange={e => setNewAnn(f => f ? { ...f, body: e.target.value } : f)}
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAnn.is_published}
                      onChange={e => setNewAnn(f => f ? {
                        ...f,
                        is_published: e.target.checked,
                        published_at: e.target.checked ? new Date().toISOString() : null,
                      } : f)}
                      className="rounded border-slate-300"
                    />
                    Publish immediately
                  </label>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={async () => {
                        await createAnn.mutateAsync(newAnn)
                        setNewAnn(null)
                      }}
                      disabled={!newAnn.title || createAnn.isPending}
                      className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors disabled:opacity-40"
                    >
                      <Check size={16} />
                    </button>
                    <button onClick={() => setNewAnn(null)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {announcements.length === 0 && !newAnn && (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                No announcements yet. Click <strong>Add announcement</strong> to create one.
              </div>
            )}

            {announcements.map(ann => (
              <div key={ann.id} className="px-5 py-4">
                {editingAnn === ann.id ? (
                  <div className="space-y-2">
                    <input
                      className={inputCls}
                      value={editAnnForm.title ?? ann.title}
                      onChange={e => setEditAnnForm(f => ({ ...f, title: e.target.value }))}
                    />
                    <textarea
                      className={inputCls + ' resize-y min-h-[80px]'}
                      value={editAnnForm.body ?? ann.body}
                      onChange={e => setEditAnnForm(f => ({ ...f, body: e.target.value }))}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={async () => {
                          await updateAnn.mutateAsync({ id: ann.id, ...editAnnForm })
                          setEditingAnn(null)
                          setEditAnnForm({})
                        }}
                        className="p-1.5 rounded hover:bg-green-50 text-green-600"
                      >
                        <Check size={14} />
                      </button>
                      <button onClick={() => { setEditingAnn(null); setEditAnnForm({}) }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-slate-900">{ann.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${ann.is_published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {ann.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{ann.body}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => togglePublished(ann)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${ann.is_published ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                      >
                        {ann.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => { setEditingAnn(ann.id); setEditAnnForm({}) }}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteAnn.mutate(ann.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabKey = 'club' | 'membership' | 'website'

export default function SettingsPage() {
  const { data: club, isLoading: clubLoading, error: clubError } = useClubProfile()
  const { data: membershipTypes, isLoading: mtLoading } = useClubMembershipTypes()
  const updateClub = useUpdateClubProfile()
  const createMt = useCreateMembershipType()
  const updateMt = useUpdateMembershipType()
  const deleteMt = useDeleteMembershipType()

  const [activeTab, setActiveTab] = useState<TabKey>('club')
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

  const tabCls = (t: TabKey) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === t
        ? 'border-primary text-primary'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1>Settings</h1>
        <p className="text-slate-600 mt-1 text-sm">Manage your club profile, membership types, and public website.</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200 flex gap-0">
        <button className={tabCls('club')} onClick={() => setActiveTab('club')}>Club Profile</button>
        <button className={tabCls('membership')} onClick={() => setActiveTab('membership')}>Membership Types</button>
        <button className={tabCls('website')} onClick={() => setActiveTab('website')}>
          <span className="flex items-center gap-1.5"><Globe size={14} />Website</span>
        </button>
      </div>

      {/* Club Profile */}
      {activeTab === 'club' && (
        <>
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
        </>
      )}

      {/* Membership Types */}
      {activeTab === 'membership' && (
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
      )}

      {/* Website tab */}
      {activeTab === 'website' && <WebsiteTab />}
    </div>
  )
}

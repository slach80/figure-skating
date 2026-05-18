'use client'

import { useState, useEffect, useCallback, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { getTokenRole } from '@/lib/auth'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardPayload {
  club_name: string
  club_slug: string
  city: string
  state: string
  zip_code: string
  primary_color: string
  accent_color: string
  season_label: string
  current_season_start: string
  current_season_end: string
  admin_email: string
  admin_password: string
}

interface OnboardResponse {
  club_id: string
  club_slug: string
  admin_email: string
  message: string
}

interface ApiError {
  response?: {
    data?: Record<string, string[] | string>
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const STEPS = ['Club Details', 'Season', 'Admin Account'] as const
type StepIndex = 0 | 1 | 2

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function flattenErrors(data: Record<string, string[] | string>): string {
  return Object.entries(data)
    .map(([key, val]) => {
      const msgs = Array.isArray(val) ? val.join(' ') : val
      return `${key}: ${msgs}`
    })
    .join('\n')
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 transition-shadow'
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 rounded border border-slate-200 p-0.5 cursor-pointer flex-shrink-0"
        />
        <input
          className={inputCls}
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#5B2C91"
        />
      </div>
    </Field>
  )
}

// ── Step components ───────────────────────────────────────────────────────────

interface Step1Props {
  clubName: string
  clubSlug: string
  city: string
  state: string
  zipCode: string
  primaryColor: string
  accentColor: string
  slugManual: boolean
  onChange: <K extends keyof OnboardPayload>(key: K, value: string) => void
  onNameChange: (name: string) => void
  onSlugManualEdit: () => void
}

function Step1ClubDetails({
  clubName,
  clubSlug,
  city,
  state,
  zipCode,
  primaryColor,
  accentColor,
  onChange,
  onNameChange,
  onSlugManualEdit,
}: Step1Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Club Name *">
          <input
            className={inputCls}
            value={clubName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
            placeholder="Line Creek FSC"
            required
          />
        </Field>
        <Field label="Slug * (used for subdomain routing)">
          <input
            className={inputCls}
            value={clubSlug}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              onSlugManualEdit()
              onChange('club_slug', e.target.value)
            }}
            placeholder="linecreek"
            pattern="[a-z0-9-]+"
            required
          />
        </Field>
        <Field label="City">
          <input
            className={inputCls}
            value={city}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('city', e.target.value)}
            placeholder="Kansas City"
          />
        </Field>
        <Field label="State">
          <select
            className={inputCls}
            value={state}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange('state', e.target.value)}
          >
            <option value="">— select —</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="ZIP Code">
          <input
            className={inputCls}
            value={zipCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('zip_code', e.target.value)}
            placeholder="64152"
            maxLength={10}
          />
        </Field>
      </div>

      <div>
        <p className={`${labelCls} mb-3`}>Branding Colors</p>
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <ColorField
            label="Primary Color"
            value={primaryColor}
            onChange={(v) => onChange('primary_color', v)}
          />
          <ColorField
            label="Accent Color"
            value={accentColor}
            onChange={(v) => onChange('accent_color', v)}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border border-slate-200"
            style={{ background: primaryColor }}
            title="Primary"
          />
          <div
            className="w-8 h-8 rounded-full border border-slate-200"
            style={{ background: accentColor }}
            title="Accent"
          />
          <span className="text-xs text-slate-500">Color preview</span>
        </div>
      </div>
    </div>
  )
}

interface Step2Props {
  seasonLabel: string
  seasonStart: string
  seasonEnd: string
  onChange: <K extends keyof OnboardPayload>(key: K, value: string) => void
}

function Step2Season({ seasonLabel, seasonStart, seasonEnd, onChange }: Step2Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Field label="Season Label (e.g., 2025-2026)">
        <input
          className={inputCls}
          value={seasonLabel}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('season_label', e.target.value)}
          placeholder="2025-2026"
          maxLength={20}
        />
      </Field>
      <Field label="Season Start Date">
        <input
          type="date"
          className={inputCls}
          value={seasonStart}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('current_season_start', e.target.value)}
        />
      </Field>
      <Field label="Season End Date">
        <input
          type="date"
          className={inputCls}
          value={seasonEnd}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('current_season_end', e.target.value)}
        />
      </Field>
    </div>
  )
}

interface Step3Props {
  adminEmail: string
  adminPassword: string
  confirmPassword: string
  showPassword: boolean
  onShowPasswordToggle: () => void
  onChange: <K extends keyof OnboardPayload>(key: K, value: string) => void
  onConfirmPasswordChange: (v: string) => void
}

function Step3AdminAccount({
  adminEmail,
  adminPassword,
  confirmPassword,
  showPassword,
  onShowPasswordToggle,
  onChange,
  onConfirmPasswordChange,
}: Step3Props) {
  const passwordMismatch = confirmPassword.length > 0 && adminPassword !== confirmPassword

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        This account will be the primary admin for the new club. They can log in immediately after creation.
      </p>
      <div className="grid grid-cols-1 gap-4 max-w-md">
        <Field label="Admin Email *">
          <input
            type="email"
            className={inputCls}
            value={adminEmail}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('admin_email', e.target.value)}
            placeholder="admin@newclub.com"
            required
          />
        </Field>
        <Field label="Admin Password * (min 8 characters)">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className={`${inputCls} pr-10`}
              value={adminPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('admin_password', e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={onShowPasswordToggle}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Confirm Password *">
          <input
            type={showPassword ? 'text' : 'password'}
            className={`${inputCls} ${passwordMismatch ? 'border-red-400 focus:ring-red-400/40' : ''}`}
            value={confirmPassword}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onConfirmPasswordChange(e.target.value)}
            placeholder="••••••••"
            required
          />
          {passwordMismatch && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
          )}
        </Field>
      </div>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  result,
  onCreateAnother,
}: {
  result: OnboardResponse
  onCreateAnother: () => void
}) {
  return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-6">
      <div className="flex justify-center">
        <CheckCircle2 size={56} className="text-green-500" strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Club Created!</h2>
        <p className="text-slate-600">{result.message}</p>
      </div>
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-left space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Club slug</span>
          <span className="font-mono font-semibold text-slate-800">{result.club_slug}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Club ID</span>
          <span className="font-mono text-xs text-slate-600">{result.club_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Admin email</span>
          <span className="font-semibold text-slate-800">{result.admin_email}</span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={`/login?next=/dashboard&hint=${encodeURIComponent(result.admin_email)}`}
          className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Log in as club admin
        </a>
        <button
          onClick={onCreateAnother}
          className="px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          Onboard another club
        </button>
      </div>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

const INITIAL_STATE: OnboardPayload = {
  club_name: '',
  club_slug: '',
  city: '',
  state: '',
  zip_code: '',
  primary_color: '#5B2C91',
  accent_color: '#D946EF',
  season_label: '',
  current_season_start: '',
  current_season_end: '',
  admin_email: '',
  admin_password: '',
}

export default function OnboardPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)

  const [step, setStep] = useState<StepIndex>(0)
  const [form, setForm] = useState<OnboardPayload>(INITIAL_STATE)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OnboardResponse | null>(null)

  // Auth guard — super_admin only
  useEffect(() => {
    const role = getTokenRole()
    if (role !== 'super_admin') {
      router.replace('/login')
    } else {
      setAuthChecked(true)
    }
  }, [router])

  const setField = useCallback(<K extends keyof OnboardPayload>(key: K, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      club_name: name,
      club_slug: slugManual ? f.club_slug : slugify(name),
    }))
  }

  function canAdvance(): boolean {
    if (step === 0) {
      return form.club_name.trim().length > 0 && form.club_slug.trim().length > 0
    }
    if (step === 1) {
      // Season step is optional — always can advance
      return true
    }
    if (step === 2) {
      return (
        form.admin_email.trim().length > 0 &&
        form.admin_password.length >= 8 &&
        form.admin_password === confirmPassword
      )
    }
    return false
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const payload: OnboardPayload = {
        ...form,
        current_season_start: form.current_season_start || '',
        current_season_end: form.current_season_end || '',
      }
      const { data } = await api.post<OnboardResponse>('/api/v1/clubs/onboard/', payload)
      setResult(data)
    } catch (err: unknown) {
      const apiErr = err as ApiError
      if (apiErr.response?.data) {
        setError(flattenErrors(apiErr.response.data))
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function resetWizard() {
    setForm(INITIAL_STATE)
    setConfirmPassword('')
    setSlugManual(false)
    setShowPassword(false)
    setStep(0)
    setError(null)
    setResult(null)
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (result) {
    return <SuccessScreen result={result} onCreateAnother={resetWizard} />
  }

  const isLastStep = step === 2

  return (
    <div className="max-w-2xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Onboard a New Club</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Creates the club record and its primary admin account in a single transaction.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, idx) => {
          const done = idx < step
          const active = idx === step
          return (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    done
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : active
                      ? 'border-violet-600 text-violet-600 bg-white'
                      : 'border-slate-300 text-slate-400 bg-white'
                  }`}
                >
                  {done ? <CheckCircle2 size={14} strokeWidth={2.5} /> : idx + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    active ? 'text-slate-900' : done ? 'text-violet-600' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`mx-3 h-0.5 w-12 sm:w-20 transition-colors ${
                    idx < step ? 'bg-violet-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">
            Step {step + 1}: {STEPS[step]}
          </h2>
        </div>

        <div className="px-6 py-6">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm whitespace-pre-wrap">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 0 && (
            <Step1ClubDetails
              clubName={form.club_name}
              clubSlug={form.club_slug}
              city={form.city}
              state={form.state}
              zipCode={form.zip_code}
              primaryColor={form.primary_color}
              accentColor={form.accent_color}
              slugManual={slugManual}
              onChange={setField}
              onNameChange={handleNameChange}
              onSlugManualEdit={() => setSlugManual(true)}
            />
          )}

          {step === 1 && (
            <Step2Season
              seasonLabel={form.season_label}
              seasonStart={form.current_season_start}
              seasonEnd={form.current_season_end}
              onChange={setField}
            />
          )}

          {step === 2 && (
            <Step3AdminAccount
              adminEmail={form.admin_email}
              adminPassword={form.admin_password}
              confirmPassword={confirmPassword}
              showPassword={showPassword}
              onShowPasswordToggle={() => setShowPassword((v) => !v)}
              onChange={setField}
              onConfirmPasswordChange={setConfirmPassword}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => (s > 0 ? ((s - 1) as StepIndex) : s))}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
            Back
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canAdvance() || submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Creating…' : 'Create Club'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => (s < 2 ? ((s + 1) as StepIndex) : s))}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

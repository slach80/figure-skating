'use client'

import { useState, useCallback } from 'react'
import { useMembershipTypes, useRegisterSkater, useRegisterFamily } from '@/hooks/useRegistration'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import {
  CheckCircle2, ChevronRight, ChevronLeft, User, MapPin,
  CreditCard, Shield, ClipboardCheck, Plus, Trash2, Users, Loader2
} from 'lucide-react'
import api from '@/lib/api'
import type { RegistrationFormData } from '@/types/registration'
import { EMPTY_FORM, US_STATES } from '@/types/registration'

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Skater',     icon: User },
  { id: 2, label: 'Address',    icon: MapPin },
  { id: 3, label: 'Membership', icon: CreditCard },
  { id: 4, label: 'Emergency',  icon: Shield },
  { id: 5, label: 'Review',     icon: ClipboardCheck },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon
        const done   = current > step.id
        const active = current === step.id
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 ${active ? 'text-primary' : done ? 'text-green-600' : 'text-slate-400'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors
                ${active ? 'border-primary bg-primary/10' : done ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}>
                {done ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-8 sm:w-16 h-0.5 mx-1 mb-4 transition-colors ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-slate-800"

// Proxied through backend to avoid CORS restrictions on the Census Geocoder
async function validateUSAddress(
  line1: string, city: string, state: string, zip: string
): Promise<{ valid: boolean; normalized?: { line1: string; city: string; state: string; zip: string } }> {
  try {
    const res = await api.post('/api/v1/members/validate-address/', { street: line1, city, state, zip })
    return res.data
  } catch {
    // Network error — don't block the user
    return { valid: true }
  }
}

function isMinor(dob: string) {
  if (!dob) return false
  const birth = new Date(dob + 'T00:00:00')
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear() -
    (today.getMonth() * 100 + today.getDate() < birth.getMonth() * 100 + birth.getDate() ? 1 : 0)
  return age < 13
}

type FieldErrors = Partial<Record<keyof RegistrationFormData, string>>

function validateStep(step: number, form: RegistrationFormData): FieldErrors {
  const e: FieldErrors = {}
  if (step === 1) {
    if (!form.first_name.trim())  e.first_name = 'Required'
    if (!form.last_name.trim())   e.last_name  = 'Required'
    if (!form.date_of_birth)      e.date_of_birth = 'Required'
    else if (new Date(form.date_of_birth) >= new Date()) e.date_of_birth = 'Must be in the past'
  }
  if (step === 2) {
    if (!form.address_line1.trim()) e.address_line1 = 'Required'
    if (!form.city.trim())          e.city          = 'Required'
    if (!form.state)                e.state         = 'Required'
    if (!form.zip_code.trim())      e.zip_code      = 'Required'
  }
  if (step === 3) {
    if (!form.membership_type_id) e.membership_type_id = 'Select a membership type'
  }
  if (step === 4 && isMinor(form.date_of_birth) && !form.coppa_consent) {
    e.coppa_consent = 'Parental consent required for minors'
  }
  return e
}

// ─── Single-skater wizard ─────────────────────────────────────────────────────

function SkaterForm({
  form, errors, onChange,
}: {
  form: RegistrationFormData
  errors: FieldErrors
  onChange: (field: keyof RegistrationFormData, value: string | boolean) => void
}) {
  const minor = isMinor(form.date_of_birth)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required error={errors.first_name}>
          <input className={inputCls} value={form.first_name} onChange={e => onChange('first_name', e.target.value)} />
        </Field>
        <Field label="Last name" required error={errors.last_name}>
          <input className={inputCls} value={form.last_name} onChange={e => onChange('last_name', e.target.value)} />
        </Field>
      </div>
      <Field label="Date of birth" required error={errors.date_of_birth}>
        <input type="date" className={inputCls} value={form.date_of_birth} onChange={e => onChange('date_of_birth', e.target.value)} />
        {minor && form.date_of_birth && (
          <p className="text-blue-600 text-xs mt-1 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Under 13 — parental consent required
          </p>
        )}
      </Field>
      <Field label="Gender">
        <select className={inputCls} value={form.gender} onChange={e => onChange('gender', e.target.value)}>
          <option value="">Prefer not to say</option>
          <option value="F">Female</option>
          <option value="M">Male</option>
          <option value="X">Non-binary / Other</option>
        </select>
      </Field>
      <Field label="Contact email">
        <input type="email" className={inputCls} placeholder="skater@example.com" value={form.email} onChange={e => onChange('email', e.target.value)} />
      </Field>
      <Field label="Phone">
        <input type="tel" className={inputCls} placeholder="(555) 000-0000" value={form.phone} onChange={e => onChange('phone', e.target.value)} />
      </Field>
    </div>
  )
}

function AddressForm({
  form, errors, onChange, addrStatus,
}: {
  form: RegistrationFormData
  errors: FieldErrors
  onChange: (field: keyof RegistrationFormData, value: string | boolean) => void
  addrStatus?: 'idle' | 'checking' | 'valid' | 'invalid'
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Required for USFS registration. Must match official records.</p>
      {addrStatus === 'invalid' && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-400 text-sm">
          <MapPin size={16} className="shrink-0" />
          Address not found. Please double-check and try again.
        </div>
      )}
      {addrStatus === 'valid' && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-4 py-3 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          Address verified.
        </div>
      )}
      <Field label="Address line 1" required error={errors.address_line1}>
        <input className={inputCls} placeholder="123 Main St" value={form.address_line1} onChange={e => onChange('address_line1', e.target.value)} />
      </Field>
      <Field label="Address line 2">
        <input className={inputCls} placeholder="Apt, Suite, etc." value={form.address_line2} onChange={e => onChange('address_line2', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
        <div className="col-span-2 sm:col-span-3">
          <Field label="City" required error={errors.city}>
            <input className={inputCls} value={form.city} onChange={e => onChange('city', e.target.value)} />
          </Field>
        </div>
        <div className="col-span-1">
          <Field label="State" required error={errors.state}>
            <select className={inputCls} value={form.state} onChange={e => onChange('state', e.target.value)}>
              <option value="">—</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-span-1 sm:col-span-2">
          <Field label="ZIP" required error={errors.zip_code}>
            <input className={inputCls} placeholder="00000" value={form.zip_code} onChange={e => onChange('zip_code', e.target.value)} />
          </Field>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [mode, setMode] = useState<'choose' | 'single' | 'family'>('choose')

  // Single-skater wizard state
  const [step, setStep]     = useState(1)
  const [form, setForm]     = useState<RegistrationFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [addrStatus, setAddrStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')

  // Family wizard state
  const [skaters, setSkaters]               = useState<RegistrationFormData[]>([{ ...EMPTY_FORM }])
  const [activeSkaterIdx, setActiveSkaterIdx] = useState(0)
  const [familyStep, setFamilyStep]          = useState(1)
  const [familyErrors, setFamilyErrors]      = useState<FieldErrors>({})
  const [familyGlobalError, setFamilyGlobalError] = useState('')
  const [familyAddrStatus, setFamilyAddrStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')

  const { data: membershipTypes, isLoading: typesLoading, error: typesError } = useMembershipTypes()
  const singleMutation = useRegisterSkater()
  const familyMutation = useRegisterFamily()

  // ── single helpers ──
  function setField(field: keyof RegistrationFormData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const nextStep = useCallback(async () => {
    const e = validateStep(step, form)
    if (Object.keys(e).length) { setErrors(e); return }
    if (step === 2) {
      setAddrStatus('checking')
      const result = await validateUSAddress(form.address_line1, form.city, form.state, form.zip_code)
      if (!result.valid) { setAddrStatus('invalid'); return }
      setAddrStatus('valid')
      if (result.normalized) {
        setForm(f => ({ ...f,
          address_line1: result.normalized!.line1,
          city: result.normalized!.city,
          state: result.normalized!.state,
          zip_code: result.normalized!.zip,
        }))
      }
    }
    setStep(s => s + 1)
  }, [step, form])

  async function submitSingle() {
    const e = validateStep(4, form)
    if (Object.keys(e).length) { setErrors(e); return }
    try {
      const result = await singleMutation.mutateAsync(form)
      window.location.href = result.checkout_url
    } catch { /* shown via singleMutation.error */ }
  }

  // ── family helpers ──
  function setFamilyField(idx: number, field: keyof RegistrationFormData, value: string | boolean) {
    setSkaters(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
    setFamilyErrors(e => ({ ...e, [field]: undefined }))
    setFamilyGlobalError('')
  }

  function addSkater() {
    // Copy address from first skater for convenience
    const base = skaters[0]
    setSkaters(prev => [...prev, {
      ...EMPTY_FORM,
      address_line1: base.address_line1,
      address_line2: base.address_line2,
      city: base.city,
      state: base.state,
      zip_code: base.zip_code,
    }])
    setActiveSkaterIdx(skaters.length)
    setFamilyStep(1)
  }

  function removeSkater(idx: number) {
    setSkaters(prev => prev.filter((_, i) => i !== idx))
    setActiveSkaterIdx(Math.max(0, idx - 1))
  }

  const nextFamilyStep = useCallback(async () => {
    const current = skaters[activeSkaterIdx]
    const e = validateStep(familyStep, current)
    if (Object.keys(e).length) { setFamilyErrors(e); return }
    setFamilyErrors({})
    if (familyStep === 2) {
      setFamilyAddrStatus('checking')
      const result = await validateUSAddress(current.address_line1, current.city, current.state, current.zip_code)
      if (!result.valid) { setFamilyAddrStatus('invalid'); return }
      setFamilyAddrStatus('valid')
      if (result.normalized) {
        setSkaters(prev => prev.map((s, i) => i === activeSkaterIdx ? { ...s,
          address_line1: result.normalized!.line1,
          city: result.normalized!.city,
          state: result.normalized!.state,
          zip_code: result.normalized!.zip,
        } : s))
      }
    } else {
      setFamilyAddrStatus('idle')
    }
    if (familyStep < 4) { setFamilyStep(s => s + 1); return }
    setFamilyStep(5)
  }, [familyStep, skaters, activeSkaterIdx])

  async function submitFamily() {
    // Validate all skaters
    for (let i = 0; i < skaters.length; i++) {
      for (const s of [1, 2, 3, 4]) {
        const e = validateStep(s, skaters[i])
        if (Object.keys(e).length) {
          setActiveSkaterIdx(i)
          setFamilyStep(s)
          setFamilyErrors(e)
          setFamilyGlobalError(`Please fix errors for skater ${i + 1}`)
          return
        }
      }
    }
    try {
      const result = await familyMutation.mutateAsync(skaters)
      window.location.href = result.checkout_url
    } catch { /* shown via familyMutation.error */ }
  }

  // ── mode selection ──
  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <span className="text-3xl">⛸</span>
            <div>
              <h1 className="font-serif font-bold text-slate-900 dark:text-slate-100">Line Creek FSC</h1>
              <p className="text-xs text-slate-500">Member Registration</p>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-2">Who are you registering?</h2>
          <p className="text-slate-500 text-sm text-center mb-8">Choose single for one skater, or family to register multiple skaters in one checkout.</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('single')}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 dark:hover:dark:bg-primary/20 p-8 transition-colors text-left"
            >
              <User className="w-10 h-10 text-primary" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Single Skater</p>
                <p className="text-xs text-slate-500 mt-1">Register one club member</p>
              </div>
            </button>
            <button
              onClick={() => setMode('family')}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 dark:hover:dark:bg-primary/20 p-8 transition-colors text-left"
            >
              <Users className="w-10 h-10 text-primary" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Family</p>
                <p className="text-xs text-slate-500 mt-1">Register 2–10 skaters, one checkout</p>
              </div>
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── family wizard ──
  if (mode === 'family') {
    const currentForm = skaters[activeSkaterIdx]

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⛸</span>
              <div>
                <h1 className="font-serif font-bold text-slate-900 dark:text-slate-100">Line Creek FSC</h1>
                <p className="text-xs text-slate-500">Family Registration</p>
              </div>
            </div>
            <button onClick={() => setMode('choose')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-400">← Change</button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            {/* Skater list — horizontal scrollable tabs on mobile, vertical sidebar on sm+ */}
            <div className="sm:w-48 sm:shrink-0 sm:space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Skaters</p>

              {/* Mobile: horizontal scroll row */}
              <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
                {skaters.map((s, i) => (
                  <div key={i} className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setActiveSkaterIdx(i); setFamilyStep(1); setFamilyErrors({}) }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSkaterIdx === i ? 'bg-primary text-white' : 'bg-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                    >
                      {s.first_name || `Skater ${i + 1}`}
                    </button>
                    {skaters.length > 1 && (
                      <button onClick={() => removeSkater(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {skaters.length < 10 && (
                  <button
                    onClick={addSkater}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-primary border border-dashed border-primary/40 hover:bg-primary/5 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                )}
              </div>

              {/* Desktop: vertical list */}
              <div className="hidden sm:flex sm:flex-col sm:gap-2">
                {skaters.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => { setActiveSkaterIdx(i); setFamilyStep(1); setFamilyErrors({}) }}
                      className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeSkaterIdx === i ? 'bg-primary text-white' : 'bg-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'}`}
                    >
                      {s.first_name || `Skater ${i + 1}`}
                    </button>
                    {skaters.length > 1 && (
                      <button onClick={() => removeSkater(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {skaters.length < 10 && (
                  <button
                    onClick={addSkater}
                    className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-primary border border-dashed border-primary/40 hover:bg-primary/5 dark:hover:dark:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add skater
                  </button>
                )}
              </div>
            </div>

            {/* Wizard form */}
            <div className="flex-1 min-w-0">
              {familyStep < 5 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    Skater {activeSkaterIdx + 1} of {skaters.length}
                  </p>
                  <StepIndicator current={familyStep} />
                </>
              )}

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                {familyStep === 1 && (
                  <>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-5">Skater Information</h2>
                    <SkaterForm form={currentForm} errors={familyErrors} onChange={(f, v) => setFamilyField(activeSkaterIdx, f, v)} />
                  </>
                )}

                {familyStep === 2 && (
                  <>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-5">Home Address</h2>
                    <AddressForm form={currentForm} errors={familyErrors} onChange={(f, v) => { setFamilyField(activeSkaterIdx, f, v); setFamilyAddrStatus('idle') }} addrStatus={familyAddrStatus} />
                  </>
                )}

                {familyStep === 3 && (
                  <>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-5">Membership Type</h2>
                    {typesLoading && <LoadingSpinner />}
                    {typesError && <ErrorAlert message="Failed to load membership types." />}
                    {membershipTypes && (
                      <div className="space-y-3">
                        {membershipTypes.map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setFamilyField(activeSkaterIdx, 'membership_type_id', type.id)}
                            className={`w-full text-left rounded-lg border-2 p-4 transition-colors ${currentForm.membership_type_id === type.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{type.name}</p>
                                {type.usfs_category && <p className="text-xs text-slate-500 mt-0.5">USFS: {type.usfs_category}</p>}
                              </div>
                              <p className="text-xl font-bold text-primary">${parseFloat(type.price_in_club).toFixed(0)}</p>
                            </div>
                          </button>
                        ))}
                        {familyErrors.membership_type_id && <p className="text-red-500 text-xs">{familyErrors.membership_type_id}</p>}
                      </div>
                    )}
                  </>
                )}

                {familyStep === 4 && (
                  <>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-5">Emergency Contact</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Contact name">
                          <input className={inputCls} value={currentForm.emergency_contact_name} onChange={e => setFamilyField(activeSkaterIdx, 'emergency_contact_name', e.target.value)} />
                        </Field>
                        <Field label="Phone">
                          <input type="tel" className={inputCls} value={currentForm.emergency_contact_phone} onChange={e => setFamilyField(activeSkaterIdx, 'emergency_contact_phone', e.target.value)} />
                        </Field>
                      </div>
                      <Field label="Relationship">
                        <input className={inputCls} placeholder="e.g., Parent, Spouse, Coach" value={currentForm.emergency_contact_relation} onChange={e => setFamilyField(activeSkaterIdx, 'emergency_contact_relation', e.target.value)} />
                      </Field>
                      {isMinor(currentForm.date_of_birth) && (
                        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4 space-y-3 mt-4">
                          <div className="flex items-start gap-2">
                            <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-blue-900 dark:text-blue-300 text-sm">Parental Consent Required (COPPA)</p>
                              <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">This skater is under 13. A parent or legal guardian must consent to collection and use of their personal information.</p>
                            </div>
                          </div>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-0.5 w-4 h-4 accent-primary"
                              checked={currentForm.coppa_consent}
                              onChange={e => setFamilyField(activeSkaterIdx, 'coppa_consent', e.target.checked)}
                            />
                            <span className="text-sm text-blue-900 dark:text-blue-300">I am the parent or legal guardian and consent to registration of this minor.</span>
                          </label>
                          {familyErrors.coppa_consent && <p className="text-red-500 text-xs">{familyErrors.coppa_consent}</p>}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {familyStep === 5 && (
                  <>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-5">Review &amp; Pay</h2>
                    <div className="space-y-3">
                      {skaters.map((s, i) => {
                        const mt = membershipTypes?.find(t => t.id === s.membership_type_id)
                        return (
                          <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-lg px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{s.first_name} {s.last_name}</p>
                              <p className="text-xs text-slate-500">{mt?.name ?? '—'}{isMinor(s.date_of_birth) ? ' · minor' : ''}</p>
                            </div>
                            <p className="font-bold text-primary">${mt ? parseFloat(mt.price_in_club).toFixed(2) : '—'}</p>
                          </div>
                        )
                      })}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">Total</p>
                        <p className="text-2xl font-bold text-primary">
                          ${skaters.reduce((sum, s) => {
                            const mt = membershipTypes?.find(t => t.id === s.membership_type_id)
                            return sum + (mt ? parseFloat(mt.price_in_club) : 0)
                          }, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {familyGlobalError && <ErrorAlert message={familyGlobalError} />}
                    {familyMutation.error && <ErrorAlert message="Registration failed. Please check your details and try again." />}
                    <p className="text-xs text-slate-500 text-center mt-4">You will be redirected to Stripe to complete payment securely.</p>
                  </>
                )}

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                  {familyStep > 1 ? (
                    <button onClick={() => setFamilyStep(s => s - 1)} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:dark:bg-slate-900 transition-colors">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  ) : <div />}

                  {familyStep < 5 ? (
                    <button onClick={nextFamilyStep} disabled={familyAddrStatus === 'checking'} className="flex items-center gap-1.5 px-5 py-2.5 text-sm rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold transition-colors">
                      {familyAddrStatus === 'checking' ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <>Continue <ChevronRight className="w-4 h-4" /></>}
                    </button>
                  ) : (
                    <button
                      onClick={submitFamily}
                      disabled={familyMutation.isPending}
                      className="flex items-center gap-2 px-6 py-2.5 text-sm rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-colors disabled:opacity-60"
                    >
                      <CreditCard className="w-4 h-4" />
                      {familyMutation.isPending ? 'Processing…' : `Pay $${skaters.reduce((sum, s) => {
                        const mt = membershipTypes?.find(t => t.id === s.membership_type_id)
                        return sum + (mt ? parseFloat(mt.price_in_club) : 0)
                      }, 0).toFixed(2)}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── single skater wizard ──
  const selectedType = membershipTypes?.find(t => t.id === form.membership_type_id)
  const minor = isMinor(form.date_of_birth)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⛸</span>
            <div>
              <h1 className="font-serif font-bold text-slate-900 dark:text-slate-100">Line Creek FSC</h1>
              <p className="text-xs text-slate-500">Member Registration</p>
            </div>
          </div>
          <button onClick={() => setMode('choose')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-400">← Change</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator current={step} />

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-5">Skater Information</h2>
              <SkaterForm form={form} errors={errors} onChange={setField} />
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-5">Home Address</h2>
              <AddressForm form={form} errors={errors} onChange={(f, v) => { setField(f, v); setAddrStatus('idle') }} addrStatus={addrStatus} />
            </>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Membership Type</h2>
              {typesLoading && <LoadingSpinner />}
              {typesError && <ErrorAlert message="Failed to load membership types." />}
              {membershipTypes && (
                <div className="space-y-3">
                  {membershipTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setField('membership_type_id', type.id)}
                      className={`w-full text-left rounded-lg border-2 p-4 transition-colors ${form.membership_type_id === type.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{type.name}</p>
                          {type.usfs_category && <p className="text-xs text-slate-500 mt-0.5">USFS: {type.usfs_category}</p>}
                          {type.is_family_plan && <p className="text-xs text-blue-600 mt-0.5">Family plan</p>}
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <p className="text-xl font-bold text-primary">${parseFloat(type.price_in_club).toFixed(0)}</p>
                          <p className="text-xs text-slate-400">per season</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {errors.membership_type_id && <p className="text-red-500 text-xs">{errors.membership_type_id}</p>}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Emergency Contact</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Contact name">
                  <input className={inputCls} value={form.emergency_contact_name} onChange={e => setField('emergency_contact_name', e.target.value)} />
                </Field>
                <Field label="Phone">
                  <input type="tel" className={inputCls} value={form.emergency_contact_phone} onChange={e => setField('emergency_contact_phone', e.target.value)} />
                </Field>
              </div>
              <Field label="Relationship">
                <input className={inputCls} placeholder="e.g., Parent, Spouse, Coach" value={form.emergency_contact_relation} onChange={e => setField('emergency_contact_relation', e.target.value)} />
              </Field>
              {minor && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4 space-y-3 mt-2">
                  <div className="flex items-start gap-2">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-300 text-sm">Parental Consent Required (COPPA)</p>
                      <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">This skater is under 13. Under COPPA and US Figure Skating policy, a parent or legal guardian must consent to collection and use of this skater&apos;s personal information.</p>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 accent-primary" checked={form.coppa_consent} onChange={e => setField('coppa_consent', e.target.checked)} />
                    <span className="text-sm text-blue-900 dark:text-blue-300">I am the parent or legal guardian and consent to registration and use of this minor&apos;s personal information for USFS registration and club membership.</span>
                  </label>
                  {errors.coppa_consent && <p className="text-red-500 text-xs">{errors.coppa_consent}</p>}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Review &amp; Pay</h2>
              <div className="space-y-4 text-sm">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide mb-2">Skater</p>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">{form.first_name} {form.last_name}</p>
                  <p className="text-slate-500">DOB: {form.date_of_birth}</p>
                  {minor && <p className="text-blue-600 text-xs">Minor — parental consent recorded</p>}
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide mb-2">Address</p>
                  <p className="text-slate-900 dark:text-slate-100">{form.address_line1}{form.address_line2 ? `, ${form.address_line2}` : ''}</p>
                  <p className="text-slate-900 dark:text-slate-100">{form.city}, {form.state} {form.zip_code}</p>
                </div>
                {selectedType && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide mb-1">Membership</p>
                        <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedType.name}</p>
                        <p className="text-slate-500 text-xs">{selectedType.usfs_category}</p>
                      </div>
                      <p className="text-2xl font-bold text-primary">${parseFloat(selectedType.price_in_club).toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
              {singleMutation.error && <ErrorAlert message="Registration failed. Please check your details and try again." />}
              <p className="text-xs text-slate-500 text-center">You will be redirected to Stripe to complete payment securely. Membership activates automatically after payment.</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} disabled={singleMutation.isPending} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:dark:bg-slate-900 transition-colors disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < 5 ? (
              <button onClick={nextStep} disabled={addrStatus === 'checking'} className="flex items-center gap-1.5 px-5 py-2.5 text-sm rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold transition-colors">
                {addrStatus === 'checking' ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <>Continue <ChevronRight className="w-4 h-4" /></>}
              </button>
            ) : (
              <button onClick={submitSingle} disabled={singleMutation.isPending} className="flex items-center gap-2 px-6 py-2.5 text-sm rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-colors disabled:opacity-60">
                {singleMutation.isPending ? 'Processing…' : (
                  <><CreditCard className="w-4 h-4" /> Pay ${selectedType ? parseFloat(selectedType.price_in_club).toFixed(2) : '—'}</>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

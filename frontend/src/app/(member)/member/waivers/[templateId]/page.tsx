'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import type { WaiverTemplate, WaiverSignResponse, WaiverStatus } from '@/types/waiver'
import type { SkaterList, PaginatedResponse } from '@/types/skater'
import type { AxiosError } from 'axios'

interface ApiError {
  detail?: string
  agreed?: string[]
  template_id?: string[]
  skater_id?: string[]
  signed_by?: string[]
  non_field_errors?: string[]
}

function useWaiverTemplate(templateId: string) {
  return useQuery({
    queryKey: ['waiver-template', templateId],
    queryFn: async () => {
      // Fetch all templates and find the one matching templateId
      const res = await api.get<WaiverTemplate[]>('/api/v1/waivers/templates/')
      const found = res.data.find(t => t.id === templateId)
      if (!found) throw new Error('Waiver template not found.')
      return found
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!templateId,
  })
}

function useAvailableSkaters() {
  return useQuery({
    queryKey: ['all-my-skaters'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<SkaterList>>('/api/v1/members/')
      return res.data.results
    },
    staleTime: 5 * 60 * 1000,
  })
}

function extractErrorMessage(err: AxiosError<ApiError>): string {
  const data = err.response?.data
  if (!data) return 'An unexpected error occurred.'
  if (data.detail) return data.detail
  if (data.signed_by) return data.signed_by[0]
  if (data.skater_id) return data.skater_id[0]
  if (data.template_id) return data.template_id[0]
  if (data.agreed) return data.agreed[0]
  if (data.non_field_errors) return data.non_field_errors[0]
  return 'Failed to submit waiver. Please try again.'
}

export default function WaiverSignPage() {
  const params = useParams<{ templateId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const templateId = params.templateId
  const preselectedSkaterId = searchParams.get('skater') ?? ''

  const { data: template, isLoading: templateLoading, error: templateError } = useWaiverTemplate(templateId)
  const { data: ownSkater, isLoading: ownLoading } = useMemberProfile()
  const { data: allSkaters = [], isLoading: skatersLoading } = useAvailableSkaters()

  // Build the skater list (own + managed), deduped
  const skaterOptions: SkaterList[] = []
  const seen = new Set<string>()

  if (ownSkater) {
    seen.add(ownSkater.id)
    skaterOptions.push({
      id: ownSkater.id,
      first_name: ownSkater.first_name,
      last_name: ownSkater.last_name,
      usfs_number: ownSkater.usfs_number,
      membership_status: ownSkater.membership_status,
      membership_expiry: ownSkater.membership_expiry,
      is_minor: ownSkater.is_minor,
    })
  }

  for (const s of allSkaters) {
    if (!seen.has(s.id)) {
      seen.add(s.id)
      skaterOptions.push(s)
    }
  }

  const defaultSkaterId =
    preselectedSkaterId && skaterOptions.some(s => s.id === preselectedSkaterId)
      ? preselectedSkaterId
      : skaterOptions[0]?.id ?? ''

  const [selectedSkaterId, setSelectedSkaterId] = useState<string>(defaultSkaterId)
  const [agreed, setAgreed] = useState(false)
  const [signed, setSigned] = useState(false)

  // Update selected skater once options are loaded
  const effectiveSkater = selectedSkaterId || defaultSkaterId

  const { mutate: signWaiver, isPending, error: signError } = useMutation<
    WaiverSignResponse,
    AxiosError<ApiError>,
    { template_id: string; skater_id: string; agreed: boolean }
  >({
    mutationFn: async (payload) => {
      const res = await api.post<WaiverSignResponse>('/api/v1/waivers/sign/', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiver-status'] })
      setSigned(true)
    },
  })

  // Check if already signed for this skater this season
  const { data: statusList = [] } = useQuery({
    queryKey: ['waiver-status', effectiveSkater],
    queryFn: async () => {
      const res = await api.get<WaiverStatus[]>('/api/v1/waivers/status/', {
        params: { skater: effectiveSkater },
      })
      return res.data
    },
    enabled: !!effectiveSkater,
    staleTime: 2 * 60 * 1000,
  })

  const alreadySigned = statusList.some(
    s => s.template_id === templateId && s.signed
  )

  const isLoading = templateLoading || ownLoading || skatersLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/6" />
        </div>
      </div>
    )
  }

  if (templateError || !template) {
    return (
      <div className="space-y-4">
        <Link href="/member/waivers" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft size={15} />
          Back to Waivers
        </Link>
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">Waiver not found or is no longer active.</p>
        </div>
      </div>
    )
  }

  if (signed) {
    return (
      <div className="space-y-5">
        <Link href="/member/waivers" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft size={15} />
          Back to Waivers
        </Link>
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center space-y-3">
          <CheckCircle size={40} className="text-emerald-500 mx-auto" />
          <div>
            <p className="font-bold text-emerald-800 text-lg">Waiver Signed</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
              Your signature for &quot;{template.title}&quot; has been recorded.
            </p>
          </div>
          <button
            onClick={() => router.push('/member/waivers')}
            className="mt-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  const selectedSkater = skaterOptions.find(s => s.id === effectiveSkater)
  const currentSeason = new Date().getFullYear()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed || !effectiveSkater) return
    signWaiver({ template_id: templateId, skater_id: effectiveSkater, agreed })
  }

  return (
    <div className="space-y-5">
      <Link
        href="/member/waivers"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:dark:text-slate-300 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Waivers
      </Link>

      <div className="flex items-start gap-3">
        <FileText size={22} className="text-slate-400 shrink-0 mt-0.5" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{template.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Version {template.version} &middot; {currentSeason} season
          </p>
        </div>
      </div>

      {/* Skater selector (shown when user manages multiple skaters) */}
      {skaterOptions.length > 1 && (
        <div>
          <label htmlFor="skater-select" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
            Signing on behalf of
          </label>
          <select
            id="skater-select"
            value={effectiveSkater}
            onChange={e => setSelectedSkaterId(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          >
            {skaterOptions.map(s => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
                {s.is_minor ? ' (Minor)' : ''}
              </option>
            ))}
          </select>
          {selectedSkater?.is_minor && template.requires_guardian_signature && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertCircle size={12} />
              As guardian, your signature will be recorded for this minor skater.
            </p>
          )}
        </div>
      )}

      {/* Guardian note for single-skater view */}
      {skaterOptions.length === 1 && selectedSkater?.is_minor && template.requires_guardian_signature && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            You are signing this waiver as the guardian of{' '}
            <strong>{selectedSkater.first_name} {selectedSkater.last_name}</strong>.
            Your consent will be recorded on their behalf.
          </p>
        </div>
      )}

      {/* Already signed banner */}
      {alreadySigned && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            This waiver has already been signed for the {currentSeason} season.
          </p>
        </div>
      )}

      {/* Waiver body */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Waiver Text</p>
        </div>
        <div
          className="px-5 py-5 prose prose-sm prose-slate max-w-none text-slate-700 dark:text-slate-300 leading-relaxed max-h-96 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: template.body }}
        />
      </div>

      {/* Sign form */}
      {!alreadySigned && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="sr-only peer"
                id="agree-checkbox"
              />
              <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                {agreed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-slate-700 group-hover:text-slate-900 dark:group-hover:dark:text-slate-100 transition-colors leading-snug">
              I have read and agree to the terms above.
              {selectedSkater?.is_minor && template.requires_guardian_signature && (
                <> I am the legal guardian of <strong>{selectedSkater.first_name} {selectedSkater.last_name}</strong> and consent on their behalf.</>
              )}
            </span>
          </label>

          {signError && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-start gap-2">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">{extractErrorMessage(signError)}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!agreed || isPending || !effectiveSkater}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Submitting...
              </>
            ) : (
              'Sign Waiver'
            )}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Your signature, IP address, and timestamp will be recorded for audit purposes.
          </p>
        </form>
      )}

      {alreadySigned && (
        <Link
          href="/member/waivers"
          className="w-full flex items-center justify-center py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:dark:bg-slate-900 transition-colors"
        >
          Back to all waivers
        </Link>
      )}
    </div>
  )
}

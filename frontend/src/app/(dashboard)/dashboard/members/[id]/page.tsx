'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSkater, useSkaterCompetitionHistory } from '@/hooks/useSkaters'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ArrowLeft, Trophy, User, MapPin, Phone, AlertTriangle, Calendar, RefreshCw } from 'lucide-react'

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-900">{value}</dd>
    </div>
  )
}

function CompetitionHistoryTable() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useSkaterCompetitionHistory(id)

  if (isLoading) return <LoadingSpinner className="py-6" />
  if (error) {
    const msg = (error as { response?: { status?: number } }).response?.status === 403
      ? 'Competition history requires parental consent for minors.'
      : 'Failed to load competition history.'
    return <ErrorAlert message={msg} />
  }
  if (!data || data.history.length === 0) {
    return <p className="text-slate-500 text-sm py-4">No competition history on record.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Competition</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Event</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Placement</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.history.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                {item.date ? new Date(item.date).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-slate-900 font-medium">{item.competition}</td>
              <td className="px-4 py-3 text-slate-600">{item.event}</td>
              <td className="px-4 py-3">
                {item.placement != null ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                    <Trophy className="w-3.5 h-3.5" />
                    {item.placement}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                {item.score != null ? item.score.toFixed(2) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SkaterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: skater, isLoading, error } = useSkater(id)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorAlert message="Failed to load skater profile." />
  if (!skater) return null

  const fullName = skater.preferred_name
    ? `${skater.preferred_name} ${skater.last_name}`
    : `${skater.first_name} ${skater.last_name}`
  const dob = skater.date_of_birth
    ? new Date(skater.date_of_birth + 'T00:00:00').toLocaleDateString()
    : null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="flex items-center gap-3">
            {fullName}
            {skater.is_minor && (
              <span className="text-xs font-normal bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Minor</span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">USFS #{skater.usfs_number || 'Not assigned'}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={skater.membership_status} />
          <Link
            href={`/dashboard/members/${id}/renew`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={14} />
            Renew
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4">
              <User className="w-4 h-4 text-slate-400" />
              Profile
            </h2>
            <dl>
              <InfoRow label="Full name" value={`${skater.first_name} ${skater.middle_name || ''} ${skater.last_name}`.replace(/\s+/g, ' ').trim()} />
              <InfoRow label="Preferred name" value={skater.preferred_name} />
              <InfoRow label="Date of birth" value={dob} />
              <InfoRow label="Gender" value={skater.gender || undefined} />
              <InfoRow label="Email" value={skater.email} />
              <InfoRow label="Phone" value={skater.phone} />
              <InfoRow label="USFS number" value={skater.usfs_number} />
              <InfoRow label="Name pronunciation" value={skater.name_pronunciation} />
            </dl>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4">
              <MapPin className="w-4 h-4 text-slate-400" />
              Address
            </h2>
            <dl>
              <InfoRow label="Address" value={[skater.address_line1, skater.address_line2].filter(Boolean).join(', ')} />
              <InfoRow label="City / State / Zip" value={[skater.city, skater.state, skater.zip_code].filter(Boolean).join(', ')} />
            </dl>
          </div>

          {(skater.emergency_contact_name || skater.medical_notes) && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4">
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                Emergency &amp; Medical
              </h2>
              <dl>
                <InfoRow label="Emergency contact" value={skater.emergency_contact_name} />
                <InfoRow label="Relationship" value={skater.emergency_contact_relation} />
                <InfoRow label="Phone" value={skater.emergency_contact_phone} />
                <InfoRow label="Medical notes" value={skater.medical_notes} />
              </dl>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4">
              <Calendar className="w-4 h-4 text-slate-400" />
              Membership
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</dt>
                <dd><StatusBadge status={skater.membership_status} /></dd>
              </div>
              {skater.membership_type_display && (
                <div>
                  <dt className="text-xs text-slate-500 uppercase tracking-wide mb-1">Type</dt>
                  <dd className="text-sm text-slate-900">{skater.membership_type_display.name}</dd>
                </div>
              )}
              {skater.membership_expiry && (
                <div>
                  <dt className="text-xs text-slate-500 uppercase tracking-wide mb-1">Expires</dt>
                  <dd className="text-sm text-slate-900">{new Date(skater.membership_expiry).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {skater.managed_by && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
                <Phone className="w-4 h-4 text-slate-400" />
                Guardian
              </h2>
              <p className="text-sm text-slate-900">{skater.managed_by}</p>
              {skater.managed_by_email && (
                <p className="text-sm text-slate-500 mt-1">{skater.managed_by_email}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Competition history */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4">
          <Trophy className="w-4 h-4 text-slate-400" />
          Competition History
        </h2>
        <CompetitionHistoryTable />
      </div>
    </div>
  )
}

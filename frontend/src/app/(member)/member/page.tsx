'use client'

import Link from 'next/link'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { RefreshCw, User, MapPin, Phone, LogOut } from 'lucide-react'
import { logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'

function MembershipCard({ skater }: { skater: NonNullable<ReturnType<typeof useMemberProfile>['data']> }) {
  const isExpiringSoon = skater.membership_expiry
    ? new Date(skater.membership_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false
  const isExpired = skater.membership_status === 'expired'

  return (
    <div className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden ${
      isExpired ? 'bg-slate-600' : 'bg-gradient-to-br from-primary via-primary to-accent'
    }`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-12 -translate-x-10" />

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Line Creek FSC</p>
            <p className="text-xl font-bold">{skater.first_name} {skater.last_name}</p>
          </div>
          <span className="text-3xl">⛸</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-white/60 text-xs mb-0.5">USFS Number</p>
            <p className="font-mono font-semibold">{skater.usfs_number || 'Pending'}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs mb-0.5">Membership</p>
            <p className="font-semibold">{skater.membership_type_display?.name || '—'}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs mb-0.5">Status</p>
            <p className={`font-semibold capitalize ${isExpired ? 'text-red-300' : isExpiringSoon ? 'text-yellow-300' : 'text-green-300'}`}>
              {skater.membership_status}
            </p>
          </div>
          {skater.membership_expiry && (
            <div>
              <p className="text-white/60 text-xs mb-0.5">Expires</p>
              <p className={`font-semibold ${isExpiringSoon ? 'text-yellow-300' : ''}`}>
                {new Date(skater.membership_expiry).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MemberPage() {
  const { data: skater, isLoading, error } = useMemberProfile()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  if (isLoading) return (
    <div className="flex justify-center py-20"><LoadingSpinner /></div>
  )

  if (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 404) {
      return (
        <div className="space-y-4">
          <ErrorAlert message="No membership profile linked to your account. Please contact your club administrator." />
          <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Sign out</button>
        </div>
      )
    }
    return <ErrorAlert message="Failed to load your profile." />
  }

  if (!skater) return null

  const isExpiringSoon = skater.membership_expiry
    ? new Date(skater.membership_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false

  return (
    <div className="space-y-6">
      <MembershipCard skater={skater} />

      {/* Renewal CTA */}
      {(skater.membership_status === 'expired' || isExpiringSoon) && (
        <div className={`rounded-xl p-4 flex items-center justify-between ${
          skater.membership_status === 'expired'
            ? 'bg-red-50 border border-red-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div>
            <p className={`text-sm font-semibold ${skater.membership_status === 'expired' ? 'text-red-800' : 'text-amber-800'}`}>
              {skater.membership_status === 'expired' ? 'Membership expired' : 'Expiring soon'}
            </p>
            <p className={`text-xs mt-0.5 ${skater.membership_status === 'expired' ? 'text-red-600' : 'text-amber-600'}`}>
              Renew to maintain your USFS standing
            </p>
          </div>
          <Link
            href={`/member/renew`}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <RefreshCw size={14} />
            Renew
          </Link>
        </div>
      )}

      {/* Profile details */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
        <div className="px-5 py-4 flex items-center gap-3">
          <User size={16} className="text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Full name</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{skater.first_name} {skater.middle_name || ''} {skater.last_name}</p>
          </div>
        </div>
        {skater.date_of_birth && (
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-4 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Date of birth</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {new Date(skater.date_of_birth + 'T00:00:00').toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
        {skater.email && (
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-4 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{skater.email}</p>
            </div>
          </div>
        )}
        {skater.address_line1 && (
          <div className="px-5 py-4 flex items-center gap-3">
            <MapPin size={16} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Address</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {[skater.address_line1, skater.city, skater.state].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        )}
        {skater.emergency_contact_name && (
          <div className="px-5 py-4 flex items-center gap-3">
            <Phone size={16} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Emergency contact</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {skater.emergency_contact_name}
                {skater.emergency_contact_phone ? ` · ${skater.emergency_contact_phone}` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Link
          href="/member/renew"
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={16} />
          Renew Membership
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm hover:bg-slate-50 dark:hover:dark:bg-slate-900 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  )
}

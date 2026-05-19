'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Users, CheckCircle2, XCircle, Loader2, Plus } from 'lucide-react'
import api from '@/lib/api'

interface ClubSummary {
  id: string
  name: string
  slug: string
  city: string
  state: string
  is_active: boolean
  stripe_onboarding_complete: boolean
  member_count: number
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<ClubSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<ClubSummary[]>('/api/v1/super-admin/clubs/')
      .then(r => setClubs(r.data))
      .catch(() => setError('Failed to load clubs.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-violet-400" />
    </div>
  )

  if (error) return (
    <div className="rounded-lg bg-red-900/20 border border-red-700/40 p-4 text-red-300 text-sm">{error}</div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clubs</h1>
          <p className="text-slate-400 text-sm mt-1">{clubs.length} club{clubs.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Link
          href="/super-admin/onboard"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Onboard Club
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clubs.map((club) => (
          <Link
            key={club.id}
            href={`/super-admin/clubs/${club.id}`}
            className="block rounded-xl bg-slate-800 border border-slate-700 hover:border-violet-500/60 transition-colors p-5 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                  {club.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {[club.city, club.state].filter(Boolean).join(', ') || club.slug}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                club.is_active
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                  : 'bg-slate-700 text-slate-400 border border-slate-600'
              }`}>
                {club.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Users size={14} className="text-slate-400" />
                <span>{club.member_count} members</span>
              </div>
              <div className="flex items-center gap-1.5">
                {club.stripe_onboarding_complete ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">Stripe active</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} className="text-amber-400" />
                    <span className="text-xs text-amber-400">Stripe pending</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}

        {clubs.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-500">
            <Building2 size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No clubs yet.</p>
            <Link href="/super-admin/onboard" className="mt-3 text-sm text-violet-400 hover:text-violet-300 underline">
              Onboard your first club
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

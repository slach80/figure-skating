'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface ClubSummary {
  id: string
  name: string
  slug: string
  city: string
  state: string
  is_active: boolean
  stripe_onboarding_complete: boolean
  stripe_account_id: string
  member_count: number
  created_at: string
}

interface UserSummary {
  id: number
}

export default function SuperAdminDashboardPage() {
  const [clubs, setClubs] = useState<ClubSummary[]>([])
  const [totalUsers, setTotalUsers] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [clubsRes, usersRes] = await Promise.all([
          api.get<ClubSummary[]>('/api/v1/super-admin/clubs/'),
          api.get<UserSummary[]>('/api/v1/super-admin/users/'),
        ])
        setClubs(clubsRes.data)
        setTotalUsers(usersRes.data.length)
      } catch {
        setError('Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 border border-red-700/40 p-4 text-red-300 text-sm">
        {error}
      </div>
    )
  }

  const totalMembers = clubs.reduce((sum, c) => sum + c.member_count, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="text-slate-400 text-sm mt-1">All clubs and users across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Building2 size={20} className="text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Total Clubs</p>
              <p className="text-3xl font-bold text-white">{clubs.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 border border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
              <Users size={20} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Total Users</p>
              <p className="text-3xl font-bold text-white">{totalUsers ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 border border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
              <Users size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Total Members</p>
              <p className="text-3xl font-bold text-white">{totalMembers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Club cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Clubs</h2>
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
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    club.is_active
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                      : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}
                >
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
        </div>
      </div>
    </div>
  )
}

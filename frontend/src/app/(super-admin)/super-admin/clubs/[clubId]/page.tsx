'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, UserCheck, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'

interface ClubDetail {
  id: string
  name: string
  slug: string
  email: string
  city: string
  state: string
  is_active: boolean
  stripe_onboarding_complete: boolean
  stripe_account_id: string
  member_count: number
  created_at: string
}

interface ClubUser {
  id: number
  uuid: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone: string
  is_active: boolean
  club: string | null
  club_name: string | null
  date_joined: string
}

const ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  coach: 'Coach',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

const ROLE_COLORS: Record<string, string> = {
  member: 'bg-slate-700 text-slate-300 border-slate-600',
  coach: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  admin: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  super_admin: 'bg-violet-900/40 text-violet-300 border-violet-700/40',
}

export default function ClubDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clubId = params.clubId as string

  const [club, setClub] = useState<ClubDetail | null>(null)
  const [users, setUsers] = useState<ClubUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [impersonateSuccess, setImpersonateSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [clubsRes, usersRes] = await Promise.all([
        api.get<ClubDetail[]>('/api/v1/super-admin/clubs/'),
        api.get<ClubUser[]>(`/api/v1/super-admin/users/?club=${clubId}`),
      ])
      const found = clubsRes.data.find((c) => c.id === clubId) ?? null
      setClub(found)
      setUsers(usersRes.data)
    } catch {
      setError('Failed to load club data.')
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    load()
  }, [load])

  async function handleImpersonate(user: ClubUser) {
    setImpersonating(user.uuid)
    setImpersonateSuccess(null)
    try {
      const res = await api.post<{ access: string }>('/api/v1/super-admin/impersonate/', {
        user_id: user.uuid,
      })
      // Store impersonation token; keep original token so super-admin can return
      const originalToken = localStorage.getItem('access_token')
      if (originalToken) {
        localStorage.setItem('super_admin_token', originalToken)
      }
      localStorage.setItem('access_token', res.data.access)
      document.cookie = `access_token=${res.data.access}; path=/; SameSite=Lax`
      setImpersonateSuccess(user.uuid)
      // Short delay so user sees the success state, then navigate
      setTimeout(() => {
        router.push('/home')
      }, 600)
    } catch {
      setError(`Failed to impersonate user ${user.email}.`)
    } finally {
      setImpersonating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        <div className="rounded-lg bg-red-900/20 border border-red-700/40 p-4 text-red-300 text-sm">
          {error}
        </div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="space-y-4">
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        <p className="text-slate-400">Club not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/super-admin"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      {/* Club header */}
      <div className="rounded-xl bg-slate-800 border border-slate-700 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{club.name}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {[club.city, club.state].filter(Boolean).join(', ')}
              {club.email ? ` · ${club.email}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                club.is_active
                  ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40'
                  : 'bg-slate-700 text-slate-400 border-slate-600'
              }`}
            >
              {club.is_active ? 'Active' : 'Inactive'}
            </span>
            <span
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                club.stripe_onboarding_complete
                  ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40'
                  : 'bg-amber-900/40 text-amber-400 border-amber-700/40'
              }`}
            >
              {club.stripe_onboarding_complete ? (
                <CheckCircle2 size={12} />
              ) : (
                <XCircle size={12} />
              )}
              Stripe {club.stripe_onboarding_complete ? 'active' : 'pending'}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Slug</p>
            <p className="text-sm text-slate-200 font-mono mt-0.5">{club.slug}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Members</p>
            <p className="text-sm text-slate-200 mt-0.5">{club.member_count}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Stripe Account</p>
            <p className="text-sm text-slate-200 font-mono mt-0.5 truncate">
              {club.stripe_account_id || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Created</p>
            <p className="text-sm text-slate-200 mt-0.5">
              {new Date(club.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          Users{' '}
          <span className="text-slate-400 font-normal text-base">({users.length})</span>
        </h2>

        {users.length === 0 ? (
          <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center text-slate-400">
            No users in this club yet.
          </div>
        ) : (
          <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Name / Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                    Joined
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden md:table-cell">
                    Status
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-white font-medium">
                          {[user.first_name, user.last_name].filter(Boolean).join(' ') ||
                            '(no name)'}
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          ROLE_COLORS[user.role] ?? 'bg-slate-700 text-slate-300 border-slate-600'
                        }`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs hidden sm:table-cell">
                      {new Date(user.date_joined).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span
                        className={`text-xs font-medium ${
                          user.is_active ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleImpersonate(user)}
                        disabled={impersonating === user.uuid || impersonateSuccess === user.uuid}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          bg-violet-600/20 text-violet-300 border border-violet-600/30
                          hover:bg-violet-600/40 hover:text-white hover:border-violet-500
                          disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {impersonating === user.uuid ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Impersonating…
                          </>
                        ) : impersonateSuccess === user.uuid ? (
                          <>
                            <CheckCircle2 size={12} className="text-emerald-400" />
                            <span className="text-emerald-300">Done</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={12} />
                            Impersonate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import api from '@/lib/api'

interface UserSummary {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  club_name: string | null
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-violet-900/40 text-violet-300 border-violet-700/40',
  admin:       'bg-indigo-900/40 text-indigo-300 border-indigo-700/40',
  coach:       'bg-blue-900/40 text-blue-300 border-blue-700/40',
  member:      'bg-slate-700 text-slate-300 border-slate-600',
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get<UserSummary[]>('/api/v1/super-admin/users/')
      .then(r => setUsers(r.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.club_name?.toLowerCase().includes(q)
    )
  })

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
          <h1 className="text-2xl font-bold text-white">All Users</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} users across all clubs</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email or club…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Club</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {filtered.map(u => (
              <tr key={u.id} className="bg-slate-900 hover:bg-slate-800/60 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                  </p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[u.role] ?? ROLE_COLORS.member}`}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{u.club_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                    u.is_active
                      ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40'
                      : 'bg-slate-700 text-slate-500 border-slate-600'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-500 text-sm">
                  {search ? 'No users match your search.' : 'No users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

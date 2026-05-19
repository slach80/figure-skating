'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSkaters } from '@/hooks/useSkaters'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Search, ChevronLeft, ChevronRight, Users, UserPlus, Download } from 'lucide-react'
import api from '@/lib/api'

async function downloadUsfsExport() {
  const res = await api.get('/api/v1/members/export-usfs-csv/', { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
  const a = document.createElement('a')
  a.href = url
  a.download = `usfs_export_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

export default function MembersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useSkaters(page, search)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Members</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">Manage club members and their memberships</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadUsfsExport}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:dark:bg-slate-900 transition-colors"
          >
            <Download className="w-4 h-4" />
            USFS Export
          </button>
          <Link
            href="/register"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Register Member
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search by name or USFS number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-slate-800"
        />
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorAlert message="Failed to load members. Please check your connection and try again." />}

      {data && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">USFS #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Expiry</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Minor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.results.map((skater) => (
                    <tr key={skater.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/members/${skater.id}`}
                          className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors"
                        >
                          {skater.first_name} {skater.last_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">{skater.usfs_number || '—'}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={skater.membership_status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {skater.membership_expiry
                          ? new Date(skater.membership_expiry).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {skater.is_minor ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.results.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No members found</p>
                {search && <p className="text-sm mt-1">Try adjusting your search</p>}
              </div>
            )}
          </div>

          {(data.previous || data.next) && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Page {page}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!data.previous}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:dark:bg-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.next}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:dark:bg-slate-900 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

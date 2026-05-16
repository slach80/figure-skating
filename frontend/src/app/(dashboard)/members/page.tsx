'use client'

import { useSkaters } from '@/hooks/useSkaters'
import clsx from 'clsx'
import { Loader2, AlertCircle } from 'lucide-react'

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    active: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      dot: 'bg-green-500',
    },
    pending: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500',
    },
    expired: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
    },
    suspended: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
      dot: 'bg-gray-500',
    },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border',
        config.bg,
        config.text,
        config.border
      )}
    >
      <div className={clsx('w-2 h-2 rounded-full', config.dot)}></div>
      <span className="capitalize">{status}</span>
    </div>
  )
}

export default function MembersPage() {
  const { data, isLoading, error } = useSkaters(1)

  return (
    <div className="space-y-6">
      <div>
        <h1>Members</h1>
        <p className="text-slate-600 mt-2">Manage club members and their memberships</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-slate-600">Loading members...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load members</h3>
            <p className="text-red-700 text-sm mt-1">Please check your connection and try again.</p>
          </div>
        </div>
      )}

      {data && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">USFS #</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Expiry</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Minor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.results.map((skater) => (
                  <tr
                    key={skater.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {skater.first_name} {skater.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{skater.usfs_number || '-'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={skater.membership_status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {skater.membership_expiry
                        ? new Date(skater.membership_expiry).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{skater.is_minor ? 'Yes' : 'No'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">No members found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

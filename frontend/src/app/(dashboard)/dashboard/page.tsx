'use client'

import Link from 'next/link'
import { useDashboardStats } from '@/hooks/useDashboard'
import { useSkaters } from '@/hooks/useSkaters'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Users, Clock, AlertCircle, TrendingUp } from 'lucide-react'

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  isLoading,
}: {
  label: string
  value: number | undefined
  icon: React.ElementType
  colorClass: string
  isLoading: boolean
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{label}</p>
          <p className={`text-4xl font-bold mt-2 ${colorClass}`}>
            {isLoading ? (
              <span className="inline-block w-12 h-9 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              (value ?? 0)
            )}
          </p>
        </div>
        <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-900`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recentMembers } = useSkaters(1)

  return (
    <div className="space-y-8">
      <div>
        <h1>Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">Welcome to Line Creek FSC management platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Active Members" value={stats?.active_members} icon={Users} colorClass="text-primary" isLoading={statsLoading} />
        <StatCard label="Pending Renewals" value={stats?.pending_renewals} icon={Clock} colorClass="text-amber-500" isLoading={statsLoading} />
        <StatCard label="Expiring Soon" value={stats?.expiring_soon} icon={AlertCircle} colorClass="text-red-500" isLoading={statsLoading} />
        <StatCard label="Total Members" value={stats?.total_members} icon={TrendingUp} colorClass="text-slate-700 dark:text-slate-300" isLoading={statsLoading} />
      </div>

      {recentMembers && recentMembers.results.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Members</h2>
            <Link href="/dashboard/members" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentMembers.results.slice(0, 5).map((skater) => (
              <Link
                key={skater.id}
                href={`/dashboard/members/${skater.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:dark:bg-slate-900 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {skater.first_name} {skater.last_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{skater.usfs_number || 'No USFS #'}</p>
                </div>
                <StatusBadge status={skater.membership_status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

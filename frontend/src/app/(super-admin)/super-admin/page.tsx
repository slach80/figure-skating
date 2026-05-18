'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlusSquare, Loader2 } from 'lucide-react'
import { getTokenRole } from '@/lib/auth'

export default function SuperAdminOverviewPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const role = getTokenRole()
    if (role !== 'super_admin') {
      router.replace('/login')
    } else {
      setAuthChecked(true)
    }
  }, [router])

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Super Admin Overview</h1>
        <p className="text-slate-500 mt-1 text-sm">
          System-wide administration for all clubs on the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/super-admin/onboard"
          className="group bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:border-violet-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-violet-100 rounded-lg text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <PlusSquare size={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
                Onboard New Club
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Create a club and its first admin account.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

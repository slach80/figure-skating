'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlusSquare, LayoutGrid } from 'lucide-react'
import { LogoutButton } from '@/components/ui/LogoutButton'

const NAV = [
  { href: '/super-admin', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/super-admin/onboard', label: 'Onboard Club', icon: PlusSquare },
]

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⛸</span>
            <div>
              <p className="font-serif font-bold text-lg leading-tight">Ice Skating</p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 1.75} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10">
          <p className="text-sm font-semibold text-slate-700">Super Admin Panel</p>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}

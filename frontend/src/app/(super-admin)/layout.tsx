'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, Shield, LogOut, Globe } from 'lucide-react'
import Link from 'next/link'
import { getTokenRole, logout } from '@/lib/auth'
import { NavLink } from '@/components/ui/NavLink'

const NAV = [
  { href: '/super-admin', label: 'Dashboard', icon: Shield, exact: true },
  { href: '/super-admin/clubs', label: 'Clubs', icon: Building2 },
  { href: '/super-admin/users', label: 'All Users', icon: Users },
]

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const role = getTokenRole()
    if (role !== 'super_admin') {
      router.replace('/login')
    }
  }, [router])

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <Link href="/home" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">Super Admin</p>
              <p className="text-xs text-slate-400">Platform Control</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              exact={item.exact}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-1">
          <Link
            href="/home"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Globe size={18} />
            Club Site
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-900/60 text-slate-300 hover:text-white"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-950">
        <header className="bg-slate-900 border-b border-slate-700 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 tracking-wide uppercase">
              Line Creek FSC — Platform Admin
            </h2>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-600/20 border border-violet-500/30">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-xs font-medium text-violet-300">Super Admin</span>
            </div>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}

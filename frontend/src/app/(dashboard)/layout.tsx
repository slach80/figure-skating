'use client'

import { BarChart3, Users, Calendar, CreditCard, Mail, Settings, Trophy } from 'lucide-react'
import Link from 'next/link'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { NavLink } from '@/components/ui/NavLink'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3, exact: true },
    { href: '/dashboard/members', label: 'Members', icon: Users },
    { href: '/dashboard/schedule', label: 'Schedule', icon: Calendar },
    { href: '/dashboard/competitions', label: 'Competitions', icon: Trophy },
    { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
    { href: '/dashboard/communications', label: 'Communications', icon: Mail },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-slate-light">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-dark text-white border-r border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <Link href="/home" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="text-3xl">⛸</div>
            <h1 className="font-serif text-xl font-bold">Line Creek FSC</h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} exact={item.exact} />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-slate-700">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-dark">Club Management</h2>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-serif font-bold">
                LC
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}

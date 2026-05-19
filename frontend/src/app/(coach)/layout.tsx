'use client'

import Link from 'next/link'
import { CalendarDays, Users, ClipboardList, Star } from 'lucide-react'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { NavLink } from '@/components/ui/NavLink'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const navItems = [
  { href: '/coach', label: "Today's Schedule", icon: CalendarDays, exact: true },
  { href: '/coach/students', label: 'My Students', icon: Users },
  { href: '/coach/notes', label: 'Session Notes', icon: ClipboardList },
  { href: '/coach/evaluations', label: 'Evaluations', icon: Star },
]

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950">
      <aside className="w-60 bg-slate-800 dark:bg-slate-900 text-white flex flex-col">
        <div className="p-5 border-b border-slate-700">
          <Link href="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">⛸</span>
            <div>
              <p className="font-serif font-bold text-base leading-tight">Line Creek FSC</p>
              <p className="text-xs text-slate-400">Coach Portal</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} exact={item.exact} />
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Coach Portal</h2>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-73px)]">{children}</div>
      </main>
    </div>
  )
}

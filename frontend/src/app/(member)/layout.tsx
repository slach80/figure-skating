'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, CreditCard, Users, Trophy, FileText } from 'lucide-react'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useMemberProfile } from '@/hooks/useMemberProfile'

const NAV = [
  { href: '/member', label: 'Home', icon: Home },
  { href: '/member/lessons', label: 'Lessons', icon: CalendarDays },
  { href: '/member/competitions', label: 'Competitions', icon: Trophy },
  { href: '/member/payments', label: 'Payments', icon: CreditCard },
  { href: '/member/family', label: 'Family', icon: Users },
  { href: '/member/waivers', label: 'Waivers', icon: FileText },
]

export default function MemberLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { data: skater } = useMemberProfile()

  const skaterName = skater
    ? (skater.preferred_name || skater.first_name) + ' ' + skater.last_name
    : null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 md:pb-0">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo — links to home page */}
          <Link href="/home" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-2xl">⛸</span>
            <div>
              <p className="font-serif font-bold text-slate-900 dark:text-white leading-tight">Line Creek FSC</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {skaterName ?? 'Member Portal'}
              </p>
            </div>
          </Link>

          {/* Desktop top nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(item => {
              const isActive = item.href === '/member'
                ? pathname === '/member'
                : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 1.75} />
                  {item.label}
                </Link>
              )
            })}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:px-6">
        {children}
      </main>

      <InstallPrompt />

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="max-w-lg mx-auto flex">
          {NAV.map(item => {
            const isActive = item.href === '/member'
              ? pathname === '/member'
              : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 pt-3 pb-2 text-xs transition-colors ${
                  isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

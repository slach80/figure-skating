'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, CreditCard, Users, Trophy } from 'lucide-react'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'

const NAV = [
  { href: '/member', label: 'Home', icon: Home },
  { href: '/member/lessons', label: 'Lessons', icon: CalendarDays },
  { href: '/member/competitions', label: 'Competitions', icon: Trophy },
  { href: '/member/payments', label: 'Payments', icon: CreditCard },
  { href: '/member/family', label: 'Family', icon: Users },
]

export default function MemberLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⛸</span>
            <div>
              <p className="font-serif font-bold text-slate-900 leading-tight">Line Creek FSC</p>
              <p className="text-xs text-slate-500">Member Portal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>

      <InstallPrompt />

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-10">
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
                className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
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

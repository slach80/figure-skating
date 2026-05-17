'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="bg-primary text-white py-2 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <span className="text-white/70">KC MOMENTUM Synchronized Skating Team</span>
          <Link href="/login" className="hover:text-accent transition-colors hidden md:block">Sign In</Link>
        </div>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link href="/home" className="text-2xl font-bold text-white flex items-center gap-2">
              ⛸️ Line Creek FSC
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/about" className="text-white/80 hover:text-accent font-medium transition-colors">About</Link>
              <Link href="/home#programs" className="text-white/80 hover:text-accent font-medium transition-colors">Programs</Link>
              <Link href="/coaches" className="text-white/80 hover:text-accent font-medium transition-colors">Coaches</Link>
              <Link href="/contact" className="text-white/80 hover:text-accent font-medium transition-colors">Contact</Link>
              <Link href="/login" className="bg-accent text-white px-6 py-2.5 rounded-full font-semibold hover:bg-purple-500 transition-all transform hover:scale-105 shadow-lg">
                Member Portal
              </Link>
            </nav>

            {/* Mobile burger */}
            <button
              className="md:hidden text-white/80 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#412069] border-t border-[#7B4DB8]">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <Link href="/about" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-white/80 hover:bg-[#7B4DB8] rounded transition-colors">About</Link>
              <Link href="/home" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-white/80 hover:bg-[#7B4DB8] rounded transition-colors">Programs</Link>
              <Link href="/coaches" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-white/80 hover:bg-[#7B4DB8] rounded transition-colors">Coaches</Link>
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-white/80 hover:bg-[#7B4DB8] rounded transition-colors">Contact</Link>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 bg-accent text-white hover:bg-purple-500 rounded transition-colors font-semibold">Member Portal</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-3">Line Creek FSC</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                ISI &amp; US Figure Skating affiliated club in Kansas City, MO. A safe and supportive environment for skaters of all ages and levels.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-3">Quick Links</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/about" className="hover:text-accent transition-colors">About</Link></li>
                <li><Link href="/home" className="hover:text-accent transition-colors">Programs</Link></li>
                <li><Link href="/coaches" className="hover:text-accent transition-colors">Coaches</Link></li>
                <li><Link href="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
                <li><Link href="/login" className="hover:text-accent transition-colors">Member Login</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-3">Location</h3>
              <p className="text-gray-400 text-sm">
                5940 NW Waukomis Dr<br />
                Kansas City, MO 64151
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Line Creek Figure Skating Club. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

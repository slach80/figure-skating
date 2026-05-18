'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import './public.css'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Scroll progress + nav scroll state
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY
          const docHeight = document.documentElement.scrollHeight - window.innerHeight
          const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
          if (progressRef.current) progressRef.current.style.width = progress + '%'
          setScrolled(scrollTop > 80)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Custom cursor
    if (!prefersReducedMotion && window.innerWidth > 768) {
      const dot = dotRef.current
      const ring = ringRef.current
      if (!dot || !ring) return

      let mouseX = 0, mouseY = 0
      let ringX = 0, ringY = 0
      let rafId: number

      const onMouseMove = (e: MouseEvent) => {
        mouseX = e.clientX
        mouseY = e.clientY
        dot.style.left = mouseX - 4 + 'px'
        dot.style.top = mouseY - 4 + 'px'
      }
      document.addEventListener('mousemove', onMouseMove)

      const animateRing = () => {
        ringX += (mouseX - ringX) * 0.15
        ringY += (mouseY - ringY) * 0.15
        ring.style.left = ringX - 20 + 'px'
        ring.style.top = ringY - 20 + 'px'
        rafId = requestAnimationFrame(animateRing)
      }
      animateRing()

      const addHover = (el: Element) => {
        el.addEventListener('mouseenter', () => ring.classList.add('hovering'))
        el.addEventListener('mouseleave', () => ring.classList.remove('hovering'))
      }
      document.querySelectorAll('a, button, .tilt-card').forEach(addHover)

      return () => {
        window.removeEventListener('scroll', handleScroll)
        document.removeEventListener('mousemove', onMouseMove)
        cancelAnimationFrame(rafId)
      }
    } else {
      if (dotRef.current) dotRef.current.style.display = 'none'
      if (ringRef.current) ringRef.current.style.display = 'none'
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Magnetic nav links
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || window.innerWidth < 768) return

    const links = document.querySelectorAll('.nav-link')
    const cleanups: (() => void)[] = []

    links.forEach((link) => {
      const el = link as HTMLElement
      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        el.style.transform = `translate(${x * 0.2}px, ${y * 0.3}px)`
      }
      const onLeave = () => {
        el.style.transform = 'translate(0, 0)'
        el.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        setTimeout(() => { el.style.transition = '' }, 400)
      }
      el.addEventListener('mousemove', onMove as EventListener)
      el.addEventListener('mouseleave', onLeave)
      cleanups.push(() => {
        el.removeEventListener('mousemove', onMove as EventListener)
        el.removeEventListener('mouseleave', onLeave)
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return (
    <div className="public-page">
      {/* Scroll progress */}
      <div className="scroll-progress" ref={progressRef} />

      {/* Custom cursor */}
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />

      {/* Navigation */}
      <nav className={`nav-container${scrolled ? ' scrolled' : ''}`} ref={navRef}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/home" className="nav-logo">
            Line Creek FSC
          </Link>

          {/* Desktop nav */}
          <div id="navLinks" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="nav-links hidden md:flex">
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/home#programs" className="nav-link">Programs</Link>
            <Link href="/coaches" className="nav-link">Coaches</Link>
            <Link href="/contact" className="nav-link">Contact</Link>
            <Link href="/login" className="nav-cta">Member Portal</Link>
          </div>

          {/* Mobile burger */}
          <button
            className="mobile-menu-btn md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,10,15,0.98)',
          backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '2rem',
          zIndex: 100, WebkitBackdropFilter: 'blur(20px)'
        }}>
          {[
            { href: '/about', label: 'About' },
            { href: '/home#programs', label: 'Programs' },
            { href: '/coaches', label: 'Coaches' },
            { href: '/contact', label: 'Contact' },
          ].map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="nav-cta"
            style={{ marginTop: '1rem' }}
          >
            Member Portal
          </Link>
        </div>
      )}

      <main>{children}</main>
    </div>
  )
}

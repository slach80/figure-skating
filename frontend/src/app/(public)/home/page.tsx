'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useSiteConfig, usePublicAnnouncements, usePublicCoaches } from '@/hooks/useWebsite'

export default function HomePage() {
  const { data: config } = useSiteConfig()
  const { data: announcements = [] } = usePublicAnnouncements()
  const { data: coaches = [] } = usePublicCoaches()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const aboutBadgeRef = useRef<HTMLDivElement>(null)

  const latestAnnouncements = announcements.slice(0, 3)

  // Hero animation
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const eyebrow = document.querySelector('.hero-eyebrow') as HTMLElement
    const lines = document.querySelectorAll<HTMLElement>('.hero-title .line')
    const subtitle = document.querySelector('.hero-subtitle') as HTMLElement
    const ctaGroup = document.querySelector('.hero-cta-group') as HTMLElement

    if (!eyebrow) return

    if (prefersReducedMotion) {
      ;[eyebrow, subtitle, ctaGroup].forEach((el) => { if (el) { el.style.opacity = '1'; el.style.transform = 'none' } })
      lines.forEach((l) => { l.style.opacity = '1'; l.style.transform = 'none' })
      return
    }

    const ease = (el: HTMLElement, delay: number) => {
      setTimeout(() => {
        el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }, delay)
    }

    ease(eyebrow, 300)
    lines.forEach((line, i) => {
      setTimeout(() => {
        line.style.transition = 'all 1s cubic-bezier(0.4, 0, 0.2, 1)'
        line.style.opacity = '1'
        line.style.transform = 'translateY(0)'
      }, 500 + i * 200)
    })
    ease(subtitle, 1200)
    ease(ctaGroup, 1500)
  }, [])

  // Particles
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particleCount = window.innerWidth < 768 ? 30 : 60

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    interface P {
      x: number; y: number; size: number
      speedX: number; speedY: number
      opacity: number; rotation: number; rotationSpeed: number
    }

    const mkParticle = (): P => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.3 - 0.2,
      opacity: Math.random() * 0.5 + 0.1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2,
    })

    const particles: P[] = Array.from({ length: particleCount }, mkParticle)

    let rafId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.x += p.speedX
        p.y += p.speedY
        p.rotation += p.rotationSpeed
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          Object.assign(p, mkParticle())
          p.y = canvas.height + 10
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = p.opacity
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 * Math.PI) / 180
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(angle) * p.size, Math.sin(angle) * p.size)
        }
        ctx.strokeStyle = '#B8E6F0'
        ctx.lineWidth = 0.5
        ctx.stroke()
        ctx.restore()
      }
      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Reveal observer + counters + tilt cards
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Reveal observer
    const revealEls = document.querySelectorAll<HTMLElement>(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale, .stat-item, .tilt-card, .news-card, .contact-card, .about-text, .about-visual'
    )

    if (prefersReducedMotion) {
      revealEls.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none' })
    } else {
      const revealObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const delay = Number((entry.target as HTMLElement).dataset.delay ?? 0)
              setTimeout(() => {
                const el = entry.target as HTMLElement
                el.classList.add('visible')
                el.style.opacity = '1'
                el.style.transform = 'none'
                el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
              }, delay)
              revealObs.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
      )

      revealEls.forEach((el) => {
        const siblings = el.parentElement
          ? Array.from(el.parentElement.children).filter((c) =>
              ['tilt-card', 'stat-item', 'news-card', 'contact-card'].some((cls) =>
                (c as HTMLElement).classList.contains(cls)
              )
            )
          : []
        const idx = siblings.indexOf(el)
        if (idx >= 0) (el as HTMLElement).dataset.delay = String(idx * 100)
        revealObs.observe(el)
      })
    }

    // Counters
    const statEls = document.querySelectorAll<HTMLElement>('.stat-number[data-target]')
    if (prefersReducedMotion) {
      statEls.forEach((el) => { el.textContent = el.dataset.target + (el.dataset.suffix ?? '') })
    } else {
      const counterObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement
              const target = parseInt(el.dataset.target!)
              const suffix = el.dataset.suffix ?? ''
              const duration = 2000
              const start = performance.now()
              const tick = (now: number) => {
                const elapsed = now - start
                const progress = Math.min(elapsed / duration, 1)
                const eased = 1 - Math.pow(1 - progress, 3)
                el.textContent = Math.floor(eased * target) + suffix
                if (progress < 1) requestAnimationFrame(tick)
                else el.textContent = target + suffix
              }
              requestAnimationFrame(tick)
              counterObs.unobserve(el)
            }
          })
        },
        { threshold: 0.5 }
      )
      statEls.forEach((el) => counterObs.observe(el))
    }

    // Tilt cards
    const tiltCleanups: (() => void)[] = []
    if (!prefersReducedMotion && window.innerWidth >= 768) {
      document.querySelectorAll<HTMLElement>('.tilt-card').forEach((card) => {
        const onMove = (e: MouseEvent) => {
          const rect = card.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const rx = ((y - rect.height / 2) / (rect.height / 2)) * -8
          const ry = ((x - rect.width / 2) / (rect.width / 2)) * 8
          card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`
        }
        const onLeave = () => {
          card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)'
        }
        card.addEventListener('mousemove', onMove)
        card.addEventListener('mouseleave', onLeave)
        tiltCleanups.push(() => {
          card.removeEventListener('mousemove', onMove)
          card.removeEventListener('mouseleave', onLeave)
        })
      })
    }
    return () => tiltCleanups.forEach((fn) => fn())
  }, [latestAnnouncements.length])

  // About badge spring animation
  useEffect(() => {
    const badge = aboutBadgeRef.current
    if (!badge) return
    const parent = badge.parentElement
    if (!parent) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => badge.classList.add('visible'), 600)
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.3 }
    )
    obs.observe(parent)
    return () => obs.disconnect()
  }, [])

  const newsItems = latestAnnouncements.length > 0
    ? latestAnnouncements.map((a, i) => ({
        gradient: ['linear-gradient(135deg, #5B2C91, #D946EF)', 'linear-gradient(135deg, #D946EF, #ec4899)', 'linear-gradient(135deg, #B8E6F0, #06b6d4)'][i % 3],
        date: a.published_at ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Coming soon',
        title: a.title,
        excerpt: a.body,
      }))
    : [
        { gradient: 'linear-gradient(135deg, #5B2C91, #D946EF)', date: 'Feb 18, 2025', title: '2025 Spring Showcase', excerpt: 'Registration is now open for our Annual Spring Show! Sign up by 2/28 on the Registration page.' },
        { gradient: 'linear-gradient(135deg, #D946EF, #ec4899)', date: 'Feb 18, 2025', title: 'Save the Date for 2025 Mouse Races!', excerpt: "Mark Your Calendars! Don't miss the fun at our Mouse Races on April 12th, 2025, at 6 PM at Tiffany Greens Golf Club!" },
        { gradient: 'linear-gradient(135deg, #B8E6F0, #06b6d4)', date: 'Feb 18, 2025', title: 'KC MOMENTUM Skating Skills Classes', excerpt: 'Moves in the field and ice dance classes start March 1st! Youth and adult tracks available.' },
      ]

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="hero-section">
        <div className="hero-mesh" />
        <div className="hero-frost" />
        <canvas id="particles-canvas" ref={canvasRef} />

        <div className="hero-content">
          <span className="hero-eyebrow">ISI &amp; US Figure Skating Affiliated</span>
          <h1 className="hero-title">
            <span className="line">Line Creek</span>
            <span className="line line-accent">Figure Skating</span>
            <span className="line">Club</span>
          </h1>
          <p className="hero-subtitle">
            {config?.tagline || 'A safe and supportive environment for skaters of all ages and levels to reach their goals at the Line Creek Community Center in Kansas City, MO.'}
          </p>
          <div className="hero-cta-group">
            <Link href="#programs" className="hero-btn-primary">
              Explore Programs
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l5-5-5-5" /></svg>
            </Link>
            <Link href="#contact" className="hero-btn-secondary">
              Contact Us
            </Link>
          </div>
        </div>

        <div className="hero-scroll-indicator">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="stats-section">
        <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
          <div className="stat-item">
            <div className="stat-number" data-target="90" data-suffix="+">0</div>
            <div className="stat-label">KC Momentum Skaters</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-target={coaches.length > 0 ? coaches.length : 9} data-suffix="">0</div>
            <div className="stat-label">Synchro Teams</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-target="15" data-suffix="+">0</div>
            <div className="stat-label">Years Serving KC</div>
          </div>
        </div>
      </section>

      {/* ===== CARDS ===== */}
      <section className="cards-section" id="programs">
        <div className="section-header">
          <div className="section-eyebrow reveal">Explore</div>
          <h2 className="section-title reveal">What We Offer</h2>
        </div>

        <div className="cards-marquee">
          {[
            { href: '/about', label: 'About', desc: 'Learn about our club, mission, and skating community', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg> },
            { href: '/contact', label: 'Fall Fling', desc: 'Join us for our annual Fall Fling competition', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
            { href: '/login', label: 'Club Membership', desc: 'Become a member and join our skating family', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg> },
            { href: '/coaches', label: 'Synchronized Skating', desc: 'KC MOMENTUM — our competitive synchro team', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg> },
            { href: '/home#programs', label: 'Programs', desc: 'Lessons and programs for all ages and skill levels', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> },
            { href: '/coaches', label: 'Coaches', desc: 'Meet our experienced coaching staff', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg> },
          ].map(({ href, label, desc, icon }) => (
            <Link key={label} href={href} className="tilt-card">
              <div className="card-arrow">↗</div>
              <div className="card-icon">{icon}</div>
              <div className="card-content">
                <h3>{label}</h3>
                <p>{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== NEWS ===== */}
      <section className="news-section" id="events">
        <div className="section-header">
          <div className="section-eyebrow reveal">Updates</div>
          <h2 className="section-title reveal">Latest News</h2>
        </div>

        <div className="news-grid">
          {newsItems.map((item) => (
            <div key={item.title} className="news-card">
              <div className="news-card-image">
                <div className="gradient-bg" style={{ background: item.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="60" height="60" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1}>
                    <path d="M30 10c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 5a5 5 0 11-1 10 5 5 0 011-10zm-8 25c0-5 4-8 8-8s8 3 8 8" />
                  </svg>
                </div>
                <div className="news-card-overlay">
                  <span>Learn More</span>
                </div>
              </div>
              <div className="news-card-body">
                <div className="news-card-date">{item.date}</div>
                <h3 className="news-card-title">{item.title}</h3>
                <p className="news-card-excerpt">{item.excerpt}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link href="/about" className="hero-btn-secondary" style={{ display: 'inline-flex' }}>
            More News
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l5-5-5-5" /></svg>
          </Link>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="about-section" id="about">
        <div className="about-grid">
          <div className="about-text reveal-left">
            <div className="section-eyebrow" style={{ textAlign: 'left' }}>Our Mission</div>
            <h2>Building Champions<br />On &amp; Off The Ice</h2>
            {config?.about_text ? (
              <p>{config.about_text}</p>
            ) : (
              <>
                <p>Line Creek Figure Skating Club is an Ice Skating Institute and US Figure Skating affiliated club dedicated to providing a safe and supportive environment.</p>
                <p>We welcome skaters of all ages and levels to reach their goals at the Line Creek Community Center in Kansas City, MO.</p>
                <p>Whether you&apos;re taking your first steps on the ice or training for competitions, our experienced coaches and supportive community are here to help you succeed.</p>
              </>
            )}
          </div>
          <div className="about-visual reveal-right">
            <div className="about-visual-box">
              <svg width="120" height="120" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1} viewBox="0 0 120 120">
                <path d="M60 20 C40 20 25 40 30 60 C35 80 55 95 60 100 C65 95 85 80 90 60 C95 40 80 20 60 20Z" />
                <path d="M45 55 L55 65 L75 45" stroke="rgba(217,70,239,0.5)" strokeWidth={2} />
                <circle cx="60" cy="60" r="35" strokeDasharray="4 4" />
              </svg>
            </div>
            <div className="about-badge" ref={aboutBadgeRef}>
              <div className="badge-number">15+ Years</div>
              <div className="badge-label">Serving KC Skaters</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <section className="contact-section" id="contact">
        <div className="section-header" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-eyebrow reveal">Get In Touch</div>
          <h2 className="section-title reveal">Contact Us</h2>
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-card-icon">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="10" cy="10" r="9" /><path d="M10 5v5l3 3" /></svg>
            </div>
            <h3>Hours</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[['Sun', '09:00 AM – 04:00 PM'], ['Mon–Fri', '09:00 AM – 06:00 PM'], ['Sat', '09:00 AM – 04:00 PM']].map(([day, hours]) => (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                  <span>{day}</span><span>{hours}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M10 1C6.13 1 3 4.13 3 7.5 3 12.25 10 19 10 19s7-6.75 7-11.5C17 4.13 13.87 1 10 1z" /><circle cx="10" cy="7.5" r="2.5" /></svg>
            </div>
            <h3>Address</h3>
            <p>
              {config?.address
                ? config.address.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)
                : <>Line Creek Community Center<br />5940 NW Waukomis Dr<br />Kansas City, Missouri 64151</>
              }
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=5940+NW+Waukomis+Dr+Kansas+City+MO+64151"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', padding: '0.5rem 1rem', border: '1px solid rgba(184,230,240,0.3)', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 500 }}
            >
              Get Directions
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l5-5-5-5" /></svg>
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" /><path d="M3 7l7 5 7-5" /></svg>
            </div>
            <h3>Contact</h3>
            <p>Phone: 314-800-8994</p>
            <p><a href={`mailto:${config?.contact_email || 'kclcfscboard@gmail.com'}`}>{config?.contact_email || 'kclcfscboard@gmail.com'}</a></p>
            <div style={{ marginTop: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>Social</p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a href={config?.facebook_url || 'https://www.facebook.com/Line-Creek-Figure-Skating-Club-191282320943108'} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', transition: 'all 0.3s ease', color: 'inherit', textDecoration: 'none' }}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
                </a>
                <a href={config?.instagram_url || 'https://www.instagram.com/linecreekfsc'} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', transition: 'all 0.3s ease', color: 'inherit', textDecoration: 'none' }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>Line Creek FSC</h3>
            <p>KC MOMENTUM Synchronized Skating Team. An ISI and US Figure Skating affiliated club dedicated to excellence on and off the ice.</p>
          </div>
          <div className="footer-col">
            <h4>Club</h4>
            <Link href="/about">About</Link>
            <Link href="/home#programs">Programs</Link>
            <Link href="/coaches">Coaches</Link>
            <Link href="#events">Events</Link>
          </div>
          <div className="footer-col">
            <h4>Skating</h4>
            <Link href="/coaches">Synchro</Link>
            <Link href="/home#programs">Testing</Link>
            <Link href="/login">Membership</Link>
            <Link href="/about">News</Link>
          </div>
          <div className="footer-col">
            <h4>Location</h4>
            <a href="https://www.google.com/maps/search/?api=1&query=5940+NW+Waukomis+Dr+Kansas+City+MO+64151" target="_blank" rel="noopener noreferrer" style={{ lineHeight: 1.6 }}>
              5940 NW Waukomis Dr<br />Kansas City, MO 64151
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Line Creek Figure Skating Club. All rights reserved.</p>
          <div className="footer-social">
            <a href="https://www.facebook.com/Line-Creek-Figure-Skating-Club-191282320943108" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
            </a>
            <a href="https://www.instagram.com/linecreekfsc" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /></svg>
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}

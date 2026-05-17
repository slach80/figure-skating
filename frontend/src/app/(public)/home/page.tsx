'use client'

import Link from 'next/link'
import { useSiteConfig, usePublicAnnouncements } from '@/hooks/useWebsite'
import { MapPin, Phone, Mail, Calendar, ChevronRight } from 'lucide-react'

function AnnouncementCard({ title, body, published_at }: { title: string; body: string; published_at: string | null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      {published_at && (
        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      )}
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 line-clamp-3">{body}</p>
    </div>
  )
}

export default function HomePage() {
  const { data: config } = useSiteConfig()
  const { data: announcements = [] } = usePublicAnnouncements()

  const latestAnnouncements = announcements.slice(0, 3)

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary/90 to-accent overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08)_0%,_transparent_60%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm border border-white/20">
              <span className="text-base">⛸</span>
              Kansas City · USFS Member Club
            </div>
            <h1 className="text-5xl sm:text-6xl font-serif font-bold text-white leading-tight mb-4">
              Line Creek<br />Figure Skating Club
            </h1>
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              {config?.tagline || 'Where champions are made, one edge at a time.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-lg"
              >
                Join Now
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm"
              >
                Member Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick info strip */}
      {(config?.rink_name || config?.contact_email || config?.contact_phone) && (
        <section className="bg-slate-900 text-white">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-8 text-sm">
            {config?.rink_name && (
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <span>{config.rink_name}</span>
                {config.rink_address && <span className="text-slate-500">· {config.rink_address}</span>}
              </div>
            )}
            {config?.contact_phone && (
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-accent shrink-0" />
                <a href={`tel:${config.contact_phone}`} className="hover:text-white transition-colors">
                  {config.contact_phone}
                </a>
              </div>
            )}
            {config?.contact_email && (
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-accent shrink-0" />
                <a href={`mailto:${config.contact_email}`} className="hover:text-white transition-colors">
                  {config.contact_email}
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Announcements */}
      {latestAnnouncements.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif font-bold text-slate-900">News &amp; Announcements</h2>
            <Link href="/about" className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {latestAnnouncements.map(a => (
              <AnnouncementCard key={a.id} {...a} />
            ))}
          </div>
        </section>
      )}

      {/* Programs teaser */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-3">Programs for Every Level</h2>
          <p className="text-slate-600 mb-10 max-w-xl mx-auto">
            From first steps on ice to competitive skating, Line Creek FSC has a program for you.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Learn to Skate', icon: '⛸', desc: 'Pre-Alpha through Delta' },
              { label: 'Freestyle', icon: '🌟', desc: 'Jumps, spins & footwork' },
              { label: 'Moves in the Field', icon: '📐', desc: 'USFS test track' },
              { label: 'Ice Dance', icon: '💃', desc: 'Pattern & free dance' },
            ].map(p => (
              <div key={p.label} className="bg-white rounded-xl border border-slate-200 p-5 text-center hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">{p.icon}</div>
                <p className="font-semibold text-slate-900 text-sm">{p.label}</p>
                <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              Register Today
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

'use client'

import { usePublicCoaches } from '@/hooks/useWebsite'
import type { PublicCoach } from '@/types/website'

function CoachCard({ coach }: { coach: PublicCoach }) {
  const initials = coach.user_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const specialties = coach.specialties
    ? coach.specialties.split(',').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-serif font-bold text-2xl mb-4 shadow-md">
        {initials}
      </div>

      <h3 className="font-semibold text-slate-900 text-lg mb-1">{coach.user_name}</h3>

      {specialties.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
          {specialties.map(s => (
            <span key={s} className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
              {s}
            </span>
          ))}
        </div>
      )}

      {coach.bio && (
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">{coach.bio}</p>
      )}
    </div>
  )
}

export default function CoachesPage() {
  const { data: coaches = [], isLoading } = usePublicCoaches()

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-3">Our Coaches</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Meet the dedicated coaches at Line Creek FSC — experienced, passionate, and committed to helping
          every skater reach their potential.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-100 rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : coaches.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">⛸</div>
          <p className="text-slate-500">Coach profiles coming soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map(coach => (
            <CoachCard key={coach.id} coach={coach} />
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-16 bg-gradient-to-r from-primary to-accent rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-serif font-bold mb-2">Ready to Start Skating?</h2>
        <p className="text-white/80 mb-6">Register today and get matched with the right coach for your goals.</p>
        <a
          href="/register"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          Join the Club
        </a>
      </div>
    </div>
  )
}

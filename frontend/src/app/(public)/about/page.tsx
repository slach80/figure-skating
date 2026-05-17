'use client'

import Link from 'next/link'
import { useSiteConfig, usePublicAnnouncements } from '@/hooks/useWebsite'
import { Mail, Phone, MapPin, Facebook, Instagram, Calendar } from 'lucide-react'

export default function AboutPage() {
  const { data: config } = useSiteConfig()
  const { data: announcements = [] } = usePublicAnnouncements()

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">About Us</h1>
        <p className="text-slate-500">Learn more about Line Creek Figure Skating Club.</p>
      </div>

      {/* About text */}
      {config?.about_text ? (
        <section className="prose prose-slate max-w-none">
          {config.about_text.split('\n').map((para, i) =>
            para.trim() ? <p key={i} className="text-slate-700 leading-relaxed">{para}</p> : null,
          )}
        </section>
      ) : (
        <section className="bg-slate-50 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">⛸</div>
          <p className="text-slate-500">
            Line Creek Figure Skating Club is a proud member of US Figure Skating, dedicated to providing quality
            figure skating instruction and competition opportunities for skaters of all ages and levels.
          </p>
        </section>
      )}

      {/* Contact info */}
      <section className="bg-slate-50 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Contact &amp; Location</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config?.contact_email && (
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Email</p>
                <a href={`mailto:${config.contact_email}`} className="text-sm text-primary hover:underline">
                  {config.contact_email}
                </a>
              </div>
            </div>
          )}
          {config?.contact_phone && (
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Phone</p>
                <a href={`tel:${config.contact_phone}`} className="text-sm text-slate-700 hover:text-primary">
                  {config.contact_phone}
                </a>
              </div>
            </div>
          )}
          {config?.address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Mailing Address</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">{config.address}</p>
              </div>
            </div>
          )}
          {config?.rink_name && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Home Rink</p>
                <p className="text-sm text-slate-700 font-medium">{config.rink_name}</p>
                {config.rink_address && (
                  <p className="text-sm text-slate-500 whitespace-pre-line">{config.rink_address}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Social */}
        {(config?.facebook_url || config?.instagram_url) && (
          <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
            {config.facebook_url && (
              <a href={config.facebook_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary transition-colors">
                <Facebook className="w-4 h-4" />
                Facebook
              </a>
            )}
            {config.instagram_url && (
              <a href={config.instagram_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary transition-colors">
                <Instagram className="w-4 h-4" />
                Instagram
              </a>
            )}
          </div>
        )}
      </section>

      {/* All announcements */}
      {announcements.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-5">News &amp; Announcements</h2>
          <div className="space-y-4">
            {announcements.map(a => (
              <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-5">
                {a.published_at && (
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(a.published_at).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                )}
                <h3 className="font-semibold text-slate-900 mb-1">{a.title}</h3>
                <p className="text-sm text-slate-600 whitespace-pre-line">{a.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="pt-4 border-t border-slate-100 flex gap-4">
        <Link href="/contact" className="text-sm text-primary hover:underline font-medium">Contact Us</Link>
        <Link href="/coaches" className="text-sm text-primary hover:underline font-medium">Meet Our Coaches</Link>
        <Link href="/register" className="text-sm text-primary hover:underline font-medium">Join the Club</Link>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useSiteConfig } from '@/hooks/useWebsite'
import { Mail, Phone, MapPin, Facebook, Instagram, Send } from 'lucide-react'

export default function ContactPage() {
  const { data: config } = useSiteConfig()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!config?.contact_email) return
    const subject = encodeURIComponent(`Website contact from ${name}`)
    const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`)
    window.location.href = `mailto:${config.contact_email}?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Contact Us</h1>
        <p className="text-slate-500">We&apos;d love to hear from you. Reach out with questions or to learn more about joining.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Contact info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-50 rounded-xl p-6 space-y-5">
            <h2 className="font-semibold text-slate-900">Get in Touch</h2>

            {config?.contact_email && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">Email</p>
                  <a href={`mailto:${config.contact_email}`} className="text-sm text-primary hover:underline">
                    {config.contact_email}
                  </a>
                </div>
              </div>
            )}

            {config?.contact_phone && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">Phone</p>
                  <a href={`tel:${config.contact_phone}`} className="text-sm text-slate-700 hover:text-primary">
                    {config.contact_phone}
                  </a>
                </div>
              </div>
            )}

            {config?.rink_name && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">Home Rink</p>
                  <p className="text-sm text-slate-700 font-medium">{config.rink_name}</p>
                  {config.rink_address && (
                    <p className="text-xs text-slate-500 whitespace-pre-line mt-0.5">{config.rink_address}</p>
                  )}
                </div>
              </div>
            )}

            {(config?.facebook_url || config?.instagram_url) && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                {config.facebook_url && (
                  <a
                    href={config.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-primary hover:text-white text-slate-600 flex items-center justify-center transition-colors"
                    title="Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {config.instagram_url && (
                  <a
                    href={config.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-accent hover:text-white text-slate-600 flex items-center justify-center transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contact form */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-5">Send a Message</h2>

            {sent ? (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-5 text-center">
                <div className="text-3xl mb-2">✓</div>
                <p className="font-medium">Your email client has been opened.</p>
                <p className="text-sm mt-1 text-green-600">
                  If it didn&apos;t open automatically,{' '}
                  {config?.contact_email && (
                    <a href={`mailto:${config.contact_email}`} className="underline">
                      email us directly
                    </a>
                  )}
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Your Name *</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email Address *</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Message *</label>
                  <textarea
                    className={inputCls + ' resize-y min-h-[140px]'}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    placeholder="Tell us how we can help…"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
                <p className="text-xs text-slate-400 text-center">
                  This will open your email client to send the message.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

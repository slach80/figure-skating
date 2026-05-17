'use client'

import { useState } from 'react'
import { Mail, Send, Clock } from 'lucide-react'
import api from '@/lib/api'
import { AxiosError } from 'axios'

type RecipientFilter =
  | 'all_active'
  | 'expiring_30'
  | 'expiring_7'

const FILTER_OPTIONS: { value: RecipientFilter; label: string }[] = [
  { value: 'all_active', label: 'All active members' },
  { value: 'expiring_30', label: 'Expiring in 30 days' },
  { value: 'expiring_7', label: 'Expiring in 7 days' },
]

function buildFilter(selected: RecipientFilter): Record<string, string> {
  switch (selected) {
    case 'all_active':
      return { membership_status: 'active' }
    case 'expiring_30':
      return { expiring_days: '30' }
    case 'expiring_7':
      return { expiring_days: '7' }
  }
}

type SendState = 'idle' | 'sending' | 'success' | 'error'

export default function CommunicationsPage() {
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all_active')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return

    setSendState('sending')
    setErrorMessage('')

    try {
      await api.post('/api/v1/notifications/broadcast/', {
        subject: subject.trim(),
        body: body.trim(),
        filter: buildFilter(recipientFilter),
      })
      setSendState('success')
      setSubject('')
      setBody('')
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>
      setErrorMessage(
        axiosErr.response?.data?.detail ?? 'Failed to send broadcast. Please try again.'
      )
      setSendState('error')
    }
  }

  const selectedLabel =
    FILTER_OPTIONS.find((o) => o.value === recipientFilter)?.label ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h1>Communications</h1>
        <p className="text-slate-600 mt-1 text-sm">Send announcements and updates to club members</p>
      </div>

      {/* Broadcast Email card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Broadcast Email</h2>
            <p className="text-xs text-slate-500">Compose and send an email to a filtered group of members</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Recipient filter */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Send to
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecipientFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    recipientFilter === opt.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Important update from Line Creek FSC"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label htmlFor="body" className="block text-sm font-medium text-slate-700">
              Message
            </label>
            <textarea
              id="body"
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-y"
            />
          </div>

          {/* Feedback */}
          {sendState === 'success' && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              Broadcast queued — email will be delivered to <strong>{selectedLabel}</strong>.
            </div>
          )}
          {sendState === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Send button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={!subject.trim() || !body.trim() || sendState === 'sending'}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendState === 'sending' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send to {selectedLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Email history placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Sent</h2>
          </div>
        </div>
        <div className="px-6 py-10 text-center text-slate-400 text-sm">
          Email history coming soon
        </div>
      </div>
    </div>
  )
}

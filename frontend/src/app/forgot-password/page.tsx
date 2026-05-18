'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/v1/auth/password-reset/', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⛸</div>
          <h1 className="font-serif text-3xl font-bold text-white">Line Creek FSC</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Check your email</h2>
              <p className="text-slate-300 text-sm">
                If <strong>{email}</strong> is registered, you&apos;ll receive a reset link shortly.
              </p>
              <Link href="/login" className="block text-sm text-primary-light hover:underline mt-4">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Reset password</h2>
                <p className="text-slate-400 text-sm mt-1">Enter your email and we&apos;ll send a reset link.</p>
              </div>

              {error && (
                <p className="text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <Link href="/login" className="block text-center text-sm text-slate-400 hover:text-slate-300 transition-colors">
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

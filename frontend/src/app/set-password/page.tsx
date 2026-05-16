'use client'

import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

function SetPasswordForm() {
  const searchParams = useSearchParams()
  const uid = searchParams.get('uid') ?? ''
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!uid || !token) {
    return (
      <div className="text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-white font-semibold">Invalid reset link</p>
        <p className="text-slate-400 text-sm">This link is missing required parameters.</p>
        <Link href="/forgot-password" className="block text-sm text-primary-light hover:underline mt-4">
          Request a new link
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/api/v1/auth/password-reset/confirm/', { uid, token, password })
      setDone(true)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } })
        ?.response?.data?.detail
        ?? (err as { response?: { data?: { non_field_errors?: string[] } } })
          ?.response?.data?.non_field_errors?.[0]
        ?? 'Reset failed. This link may have expired.'
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
        <h2 className="text-xl font-semibold text-white">Password set!</h2>
        <p className="text-slate-300 text-sm">You can now sign in with your new password.</p>
        <Link href="/login" className="block mt-4 px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Set your password</h2>
        <p className="text-slate-400 text-sm mt-1">Choose a password for your account.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">New password</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Min. 8 characters"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Confirm password</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Repeat password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? 'Setting password…' : 'Set password'}
      </button>
    </form>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⛸</div>
          <h1 className="font-serif text-3xl font-bold text-white">Line Creek FSC</h1>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
          <Suspense fallback={<div className="text-slate-300 text-center">Loading…</div>}>
            <SetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

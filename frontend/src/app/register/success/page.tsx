'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Registration Complete!</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Payment received. Your membership is now active. You will receive a confirmation email shortly.
        </p>
        <p className="text-slate-500 text-xs">
          US Figure Skating registration is processed within 2–3 business days. Your USFS number will appear in your member profile once confirmed.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            Register another skater
          </Link>
        </div>
      </div>
    </div>
  )
}

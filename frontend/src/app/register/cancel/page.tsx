'use client'

import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default function RegistrationCancelPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <XCircle className="w-16 h-16 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payment Cancelled</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          No charge was made. Your registration details have been saved — you can complete payment at any time.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Try again
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

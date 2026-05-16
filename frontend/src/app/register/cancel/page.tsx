'use client'

import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default function RegistrationCancelPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <XCircle className="w-16 h-16 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Cancelled</h1>
        <p className="text-slate-600 text-sm">
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
            className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

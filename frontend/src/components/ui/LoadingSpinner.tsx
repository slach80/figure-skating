import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center justify-center py-12', className)}>
      <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
      <span className="text-slate-500 text-sm">Loading…</span>
    </div>
  )
}

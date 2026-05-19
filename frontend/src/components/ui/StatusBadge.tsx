import clsx from 'clsx'

const STATUS_CONFIG = {
  active:    { bg: 'bg-green-50 dark:bg-green-950/40',   text: 'text-green-700 dark:text-green-400',   border: 'border-green-200 dark:border-green-800',   dot: 'bg-green-500' },
  pending:   { bg: 'bg-yellow-50 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800', dot: 'bg-yellow-500' },
  expired:   { bg: 'bg-red-50 dark:bg-red-950/40',       text: 'text-red-700 dark:text-red-400',       border: 'border-red-200 dark:border-red-800',       dot: 'bg-red-500' },
  suspended: { bg: 'bg-slate-100 dark:bg-slate-800',     text: 'text-slate-600 dark:text-slate-400',   border: 'border-slate-300 dark:border-slate-600',   dot: 'bg-slate-400' },
} as const

type StatusKey = keyof typeof STATUS_CONFIG

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.pending
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', config.bg, config.text, config.border)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
      <span className="capitalize">{status}</span>
    </span>
  )
}

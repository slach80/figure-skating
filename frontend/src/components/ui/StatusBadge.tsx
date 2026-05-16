import clsx from 'clsx'

const STATUS_CONFIG = {
  active:    { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500' },
  pending:   { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  expired:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
  suspended: { bg: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-300',   dot: 'bg-gray-500' },
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

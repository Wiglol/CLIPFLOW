import type { ReactNode } from 'react'

type Props = { title: string; hint?: string; action?: ReactNode }

export default function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="rounded-3xl border border-stroke/20 bg-panel px-4 py-4">
      <div className="text-sm font-semibold">{title}</div>
      {hint ? <div className="mt-1 text-sm text-muted">{hint}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

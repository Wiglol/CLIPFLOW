import { useEffect, type ReactNode } from 'react'
import Icon from './icons'

type Props = {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  widthClassName?: string
}

export default function Modal({ open, title, onClose, children, widthClassName = 'max-w-lg' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={['w-full rounded-3xl border border-stroke/25 bg-panel px-4 pb-4 pt-3', widthClassName].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">{title ? <div className="truncate text-sm font-semibold">{title}</div> : null}</div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-muted hover:bg-panel2/60 hover:text-fg focus-visible:safe-focus"
            aria-label="Close"
          >
            <Icon.X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

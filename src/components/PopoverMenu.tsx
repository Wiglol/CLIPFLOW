import { useEffect, useRef } from 'react'

export type MenuItem = {
  label: string
  danger?: boolean
  onClick: () => void
}

export default function PopoverMenu({ open, onClose, items }: { open: boolean; onClose: () => void; items: MenuItem[] }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return
      if (ref.current.contains(e.target as Node)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-0 top-10 w-56 overflow-hidden rounded-2xl border border-stroke/25 bg-panel shadow-none"
    >
      {items.map((it) => (
        <button
          key={it.label}
          onClick={() => {
            it.onClick()
            onClose()
          }}
          className={[
            'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-panel2/60 focus-visible:safe-focus',
            it.danger ? 'text-danger' : 'text-muted hover:text-fg',
          ].join(' ')}
          role="menuitem"
        >
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  )
}

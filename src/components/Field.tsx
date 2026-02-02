import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

type BaseProps = {
  label: string
  hint?: string
  error?: string | null
  right?: ReactNode
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>

type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & {
  rows?: number
}

export function FieldRow({ label, hint, error, right, children }: BaseProps & { children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          {hint ? <div className="text-xs text-muted">{hint}</div> : null}
        </div>
        {right ? <div className="text-xs text-muted">{right}</div> : null}
      </div>
      {children}
      {error ? <div className="text-xs text-danger">{error}</div> : null}
    </div>
  )
}

export function InputField({ label, hint, error, right, className = '', ...props }: InputProps) {
  return (
    <FieldRow label={label} hint={hint} error={error} right={right}>
      <input
        {...props}
        className={[
          'w-full rounded-2xl border border-stroke/25 bg-panel px-3 py-2 text-sm text-fg placeholder:text-muted/70 focus-visible:safe-focus',
          className,
        ].join(' ')}
      />
    </FieldRow>
  )
}

export function TextareaField({ label, hint, error, right, className = '', rows = 4, ...props }: TextareaProps) {
  return (
    <FieldRow label={label} hint={hint} error={error} right={right}>
      <textarea
        {...props}
        rows={rows}
        className={[
          'w-full resize-none rounded-2xl border border-stroke/25 bg-panel px-3 py-2 text-sm text-fg placeholder:text-muted/70 focus-visible:safe-focus',
          className,
        ].join(' ')}
      />
    </FieldRow>
  )
}

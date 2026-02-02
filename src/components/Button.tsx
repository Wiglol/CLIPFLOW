import type { ButtonHTMLAttributes } from 'react'

type Variant = 'ghost' | 'solid' | 'danger'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'sm' | 'md'
}

export default function Button({ variant = 'ghost', size = 'md', className = '', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-medium focus-visible:safe-focus disabled:opacity-50 disabled:pointer-events-none'

  const sizes = size === 'sm' ? 'px-3 py-1.5' : 'px-3.5 py-2'

  const variants: Record<Variant, string> = {
    ghost: 'bg-transparent text-muted hover:bg-panel2/60 hover:text-fg',
    solid: 'bg-panel2/80 text-fg hover:bg-panel2',
    danger: 'bg-transparent text-danger hover:bg-panel2/60',
  }

  return <button className={[base, sizes, variants[variant], className].join(' ')} {...props} />
}

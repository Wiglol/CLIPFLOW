type Tab<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  value: T
  onChange: (v: T) => void
  tabs: Tab<T>[]
}

export default function UnderlineTabs<T extends string>({ value, onChange, tabs }: Props<T>) {
  return (
    <div className="flex items-center gap-4">
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={[
              'relative text-sm focus-visible:safe-focus',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            ].join(' ')}
            aria-pressed={active}
            aria-label={`Switch to ${t.label}`}
          >
            <span className="pb-2">{t.label}</span>
            {active ? (
              <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-brand/80" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

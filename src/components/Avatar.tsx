export default function Avatar({
  url,
  name,
  size = 40,
  className = '',
}: {
  url?: string | null
  name?: string | null
  size?: number
  className?: string
}) {
  const letter = (name || 'U').trim().slice(0, 1).toUpperCase()
  return (
    <span
      className={['inline-flex items-center justify-center overflow-hidden bg-panel2/60 text-xs font-semibold text-fg', className].join(' ')}
      style={{ width: size, height: size, borderRadius: size >= 44 ? 18 : 14 }}
      aria-hidden="true"
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : letter}
    </span>
  )
}

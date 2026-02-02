export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={['rounded-2xl bg-panel2/50', className].join(' ')} aria-hidden="true" />
}

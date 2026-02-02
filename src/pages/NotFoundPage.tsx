import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-[820px] px-4 pb-20 pt-20 sm:pt-24">
      <EmptyState
        title="Page not found"
        hint="That link doesn’t exist, or it was Removed."
        action={<Button onClick={() => navigate('/')} variant="solid" aria-label="Back to feed">Back to feed</Button>}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'
import CommentsDrawer from '../components/CommentsDrawer'
import PostCard from '../components/PostCard'
import type { PublicPost } from '../lib/types'
import { fetchPostById } from '../lib/feed'
import { humanError } from '../lib/errors'
import { useAuth } from '../state/auth'

function useLocalStorageBool(key: string, initial: boolean) {
  const [val, setVal] = useState<boolean>(() => {
    const raw = localStorage.getItem(key)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return initial
  })
  useEffect(() => {
    localStorage.setItem(key, String(val))
  }, [key, val])
  return [val, setVal] as const
}


function useLocalStorageNumber(key: string, initial: number) {
  const [val, setVal] = useState<number>(() => {
    const raw = localStorage.getItem(key)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : initial
  })
  useEffect(() => {
    localStorage.setItem(key, String(val))
  }, [key, val])
  return [val, setVal] as const
}

export default function PostPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [post, setPost] = useState<PublicPost | null>(null)

  const [muted, setMuted] = useLocalStorageBool('clipflow:muted', true)
  const [volume, setVolume] = useLocalStorageNumber('clipflow:volume', 80)

  const [commentsOpen, setCommentsOpen] = useState(false)

  const requireAuth = () => {
    const next = window.location.pathname + window.location.search
    navigate(`/auth?next=${encodeURIComponent(next)}`)
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr(null)
    fetchPostById(id, user?.id ?? null)
      .then((p) => {
        if (!alive) return
        setPost(p)
        setLoading(false)
      })
      .catch((e) => {
        if (!alive) return
        setErr(humanError(e))
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id, user?.id])

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 pb-12 pt-16">
        <Skeleton className="h-[70dvh]" />
      </div>
    )
  }

  if (err) {
    return (
      <div className="mx-auto max-w-[980px] px-4 pb-20 pt-20 sm:pt-24">
        <EmptyState title="Couldn’t load post" hint={err} />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-[980px] px-4 pb-20 pt-20 sm:pt-24">
        <EmptyState title="Post not found" hint="This link might be deleted or hidden." />
      </div>
    )
  }

  return (
    <div className="relative">
      <CommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={post.id}
        onCountAdd={(d) => setPost((p) => (p ? { ...p, comment_count: Math.max(0, p.comment_count + d) } : p))}
        onRequireAuth={requireAuth}
      />

      <div className="fixed left-0 right-0 top-14 z-40 border-b border-stroke/20 bg-bg/70 backdrop-blur supports-[backdrop-filter]:bg-bg/60">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3">
          <Button onClick={() => navigate('/')} aria-label="Back to feed">
            Back
          </Button>
          <div className="text-xs text-muted">Permalink</div>
        </div>
      </div>

      <div className="pt-14">
        <PostCard
          post={post}
          active={true}
          muted={muted}
          shouldLoad={true}
          volume={volume}
          onSetVolume={(v) => {
            setVolume(v)
            if (v <= 0) setMuted(true)
            else setMuted(false)
          }}
          onToggleMute={() => setMuted((m) => !m)}
          onOpenComments={() => setCommentsOpen(true)}
          onPatch={(pid, patch) => {
            if (pid !== post.id) return
            setPost((p) => (p ? { ...p, ...patch } : p))
          }}
          onRemove={() => navigate('/')}
          onRequireAuth={requireAuth}
        />
      </div>
    </div>
  )
}

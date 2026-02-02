import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'
import CommentsDrawer from '../components/CommentsDrawer'
import PostCard from '../components/PostCard'
import type { PublicPost } from '../lib/types'
import { fetchHashtagPosts } from '../lib/feed'
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

function isTypingTarget(el: EventTarget | null) {
  const n = el as HTMLElement | null
  if (!n) return false
  const tag = n.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if ((n as any).isContentEditable) return true
  return false
}

export default function HashtagPage() {
  const { tag = '' } = useParams()
  const clean = useMemo(() => decodeURIComponent(tag).replace(/^#/, ''), [tag])
  const title = useMemo(() => `#${clean}`, [clean])

  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [posts, setPosts] = useState<PublicPost[]>([])
  const [muted, setMuted] = useLocalStorageBool('clipflow:muted', true)
  const [volume, setVolume] = useLocalStorageNumber('clipflow:volume', 80)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)

  const requireAuth = () => {
    const next = window.location.pathname + window.location.search
    navigate(`/auth?next=${encodeURIComponent(next)}`)
  }

  const reload = async () => {
    setErr(null)
    setLoading(true)
    try {
      const data = await fetchHashtagPosts(clean, user?.id ?? null)
      setPosts(data)
    } catch (e) {
      setErr(humanError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    setActiveIndex(0)
    scrollerRef.current?.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, user?.id])

  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return

    const obs = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0]
        if (!best) return
        const idx = Number((best.target as HTMLElement).dataset.idx)
        if (!Number.isFinite(idx)) return
        if (idx !== activeIndex) setActiveIndex(idx)
      },
      { root, threshold: [0.45, 0.6, 0.75] },
    )

    itemRefs.current.forEach((el) => {
      if (el) obs.observe(el)
    })

    return () => obs.disconnect()
  }, [posts.length, activeIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      const dir = e.key === 'ArrowDown' ? 1 : -1
      const next = Math.max(0, Math.min(posts.length - 1, activeIndex + dir))
      const el = itemRefs.current[next]
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, posts.length])

  const openComments = (postId: string) => {
    setCommentsPostId(postId)
    setCommentsOpen(true)
  }

  const patch = (id: string, patch: Partial<PublicPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const remove = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="relative">
      <CommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={commentsPostId || ''}
        onCountAdd={(delta) => {
          if (!commentsPostId) return
          const p = posts.find((x) => x.id === commentsPostId)
          if (!p) return
          patch(commentsPostId, { comment_count: Math.max(0, p.comment_count + delta) })
        }}
        onRequireAuth={requireAuth}
      />

      <div className="fixed left-0 right-0 top-14 z-40 border-b border-stroke/20 bg-bg/70 backdrop-blur supports-[backdrop-filter]:bg-bg/60">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/')} aria-label="Back to feed">Back</Button>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-muted">Newest posts with this tag</div>
            </div>
          </div>
          <div className="hidden text-xs text-muted sm:block">Arrow keys switch clips</div>
        </div>
      </div>

      <div ref={scrollerRef} className="h-[100dvh] snap-y snap-mandatory overflow-y-auto" aria-label={`Hashtag feed ${title}`}>
        <div className="h-[112px]" />

        {loading ? (
          <div className="mx-auto max-w-[1100px] space-y-4 px-4 pb-10">
            <Skeleton className="h-[60dvh]" />
            <Skeleton className="h-[60dvh]" />
          </div>
        ) : err ? (
          <div className="mx-auto max-w-[820px] px-4 pb-12 pt-10">
            <EmptyState title="Couldn’t load hashtag" hint={err} action={<Button onClick={reload} aria-label="Try again">Try again</Button>} />
          </div>
        ) : !posts.length ? (
          <div className="mx-auto max-w-[820px] px-4 pb-12 pt-10">
            <EmptyState
              title="No posts yet"
              hint="Be the first to use this tag in a caption."
              action={<Button onClick={() => navigate('/?new=1')} variant="solid" aria-label="Create a post">New post</Button>}
            />
          </div>
        ) : (
          <div>
            {posts.map((p, i) => {
              const shouldLoad = Math.abs(i - activeIndex) <= 2
              return (
                <div
                  key={p.id}
                  ref={(el) => {
                    itemRefs.current[i] = el
                  }}
                  data-idx={i}
                >
                  <PostCard
                    post={p}
                    active={i === activeIndex}
                    muted={muted}
                    shouldLoad={shouldLoad}
                    volume={volume}
                    onSetVolume={(v) => {
                      setVolume(v)
                      if (v <= 0) setMuted(true)
                      else setMuted(false)
                    }}
                    onToggleMute={() => setMuted((m) => !m)}
                    onOpenComments={() => openComments(p.id)}
                    onPatch={patch}
                    onRemove={remove}
                    onRequireAuth={requireAuth}
                  />
                </div>
              )
            })}
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  )
}

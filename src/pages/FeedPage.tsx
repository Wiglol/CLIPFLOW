import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import UnderlineTabs from '../components/UnderlineTabs'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ComposerDialog from '../components/ComposerDialog'
import CommentsDrawer from '../components/CommentsDrawer'
import PostCard from '../components/PostCard'
import type { PublicPost } from '../lib/types'
import { fetchFeed, type FeedMode } from '../lib/feed'
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

export default function FeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [mode, setMode] = useState<FeedMode>('newest')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [posts, setPosts] = useState<PublicPost[]>([])

  const [muted, setMuted] = useLocalStorageBool('clipflow:muted', true)
  const [volume, setVolume] = useLocalStorageNumber('clipflow:volume', 80)

  const [chromeHidden, setChromeHidden] = useState(() => {
    try {
      return localStorage.getItem('clipflow:chromeHidden') === '1'
    } catch {
      return false
    }
  })

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const [composerOpen, setComposerOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)

  const requireAuth = () => {
    const next = window.location.pathname + window.location.search
    navigate(`/auth?next=${encodeURIComponent(next)}`)
  }

  const needProfile = () => {
    navigate('/onboarding')
  }

  const reload = async () => {
    setErr(null)
    setLoading(true)
    try {
      const data = await fetchFeed(mode, user?.id ?? null, 40)
      setPosts(data)
    } catch (e) {
      setErr(humanError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // Reset scroll when switching mode.
    setActiveIndex(0)
    scrollerRef.current?.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id])

// Keep in sync with TopBar hide/show.
useEffect(() => {
  const onChrome = () => {
    try {
      setChromeHidden(localStorage.getItem('clipflow:chromeHidden') === '1')
    } catch {
      // ignore
    }
  }
  window.addEventListener('clipflow:chrome', onChrome as any)
  return () => window.removeEventListener('clipflow:chrome', onChrome as any)
}, [])


  // Intersect to decide active item.
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

  // Keyboard nav (feed only): arrow up/down.
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

  // TopBar triggers new post.
  useEffect(() => {
    const handler = () => setComposerOpen(true)
    window.addEventListener('clipflow:newpost' as any, handler)
    return () => window.removeEventListener('clipflow:newpost' as any, handler)
  }, [])

  // URL param new=1.
  useEffect(() => {
    const n = searchParams.get('new')
    if (n === '1') {
      setComposerOpen(true)
    }
  }, [searchParams])

  const closeComposer = () => {
    setComposerOpen(false)
    if (searchParams.get('new') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }

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

  const tabs = useMemo(() => {
    return [
      { value: 'newest' as const, label: 'Newest' },
      { value: 'following' as const, label: 'Following' },
    ]
  }, [])

  const header = chromeHidden ? null : (
    <div className="fixed left-0 right-0 top-14 z-40 border-b border-stroke/20 bg-bg/70 backdrop-blur supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3">
        <UnderlineTabs value={mode} onChange={setMode} tabs={tabs} />
        <div className="hidden text-xs text-muted sm:block">Arrow keys switch clips</div>
      </div>
    </div>
  )

  return (
    <div className="relative">
      {header}

      <ComposerDialog
        open={composerOpen}
        onClose={closeComposer}
        onCreated={async () => {
          await reload()
          scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onRequireAuth={requireAuth}
        onNeedProfile={needProfile}
      />

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

      <div
        ref={scrollerRef}
        className="h-[100dvh] snap-y snap-mandatory overflow-y-auto"
        style={{ paddingTop: chromeHidden ? 0 : 140, scrollPaddingTop: chromeHidden ? 0 : 140 }}
        aria-label="Feed"
      >
        {loading ? (
          <div className="mx-auto max-w-[1100px] space-y-4 px-4 pb-10">
            <Skeleton className="h-[60dvh]" />
            <Skeleton className="h-[60dvh]" />
          </div>
        ) : err ? (
          <div className="mx-auto max-w-[820px] px-4 pb-12 pt-10">
            <EmptyState
              title="Couldn’t load the feed"
              hint={err}
              action={
                <button
                  onClick={reload}
                  className="rounded-2xl bg-panel2/70 px-3 py-2 text-sm text-fg hover:bg-panel2 focus-visible:safe-focus"
                >
                  Try again
                </button>
              }
            />
          </div>
        ) : mode === 'following' && !user ? (
          <div className="mx-auto max-w-[820px] px-4 pb-12 pt-10">
            <EmptyState
              title="Sign in to see Following"
              hint="Following is personal, so we only show it when you’re signed in."
              action={
                <button
                  onClick={requireAuth}
                  className="rounded-2xl bg-panel2/70 px-3 py-2 text-sm text-fg hover:bg-panel2 focus-visible:safe-focus"
                >
                  Sign in
                </button>
              }
            />
          </div>
        ) : !posts.length ? (
          <div className="mx-auto max-w-[820px] px-4 pb-12 pt-10">
            <EmptyState
              title={mode === 'following' ? 'No posts from people you follow' : 'No posts yet'}
              hint={mode === 'following' ? 'Follow a profile to build this feed.' : 'Be the first to post a Shorts link.'}
              action={
                <button
                  onClick={() => setComposerOpen(true)}
                  className="rounded-2xl bg-panel2/70 px-3 py-2 text-sm text-fg hover:bg-panel2 focus-visible:safe-focus"
                >
                  New post
                </button>
              }
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

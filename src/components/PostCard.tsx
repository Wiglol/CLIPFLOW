import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PublicPost } from '../lib/types'
import YouTubePlayer from './YouTubePlayer'
import Icon from './icons'
import Button from './Button'
import PopoverMenu from './PopoverMenu'
import Modal from './Modal'
import { TextareaField } from './Field'
import { blockUser, notInterested, reportPost, toggleFollow, toggleLike } from '../lib/feed'
import { useAuth } from '../state/auth'

function thumbUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

function captionNodes(caption: string, onHashtag: (tag: string) => void) {
  const parts = caption.split(/(#[\p{L}\p{N}_]{1,64})/gu)
  return parts.map((p, i) => {
    if (/^#[\p{L}\p{N}_]{1,64}$/u.test(p)) {
      const tag = p.slice(1)
      return (
        <button
          key={i}
          onClick={() => onHashtag(tag)}
          className="text-brand/90 hover:text-brand focus-visible:safe-focus"
          aria-label={`Open hashtag ${p}`}
        >
          {p}
        </button>
      )
    }
    return <span key={i}>{p}</span>
  })
}

export default function PostCard({
  post,
  active,
  muted,
  shouldLoad,
  volume,
  onSetVolume,
  onToggleMute,
  onOpenComments,
  onPatch,
  onRemove,
  onRequireAuth,
}: {
  post: PublicPost
  active: boolean
  muted: boolean
  shouldLoad: boolean
  volume: number
  onSetVolume: (v: number) => void
  onToggleMute: () => void
  onOpenComments: () => void
  onPatch: (id: string, patch: Partial<PublicPost>) => void
  onRemove: (id: string) => void
  onRequireAuth: () => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportErr, setReportErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isMe = !!user && user.id === post.user_id

  const canInteract = !!user

  const likeLabel = useMemo(() => (post.liked_by_me ? 'Unlike' : 'Like'), [post.liked_by_me])
  const followLabel = useMemo(
    () => (post.author_followed_by_me ? 'Following' : 'Follow'),
    [post.author_followed_by_me],
  )

  const onLike = async () => {
    if (!canInteract) return onRequireAuth()

    const prevLiked = !!post.liked_by_me
    const prevCount = post.like_count

    onPatch(post.id, {
      liked_by_me: !prevLiked,
      like_count: Math.max(0, prevCount + (prevLiked ? -1 : 1)),
    })

    try {
      const now = await toggleLike(post.id, user!.id)
      onPatch(post.id, { liked_by_me: now })
    } catch (e) {
      // revert
      onPatch(post.id, { liked_by_me: prevLiked, like_count: prevCount })
      const msg = e instanceof Error ? e.message : String(e)
      alert(msg)
    }
  }

  const onFollow = async () => {
    if (!canInteract) return onRequireAuth()
    if (isMe) return

    const prev = !!post.author_followed_by_me
    onPatch(post.id, { author_followed_by_me: !prev })

    try {
      const now = await toggleFollow(post.user_id, user!.id)
      onPatch(post.id, { author_followed_by_me: now })
    } catch (e) {
      onPatch(post.id, { author_followed_by_me: prev })
      const msg = e instanceof Error ? e.message : String(e)
      alert(msg)
    }
  }

  const onHashtag = (tag: string) => navigate(`/tag/${encodeURIComponent(tag)}`)

  const permalink = useMemo(() => {
    const base = import.meta.env.BASE_URL || '/'
    const path = base.endsWith('/') ? base.slice(0, -1) : base
    return `${window.location.origin}${path}/p/${post.id}`
  }, [post.id])

  const moreItems = useMemo(() => {
    const items = [] as { label: string; danger?: boolean; onClick: () => void }[]

    items.push({
      label: 'Copy link',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(permalink)
        } catch {
          // fallback
          prompt('Copy link', permalink)
        }
      },
    })

    if (!isMe) {
      items.push({
        label: 'Report post',
        onClick: () => {
          if (!canInteract) return onRequireAuth()
          setReportOpen(true)
        },
      })

      items.push({
        label: 'Not interested',
        onClick: async () => {
          if (!canInteract) return onRequireAuth()
          try {
            await notInterested(post.id, user!.id)
            onRemove(post.id)
          } catch (e) {
            alert(e instanceof Error ? e.message : String(e))
          }
        },
      })

      items.push({
        label: 'Block user',
        danger: true,
        onClick: async () => {
          if (!canInteract) return onRequireAuth()
          const ok = confirm(`Block @${post.author_username}? You won't see their posts or comments.`)
          if (!ok) return
          try {
            await blockUser(post.user_id, user!.id)
            onRemove(post.id)
          } catch (e) {
            alert(e instanceof Error ? e.message : String(e))
          }
        },
      })
    }

    return items
  }, [canInteract, isMe, onRemove, permalink, post.author_username, post.id, post.user_id, user, onRequireAuth])

  const submitReport = async () => {
    setReportErr(null)
    if (!user) {
      setReportOpen(false)
      onRequireAuth()
      return
    }
    setBusy(true)
    try {
      await reportPost(post.id, user.id, reportReason)
      setReportOpen(false)
      setReportReason('')
    } catch (e) {
      setReportErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="relative mx-auto h-[calc(100dvh-140px)] w-full max-w-[1100px] snap-start mb-3"
      aria-label={`Post by ${post.author_username}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-none bg-black sm:rounded-3xl">
        {/* player */}
        <div className="absolute inset-0">
          <div className="h-full w-full bg-black">
            {shouldLoad ? (
              <YouTubePlayer
                storedEmbedUrl={post.embed_url}
                title={`YouTube video ${post.video_id}`}
                active={active}
                muted={muted}
            volume={volume}
            aspectHint={post.original_url.includes('/shorts/') ? 'shorts' : 'video'}
            shouldLoad={shouldLoad}
          />
            ) : (
              <img
                src={thumbUrl(post.video_id)}
                alt=""
                className="h-full w-full object-cover opacity-70"
                loading="lazy"
              />
            )}
          </div>
        </div>

        {/* gradient for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/30" />

        {/* top row */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-3 px-4 pt-16">
          <div className="flex items-center gap-2">
            <Link
              to={`/u/${post.author_username}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-black/30 px-2 py-1.5 text-sm text-fg hover:bg-black/40 focus-visible:safe-focus"
              aria-label={`Open profile ${post.author_username}`}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                {post.author_avatar_url ? (
                  <img src={post.author_avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold">{post.author_username.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <span className="max-w-[180px] truncate font-semibold">@{post.author_username}</span>
            </Link>

            {!isMe ? (
              <button
                onClick={onFollow}
                className={[
                  'rounded-2xl px-2.5 py-1.5 text-sm font-semibold focus-visible:safe-focus',
                  post.author_followed_by_me ? 'bg-black/30 text-fg hover:bg-black/40' : 'bg-brand/25 text-fg hover:bg-brand/30',
                ].join(' ')}
                aria-label={followLabel}
              >
                {followLabel}
              </button>
            ) : null}
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black/30 text-fg hover:bg-black/40 focus-visible:safe-focus"
              aria-label="More actions"
            >
              <Icon.More className="h-5 w-5" />
            </button>
            <PopoverMenu open={menuOpen} onClose={() => setMenuOpen(false)} items={moreItems} />
          </div>
        </div>

        {/* right actions */}
        <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-3 sm:right-5">
          <button
            onClick={onLike}
            className="flex flex-col items-center gap-1 rounded-2xl bg-black/25 px-3 py-2 text-fg hover:bg-black/35 focus-visible:safe-focus"
            aria-label={likeLabel}
          >
            <Icon.Heart className={['h-6 w-6', post.liked_by_me ? 'text-brand' : 'text-fg'].join(' ')} />
            <span className="text-xs text-fg/90">{post.like_count}</span>
          </button>

          <button
            onClick={onOpenComments}
            className="flex flex-col items-center gap-1 rounded-2xl bg-black/25 px-3 py-2 text-fg hover:bg-black/35 focus-visible:safe-focus"
            aria-label="Open comments"
          >
            <Icon.Message className="h-6 w-6" />
            <span className="text-xs text-fg/90">{post.comment_count}</span>
          </button>

          <div className="group relative flex flex-col items-center">
          <div className="pointer-events-none absolute -top-12 right-0 opacity-0 transition group-hover:opacity-100">
            <div className="pointer-events-auto rounded-2xl bg-black/35 px-3 py-2 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="w-8 text-right text-[11px] text-fg/80">{Math.round(volume)}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => onSetVolume(Number(e.target.value))}
                  className="h-2 w-28 accent-white"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onToggleMute}
            className="flex flex-col items-center gap-1 rounded-2xl bg-black/25 px-3 py-2 text-fg hover:bg-black/35 focus-visible:safe-focus"
            aria-label={muted || volume <= 0 ? 'Unmute' : 'Mute'}
          >
            {muted || volume <= 0 ? <Icon.VolumeX className="h-6 w-6" /> : <Icon.Volume2 className="h-6 w-6" />}
            <span className="text-xs text-fg/90">{muted || volume <= 0 ? 'Muted' : 'Sound'}</span>
          </button>
        </div>
        </div>

        {/* caption */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5 pt-2 sm:px-5">
          <div className="flex max-w-[720px] flex-col gap-2">
            {post.caption ? (
              <div className="rounded-3xl bg-black/25 px-3 py-2 text-sm text-fg/95">
                <div className="leading-relaxed">{captionNodes(post.caption, onHashtag)}</div>
              </div>
            ) : null}
            <div className="flex items-center gap-3 text-xs text-fg/70">
              <Link to={`/p/${post.id}`} className="hover:text-fg focus-visible:safe-focus" aria-label="Open permalink">
                Open link
              </Link>
              <span className="opacity-50">•</span>
              <a
                href={post.original_url}
                target="_blank"
                rel="noreferrer"
                className="truncate hover:text-fg focus-visible:safe-focus"
                aria-label="Open on YouTube"
              >
                YouTube
              </a>
            </div>
          </div>
        </div>

        {/* report modal */}
        <Modal
          open={reportOpen}
          onClose={() => {
            setReportOpen(false)
            setReportErr(null)
          }}
          title="Report post"
          widthClassName="max-w-lg"
        >
          <div className="space-y-3">
            <TextareaField
              label="Reason"
              hint="Short and specific helps the most."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
              aria-label="Report reason"
              error={reportErr}
            />
            <div className="flex items-center justify-end gap-2">
              <Button onClick={() => setReportOpen(false)} aria-label="Cancel report">Cancel</Button>
              <Button variant="solid" onClick={submitReport} disabled={busy} aria-label="Submit report">
                {busy ? 'Sending…' : 'Send report'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </section>
  )
}

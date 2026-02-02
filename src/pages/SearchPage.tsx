import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'
import { InputField } from '../components/Field'
import type { Hashtag, Profile, PublicPost } from '../lib/types'
import { humanError } from '../lib/errors'
import { searchHashtags, searchPosts, searchProfiles } from '../lib/feed'
import { shortTime } from '../lib/format'
import { useAuth } from '../state/auth'

function thumbUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export default function SearchPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [q, setQ] = useState(() => params.get('q') ?? '')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [tags, setTags] = useState<Hashtag[]>([])
  const [posts, setPosts] = useState<PublicPost[]>([])

  const viewerId = user?.id ?? null
  const cleaned = useMemo(() => q.trim(), [q])

  useEffect(() => {
    const urlQ = params.get('q') ?? ''
    if (urlQ !== q) setQ(urlQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    const next = new URLSearchParams(params)
    if (cleaned) next.set('q', cleaned)
    else next.delete('q')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned])

  useEffect(() => {
    const term = cleaned
    setErr(null)

    if (!term) {
      setProfiles([])
      setTags([])
      setPosts([])
      setLoading(false)
      return
    }

    let alive = true
    setLoading(true)

    const t = window.setTimeout(() => {
      Promise.all([searchProfiles(term), searchHashtags(term), searchPosts(term, viewerId)])
        .then(([p, h, po]) => {
          if (!alive) return
          setProfiles(p)
          setTags(h)
          setPosts(po)
        })
        .catch((e) => {
          if (!alive) return
          setErr(humanError(e))
        })
        .finally(() => {
          if (!alive) return
          setLoading(false)
        })
    }, 250)

    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [cleaned, viewerId])

  return (
    <div className="mx-auto max-w-[980px] px-4 pb-20 pt-20 sm:pt-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Search</h1>
          <p className="mt-1 text-sm text-muted">Find profiles, tags, and clips.</p>
        </div>
        <Button onClick={() => navigate('/')} aria-label="Back to feed">Back</Button>
      </div>

      <div className="mt-6">
        <InputField
          label="Search"
          hint="Try a username, words in a caption, or #tag."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="wiglol, minecraft, #sunfall…"
          autoComplete="off"
          error={null}
          aria-label="Search query"
        />
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : err ? (
        <div className="mt-6">
          <EmptyState title="Search failed" hint={err} />
        </div>
      ) : !cleaned ? (
        <div className="mt-6 rounded-3xl border border-stroke/20 bg-panel px-4 py-4 text-sm text-muted">
          Start typing to search. You can browse the feed without signing in.
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-fg">Profiles</h2>
              <div className="text-xs text-muted">{profiles.length ? `${profiles.length} result(s)` : 'No matches'}</div>
            </div>

            {profiles.length ? (
              <div className="divide-y divide-stroke/15 overflow-hidden rounded-3xl border border-stroke/15 bg-panel">
                {profiles.map((p) => (
                  <Link
                    key={p.id}
                    to={`/u/${p.username}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-panel2/40 focus-visible:safe-focus"
                    aria-label={`Open profile ${p.username}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">@{p.username}</div>
                      <div className="truncate text-xs text-muted">{p.display_name ?? '—'}</div>
                    </div>
                    <span className="text-xs text-muted">Open</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-muted">
                No profiles matched “{cleaned}”.
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-fg">Hashtags</h2>
              <div className="text-xs text-muted">{tags.length ? `${tags.length} result(s)` : 'No matches'}</div>
            </div>

            {tags.length ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((h) => (
                  <Link
                    key={h.id}
                    to={`/tag/${encodeURIComponent(h.tag)}`}
                    className="rounded-2xl border border-stroke/15 bg-panel px-3 py-2 text-sm text-fg hover:bg-panel2/40 focus-visible:safe-focus"
                    aria-label={`Open hashtag ${h.tag}`}
                  >
                    #{h.tag}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-muted">
                No tags matched “{cleaned}”. If you type “#something”, we’ll still try.
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-fg">Posts</h2>
              <div className="text-xs text-muted">{posts.length ? `${posts.length} result(s)` : 'No matches'}</div>
            </div>

            {posts.length ? (
              <div className="divide-y divide-stroke/15 overflow-hidden rounded-3xl border border-stroke/15 bg-panel">
                {posts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/p/${p.id}`}
                    className="flex gap-3 px-4 py-3 hover:bg-panel2/40 focus-visible:safe-focus"
                    aria-label={`Open post by ${p.author_username}`}
                  >
                    <img
                      src={thumbUrl(p.video_id)}
                      alt=""
                      className="h-16 w-24 shrink-0 rounded-2xl object-cover opacity-95"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="truncate text-sm font-semibold">@{p.author_username}</div>
                        <div className="shrink-0 text-xs text-muted">{shortTime(p.created_at)}</div>
                      </div>
                      <div className="mt-1 max-h-[2.6em] overflow-hidden text-sm leading-snug text-fg/90">
                        {p.caption?.trim() ? p.caption : <span className="text-muted">No caption</span>}
                      </div>
                      <div className="mt-2 text-xs text-muted">
                        {p.like_count} like{p.like_count === 1 ? '' : 's'} · {p.comment_count} comment{p.comment_count === 1 ? '' : 's'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-muted">
                No posts matched “{cleaned}”.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

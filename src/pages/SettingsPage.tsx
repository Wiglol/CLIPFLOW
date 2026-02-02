import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'
import type { Profile, PublicPost } from '../lib/types'
import { humanError } from '../lib/errors'
import { listBlockedUsers, listHiddenPosts, unblockUser, unhidePost } from '../lib/feed'
import { useAuth } from '../state/auth'

function thumbUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

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

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [blocked, setBlocked] = useState<Profile[]>([])
  const [hidden, setHidden] = useState<PublicPost[]>([])
  const [muted, setMuted] = useLocalStorageBool('clipflow:muted', true)

  const email = useMemo(() => user?.email ?? '', [user])

  const loadSafety = async () => {
    if (!user) return
    setErr(null)
    setLoading(true)
    try {
      const [b, h] = await Promise.all([listBlockedUsers(user.id), listHiddenPosts(user.id)])
      setBlocked(b)
      setHidden(h)
    } catch (e) {
      setErr(humanError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadSafety()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const doSignOut = async () => {
    setErr(null)
    try {
      await signOut()
      navigate('/')
    } catch (e) {
      setErr(humanError(e))
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[820px] px-4 pb-20 pt-20 sm:pt-24">
        <EmptyState
          title="Settings"
          hint="Sign in to manage your account and safety settings."
          action={<Button onClick={() => navigate('/auth?next=/settings')} variant="solid" aria-label="Sign in">Sign in</Button>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[980px] px-4 pb-20 pt-20 sm:pt-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted">Account and safety controls.</p>
        </div>
        <Button onClick={() => navigate('/')} aria-label="Back to feed">Back</Button>
      </div>

      {err ? <div className="mt-6"><EmptyState title="Couldn’t load settings" hint={err} /></div> : null}

      <div className="mt-6 space-y-10">
        <section>
          <div className="mb-2 text-sm font-semibold">Account</div>
          <div className="rounded-3xl border border-stroke/20 bg-panel px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm text-fg">{profile ? `@${profile.username}` : 'Profile not set up yet'}</div>
                <div className="mt-1 text-xs text-muted">{email}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={profile ? `/u/${profile.username}` : '/onboarding'}
                  className="inline-flex items-center justify-center rounded-2xl bg-panel2/70 px-3.5 py-2 text-sm font-medium text-fg hover:bg-panel2 focus-visible:safe-focus"
                  aria-label="Open profile"
                >
                  Open profile
                </Link>
                <Button onClick={doSignOut} aria-label="Sign out">Sign out</Button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-stroke/15 bg-panel2/20 px-3 py-2">
              <div>
                <div className="text-sm font-semibold">Muted by default</div>
                <div className="text-xs text-muted">Applies to the feed and hashtag pages.</div>
              </div>
              <button
                onClick={() => setMuted((m) => !m)}
                className={['h-9 w-14 rounded-full border border-stroke/20 p-1 transition', muted ? 'bg-panel2/70' : 'bg-panel/60'].join(' ')}
                aria-label="Toggle muted by default"
              >
                <span className={['block h-7 w-7 rounded-full bg-fg/10 transition', muted ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold">Safety</div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="text-sm font-semibold">Blocked users</div>
                  <div className="text-xs text-muted">{blocked.length ? `${blocked.length}` : '0'}</div>
                </div>

                {blocked.length ? (
                  <div className="divide-y divide-stroke/15 overflow-hidden rounded-3xl border border-stroke/15 bg-panel">
                    {blocked.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">@{p.username}</div>
                          <div className="truncate text-xs text-muted">{p.display_name ?? '—'}</div>
                        </div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await unblockUser(p.id, user.id)
                              setBlocked((prev) => prev.filter((x) => x.id !== p.id))
                            } catch (e) {
                              setErr(humanError(e))
                            }
                          }}
                          aria-label={`Unblock ${p.username}`}
                        >
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-muted">
                    You haven’t blocked anyone.
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="text-sm font-semibold">Hidden posts</div>
                  <div className="text-xs text-muted">{hidden.length ? `${hidden.length}` : '0'}</div>
                </div>

                {hidden.length ? (
                  <div className="divide-y divide-stroke/15 overflow-hidden rounded-3xl border border-stroke/15 bg-panel">
                    {hidden.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <img src={thumbUrl(p.video_id)} alt="" className="h-14 w-20 shrink-0 rounded-2xl object-cover" loading="lazy" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">@{p.author_username}</div>
                          <div className="truncate text-xs text-muted">{p.caption?.trim() ? p.caption : 'No caption'}</div>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                            <Link to={`/p/${p.id}`} className="hover:text-fg focus-visible:safe-focus" aria-label="Open post">Open</Link>
                            <button
                              onClick={async () => {
                                try {
                                  await unhidePost(p.id, user.id)
                                  setHidden((prev) => prev.filter((x) => x.id !== p.id))
                                } catch (e) {
                                  setErr(humanError(e))
                                }
                              }}
                              className="hover:text-fg focus-visible:safe-focus"
                              aria-label="Unhide post"
                            >
                              Unhide
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-muted">
                    Hidden posts will show up here if you tap “Not interested”.
                  </div>
                )}
              </div>
              <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-muted">
                Tip: Reports are private. Blocking only affects what you see.
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold">Shortcuts</div>
          <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-muted">
            Feed navigation: <span className="text-fg">Arrow Up</span> and <span className="text-fg">Arrow Down</span>. 
            Sound toggle is on the right side of a clip.
          </div>
        </section>
      </div>
    </div>
  )
}

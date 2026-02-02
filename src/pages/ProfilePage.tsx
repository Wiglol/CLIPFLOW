import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import { InputField, TextareaField } from '../components/Field'
import type { Profile, PublicPost } from '../lib/types'
import {
  blockUser,
  fetchFollowCounts,
  fetchProfileByUsername,
  fetchUserPosts,
  toggleFollow,
  unblockUser,
  listBlockedUsers,
} from '../lib/feed'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { shortTime } from '../lib/format'
import { useAuth } from '../state/auth'

function thumbUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export default function ProfilePage() {
  const { username = '' } = useParams()
  const uname = useMemo(() => decodeURIComponent(username), [username])

  const { user, profile: meProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [p, setP] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<PublicPost[]>([])
  const [counts, setCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 })
  const [following, setFollowing] = useState(false)
  const [blockedByMe, setBlockedByMe] = useState(false)

  const isMe = !!user && !!p && user.id === p.id

  const [editOpen, setEditOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  
    useEffect(() => {
    if (user && !meProfile) {
      refreshProfile().catch(() => {})
    }
  }, [user?.id, meProfile?.id, refreshProfile])


  const requireAuth = () => {
    const next = window.location.pathname + window.location.search
    navigate(`/auth?next=${encodeURIComponent(next)}`)
  }
  
  const onDeletePost = async (postId: string) => {
  if (!user) {
    requireAuth()
    return
  }

  if (deletingId) return

  const ok = window.confirm('Delete this post? This cannot be undone.')
  if (!ok) return

  setDeletingId(postId)
  setErr(null)

  try {
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) throw error

    setPosts((prev) => prev.filter((x) => x.id !== postId))
  } catch (e) {
    setErr(humanError(e))
  } finally {
    setDeletingId(null)
  }
}


  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr(null)

    fetchProfileByUsername(uname)
      .then(async (profile) => {
        if (!alive) return

        if (!profile) {
          setP(null)
          setPosts([])
          setCounts({ followers: 0, following: 0 })
          setFollowing(false)
          setBlockedByMe(false)
          setLoading(false)
          return
        }

        setP(profile)

        const [c, userPosts] = await Promise.all([
          fetchFollowCounts(profile.id),
          fetchUserPosts(profile.id, user?.id ?? null),
        ])

        if (!alive) return
        setCounts(c)
        setPosts(userPosts)

        if (user && user.id !== profile.id) {
          const f = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id)
            .eq('following_id', profile.id)
            .maybeSingle()

          if (!alive) return
          setFollowing(!!f.data)

          const blocks = await listBlockedUsers(user.id)
          if (!alive) return
          setBlockedByMe(blocks.some((x) => x.id === profile.id))
        } else {
          setFollowing(false)
          setBlockedByMe(false)
        }

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
  }, [uname, user?.id])

  const openEdit = () => {
    if (!p) return
    setDisplayName(p.display_name ?? '')
    setAvatarUrl(p.avatar_url ?? '')
    setBio(p.bio ?? '')
    setEditErr(null)
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!user || !p || user.id !== p.id) return
    setEditErr(null)
    setEditBusy(true)
    try {
      const res = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim().slice(0, 60) || null,
          avatar_url: avatarUrl.trim() || null,
          bio: bio.trim().slice(0, 240) || null,
        })
        .eq('id', user.id)

      if (res.error) throw new Error(humanError(res.error))

      await refreshProfile()
      const refreshed = await fetchProfileByUsername(uname)
      setP(refreshed)
      setEditOpen(false)
    } catch (e) {
      setEditErr(humanError(e))
    } finally {
      setEditBusy(false)
    }
  }

  const onFollow = async () => {
    if (!user) return requireAuth()
    if (!p) return
    if (p.id === user.id) return

    const prev = following
    setFollowing(!prev)
    setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + (prev ? -1 : 1)) }))

    try {
      const now = await toggleFollow(p.id, user.id)
      setFollowing(now)
    } catch (e) {
      setFollowing(prev)
      setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + (prev ? 1 : -1)) }))
      alert(humanError(e))
    }
  }

  const onBlockToggle = async () => {
    if (!user) return requireAuth()
    if (!p) return
    if (p.id === user.id) return

    const confirmMsg = blockedByMe
      ? `Unblock @${p.username}?`
      : `Block @${p.username}? You won't see their posts or comments.`
    if (!confirm(confirmMsg)) return

    try {
      if (blockedByMe) {
        await unblockUser(p.id, user.id)
        setBlockedByMe(false)
      } else {
        await blockUser(p.id, user.id)
        setBlockedByMe(true)
      }
    } catch (e) {
      alert(humanError(e))
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[980px] px-4 pb-20 pt-20 sm:pt-24">
        <Skeleton className="h-28" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    )
  }

  if (err) {
    return (
      <div className="mx-auto max-w-[820px] px-4 pb-20 pt-20 sm:pt-24">
        <EmptyState title="Couldn’t load profile" hint={err} />
      </div>
    )
  }

  if (!p) {
    return (
      <div className="mx-auto max-w-[820px] px-4 pb-20 pt-20 sm:pt-24">
        <EmptyState
          title="Profile not found"
          hint="That username doesn’t exist."
          action={<Button onClick={() => navigate('/')} variant="solid">Back to feed</Button>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[980px] px-4 pb-20 pt-20 sm:pt-24">
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" widthClassName="max-w-lg">
        <div className="space-y-4">
          {editErr ? <div className="text-sm text-danger">{editErr}</div> : null}

          <InputField
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            aria-label="Display name"
            error={null}
          />
          <InputField
            label="Avatar URL"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            aria-label="Avatar URL"
            error={null}
          />
          <TextareaField
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short bio…"
            rows={4}
            aria-label="Bio"
            error={null}
            right={<span>{bio.trim().length}/240</span>}
          />

          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => setEditOpen(false)} aria-label="Cancel edit">Cancel</Button>
            <Button variant="solid" onClick={saveEdit} disabled={editBusy} aria-label="Save profile">
              {editBusy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar url={p.avatar_url} name={p.display_name || p.username} size={56} className="shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">@{p.username}</h1>
            <div className="mt-0.5 truncate text-sm text-muted">{p.display_name ?? '—'}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button onClick={() => navigate('/')} aria-label="Back to feed">Back</Button>
          {isMe ? (
            <Button variant="solid" onClick={openEdit} aria-label="Edit profile">Edit</Button>
          ) : (
            <>
              <Button variant="solid" onClick={onFollow} aria-label={following ? 'Unfollow' : 'Follow'}>
                {following ? 'Following' : 'Follow'}
              </Button>
              <Button variant="ghost" onClick={onBlockToggle} aria-label={blockedByMe ? 'Unblock user' : 'Block user'}>
                {blockedByMe ? 'Unblock' : 'Block'}
              </Button>
            </>
          )}
        </div>
      </div>

      {p.bio ? (
        <div className="mt-4 whitespace-pre-wrap rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-fg/90">
          {p.bio}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-3">
          <div className="text-xs text-muted">Posts</div>
          <div className="mt-1 text-lg font-semibold">{posts.length}</div>
        </div>
        <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-3">
          <div className="text-xs text-muted">Followers</div>
          <div className="mt-1 text-lg font-semibold">{counts.followers}</div>
        </div>
        <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-3">
          <div className="text-xs text-muted">Following</div>
          <div className="mt-1 text-lg font-semibold">{counts.following}</div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-sm font-semibold">Posts</div>
          <div className="text-xs text-muted">{posts.length ? `${posts.length}` : '0'}</div>
        </div>

        {posts.length ? (
          <div className="divide-y divide-stroke/15 overflow-hidden rounded-3xl border border-stroke/15 bg-panel">
            {posts.map((po) => (
              <div key={po.id} className="flex gap-3 px-4 py-3">
                <img src={thumbUrl(po.video_id)} alt="" className="h-16 w-24 shrink-0 rounded-2xl object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="truncate text-sm font-semibold">{po.caption?.trim() ? po.caption : 'No caption'}</div>
                    <div className="shrink-0 text-xs text-muted">{shortTime(po.created_at)}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {po.like_count} like{po.like_count === 1 ? '' : 's'} · {po.comment_count} comment{po.comment_count === 1 ? '' : 's'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <Link to={`/p/${po.id}`} className="text-muted hover:text-fg focus-visible:safe-focus" aria-label="Open post">Open</Link>
                    <a href={po.original_url} target="_blank" rel="noreferrer" className="text-muted hover:text-fg focus-visible:safe-focus" aria-label="Open on YouTube">
                      YouTube
                    </a>
                    {isMe ? (
                      <button
                        type="button"
                        onClick={() => onDeletePost(po.id)}
                        disabled={deletingId === po.id}
                        className="text-danger hover:text-danger/90 disabled:opacity-60 focus-visible:safe-focus"
                        aria-label="Delete post"
                      >
                        {deletingId === po.id ? 'Deleting…' : 'Delete'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-muted">
            No posts yet.
          </div>
        )}
      </div>

      {isMe && !meProfile ? (
        <div className="mt-6 rounded-3xl border border-stroke/15 bg-panel px-4 py-4 text-sm text-muted">
          Your profile isn’t fully set up. <Link className="text-fg underline underline-offset-4" to="/onboarding">Finish onboarding</Link>.
        </div>
      ) : null}
    </div>
  )
}


import { supabase } from './supabase'
import type { Hashtag, Profile, PublicComment, PublicPost } from './types'
import { humanError } from './errors'

export type FeedMode = 'newest' | 'following'

type ViewerFilters = {
  blockedUserIds: Set<string>
  hiddenPostIds: Set<string>
}

async function getViewerFilters(viewerId: string | null): Promise<ViewerFilters> {
  if (!viewerId) return { blockedUserIds: new Set(), hiddenPostIds: new Set() }

  const [blocksRes, hiddenRes] = await Promise.all([
    supabase.from('blocks').select('blocked_id').eq('blocker_id', viewerId),
    supabase.from('not_interested').select('post_id').eq('user_id', viewerId),
  ])

  if (blocksRes.error) throw new Error(humanError(blocksRes.error))
  if (hiddenRes.error) throw new Error(humanError(hiddenRes.error))

  return {
    blockedUserIds: new Set((blocksRes.data ?? []).map((r) => r.blocked_id as string)),
    hiddenPostIds: new Set((hiddenRes.data ?? []).map((r) => r.post_id as string)),
  }
}

async function enrichViewerFlags(posts: PublicPost[], viewerId: string) {
  if (!posts.length) return posts
  const postIds = posts.map((p) => p.id)
  const authorIds = Array.from(new Set(posts.map((p) => p.user_id)))

  const [likesRes, followsRes] = await Promise.all([
    supabase.from('likes').select('post_id').eq('user_id', viewerId).in('post_id', postIds),
    supabase.from('follows').select('following_id').eq('follower_id', viewerId).in('following_id', authorIds),
  ])

  if (likesRes.error) throw new Error(humanError(likesRes.error))
  if (followsRes.error) throw new Error(humanError(followsRes.error))

  const liked = new Set((likesRes.data ?? []).map((r) => r.post_id as string))
  const followed = new Set((followsRes.data ?? []).map((r) => r.following_id as string))

  return posts.map((p) => ({ ...p, liked_by_me: liked.has(p.id), author_followed_by_me: followed.has(p.user_id) }))
}

export async function fetchFeed(mode: FeedMode, viewerId: string | null, limit = 30): Promise<PublicPost[]> {
  const filters = await getViewerFilters(viewerId)

  if (mode === 'following') {
    if (!viewerId) return []
    const followsRes = await supabase.from('follows').select('following_id').eq('follower_id', viewerId)
    if (followsRes.error) throw new Error(humanError(followsRes.error))
    const ids = (followsRes.data ?? []).map((r) => r.following_id as string)
    if (!ids.length) return []

    const res = await supabase
      .from('v_posts_public')
      .select('*')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (res.error) throw new Error(humanError(res.error))

    let posts = (res.data ?? []) as PublicPost[]
    posts = posts.filter((p) => !filters.blockedUserIds.has(p.user_id) && !filters.hiddenPostIds.has(p.id))
    if (viewerId) posts = await enrichViewerFlags(posts, viewerId)
    return posts
  }

  const res = await supabase.from('v_posts_public').select('*').order('created_at', { ascending: false }).limit(limit)
  if (res.error) throw new Error(humanError(res.error))

  let posts = (res.data ?? []) as PublicPost[]
  posts = posts.filter((p) => !filters.blockedUserIds.has(p.user_id) && !filters.hiddenPostIds.has(p.id))
  if (viewerId) posts = await enrichViewerFlags(posts, viewerId)
  return posts
}

export async function fetchPost(postId: string, viewerId: string | null): Promise<PublicPost | null> {
  const res = await supabase.from('v_posts_public').select('*').eq('id', postId).maybeSingle()
  if (res.error) throw new Error(humanError(res.error))
  const post = res.data as PublicPost | null
  if (!post) return null

  const filters = await getViewerFilters(viewerId)
  if (filters.blockedUserIds.has(post.user_id) || filters.hiddenPostIds.has(post.id)) return null
  if (viewerId) {
    const [likedRes, followRes] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', viewerId).eq('post_id', post.id).maybeSingle(),
      supabase.from('follows').select('following_id').eq('follower_id', viewerId).eq('following_id', post.user_id).maybeSingle(),
    ])
    if (likedRes.error) throw new Error(humanError(likedRes.error))
    if (followRes.error) throw new Error(humanError(followRes.error))
    post.liked_by_me = !!likedRes.data
    post.author_followed_by_me = !!followRes.data
  }

  return post
}

export async function createPost(input: {
  userId: string
  originalUrl: string
  videoId: string
  embedUrl: string
  caption?: string
  hashtags?: string[]
}): Promise<string> {
  const insertRes = await supabase
    .from('posts')
    .insert({
      user_id: input.userId,
      original_url: input.originalUrl,
      video_id: input.videoId,
      embed_url: input.embedUrl,
      caption: input.caption?.trim() || null,
    })
    .select('id')
    .single()

  if (insertRes.error) throw new Error(humanError(insertRes.error))
  const postId = insertRes.data.id as string

  const tags = (input.hashtags ?? []).map((t) => t.toLowerCase()).filter(Boolean)
  if (tags.length) {
    // Upsert hashtags
    const up = await supabase.from('hashtags').upsert(tags.map((tag) => ({ tag })), { onConflict: 'tag' }).select('id,tag')
    if (up.error) throw new Error(humanError(up.error))
    const rows = (up.data ?? []) as Hashtag[]

    // Attach (own posts only by policy)
    const attach = await supabase
      .from('post_hashtags')
      .upsert(rows.map((h) => ({ post_id: postId, hashtag_id: h.id })), { onConflict: 'post_id,hashtag_id' })
    if (attach.error) throw new Error(humanError(attach.error))
  }

  return postId
}

export async function toggleLike(postId: string, viewerId: string): Promise<boolean> {
  const existing = await supabase.from('likes').select('post_id').eq('user_id', viewerId).eq('post_id', postId).maybeSingle()
  if (existing.error) throw new Error(humanError(existing.error))

  if (existing.data) {
    const del = await supabase.from('likes').delete().eq('user_id', viewerId).eq('post_id', postId)
    if (del.error) throw new Error(humanError(del.error))
    return false
  }

  const ins = await supabase.from('likes').insert({ user_id: viewerId, post_id: postId })
  if (ins.error) throw new Error(humanError(ins.error))
  return true
}

export async function toggleFollow(targetUserId: string, viewerId: string): Promise<boolean> {
  const existing = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', viewerId)
    .eq('following_id', targetUserId)
    .maybeSingle()
  if (existing.error) throw new Error(humanError(existing.error))

  if (existing.data) {
    const del = await supabase.from('follows').delete().eq('follower_id', viewerId).eq('following_id', targetUserId)
    if (del.error) throw new Error(humanError(del.error))
    return false
  }

  const ins = await supabase.from('follows').insert({ follower_id: viewerId, following_id: targetUserId })
  if (ins.error) throw new Error(humanError(ins.error))
  return true
}

export async function fetchFollowCounts(profileId: string) {
  const [followers, following] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileId),
  ])
  if (followers.error) throw new Error(humanError(followers.error))
  if (following.error) throw new Error(humanError(following.error))
  return { followers: followers.count ?? 0, following: following.count ?? 0 }
}

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const res = await supabase.from('profiles').select('*').eq('username', username).maybeSingle()
  if (res.error) throw new Error(humanError(res.error))
  return (res.data as Profile | null) ?? null
}

export async function fetchUserPosts(profileId: string, viewerId: string | null): Promise<PublicPost[]> {
  const filters = await getViewerFilters(viewerId)
  const res = await supabase
    .from('v_posts_public')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (res.error) throw new Error(humanError(res.error))
  let posts = (res.data ?? []) as PublicPost[]
  posts = posts.filter((p) => !filters.blockedUserIds.has(p.user_id) && !filters.hiddenPostIds.has(p.id))
  if (viewerId) posts = await enrichViewerFlags(posts, viewerId)
  return posts
}

export async function fetchComments(postId: string): Promise<PublicComment[]> {
  const res = await supabase
    .from('v_comments_public')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(120)
  if (res.error) throw new Error(humanError(res.error))
  return (res.data ?? []) as PublicComment[]
}

export async function createComment(postId: string, viewerId: string, content: string): Promise<void> {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('Write something first.')
  const res = await supabase.from('comments').insert({ post_id: postId, user_id: viewerId, content: trimmed })
  if (res.error) throw new Error(humanError(res.error))
}

export function subscribeToComments(postId: string, onInsert: (commentId: string) => void) {
  const channel = supabase.channel(`comments:post_id=eq.${postId}`)
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
    (payload) => {
      const id = (payload.new as any)?.id as string | undefined
      if (id) onInsert(id)
    },
  )
  channel.subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

export async function fetchCommentById(commentId: string): Promise<PublicComment | null> {
  const res = await supabase.from('v_comments_public').select('*').eq('id', commentId).maybeSingle()
  if (res.error) throw new Error(humanError(res.error))
  return (res.data as PublicComment | null) ?? null
}

export async function reportPost(postId: string, reporterId: string, reason: string) {
  const r = reason.trim()
  if (r.length < 3) throw new Error('Add a short reason (at least 3 characters).')
  const res = await supabase.from('reports').insert({ post_id: postId, reporter_id: reporterId, reason: r })
  if (res.error) throw new Error(humanError(res.error))
}

export async function blockUser(blockedId: string, blockerId: string) {
  const res = await supabase.from('blocks').upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' })
  if (res.error) throw new Error(humanError(res.error))
}

export async function unblockUser(blockedId: string, blockerId: string) {
  const res = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId)
  if (res.error) throw new Error(humanError(res.error))
}

export async function notInterested(postId: string, userId: string) {
  const res = await supabase
    .from('not_interested')
    .upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id' })
  if (res.error) throw new Error(humanError(res.error))
}

export async function unhidePost(postId: string, userId: string) {
  const res = await supabase.from('not_interested').delete().eq('user_id', userId).eq('post_id', postId)
  if (res.error) throw new Error(humanError(res.error))
}

export async function listBlockedUsers(blockerId: string): Promise<Profile[]> {
  const blocks = await supabase.from('blocks').select('blocked_id').eq('blocker_id', blockerId)
  if (blocks.error) throw new Error(humanError(blocks.error))
  const ids = (blocks.data ?? []).map((r) => r.blocked_id as string)
  if (!ids.length) return []
  const res = await supabase.from('profiles').select('*').in('id', ids)
  if (res.error) throw new Error(humanError(res.error))
  return (res.data ?? []) as Profile[]
}

export async function listHiddenPosts(userId: string): Promise<PublicPost[]> {
  const hidden = await supabase.from('not_interested').select('post_id').eq('user_id', userId)
  if (hidden.error) throw new Error(humanError(hidden.error))
  const ids = (hidden.data ?? []).map((r) => r.post_id as string)
  if (!ids.length) return []
  const res = await supabase.from('v_posts_public').select('*').in('id', ids).order('created_at', { ascending: false }).limit(100)
  if (res.error) throw new Error(humanError(res.error))
  return (res.data ?? []) as PublicPost[]
}

export async function searchProfiles(q: string): Promise<Profile[]> {
  const term = q.trim()
  if (!term) return []
  const res = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .limit(20)
  if (res.error) throw new Error(humanError(res.error))
  return (res.data ?? []) as Profile[]
}

export async function searchPosts(q: string, viewerId: string | null): Promise<PublicPost[]> {
  const term = q.trim()
  if (!term) return []

  // caption search (simple) + author
  const res = await supabase
    .from('v_posts_public')
    .select('*')
    .or(`caption.ilike.%${term}%,author_username.ilike.%${term}%,author_display_name.ilike.%${term}%`)
    .order('created_at', { ascending: false })
    .limit(40)

  if (res.error) throw new Error(humanError(res.error))

  const filters = await getViewerFilters(viewerId)
  let posts = (res.data ?? []) as PublicPost[]
  posts = posts.filter((p) => !filters.blockedUserIds.has(p.user_id) && !filters.hiddenPostIds.has(p.id))
  if (viewerId) posts = await enrichViewerFlags(posts, viewerId)
  return posts
}

export async function fetchHashtagPosts(tag: string, viewerId: string | null): Promise<PublicPost[]> {
  const clean = tag.replace(/^#/, '').toLowerCase()
  if (!clean) return []

  const h = await supabase.from('hashtags').select('id,tag').eq('tag', clean).maybeSingle()
  if (h.error) throw new Error(humanError(h.error))
  if (!h.data) return []
  const hid = h.data.id as number

  const links = await supabase.from('post_hashtags').select('post_id').eq('hashtag_id', hid).limit(200)
  if (links.error) throw new Error(humanError(links.error))
  const ids = (links.data ?? []).map((r) => r.post_id as string)
  if (!ids.length) return []

  const res = await supabase.from('v_posts_public').select('*').in('id', ids).order('created_at', { ascending: false }).limit(50)
  if (res.error) throw new Error(humanError(res.error))

  const filters = await getViewerFilters(viewerId)
  let posts = (res.data ?? []) as PublicPost[]
  posts = posts.filter((p) => !filters.blockedUserIds.has(p.user_id) && !filters.hiddenPostIds.has(p.id))
  if (viewerId) posts = await enrichViewerFlags(posts, viewerId)
  return posts
}

// Back-compat naming (used by PostPage)
export async function fetchPostById(postId: string, viewerId: string | null) {
  return fetchPost(postId, viewerId)
}

export async function searchHashtags(q: string): Promise<Hashtag[]> {
  const term = q.trim().replace(/^#/, '').toLowerCase()
  if (!term) return []
  const res = await supabase.from('hashtags').select('id,tag,created_at').ilike('tag', `%${term}%`).order('tag', { ascending: true }).limit(20)
  if (res.error) throw new Error(humanError(res.error))
  return (res.data ?? []) as Hashtag[]
}

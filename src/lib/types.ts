export type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  user_id: string
  original_url: string
  video_id: string
  embed_url: string
  caption: string | null
  created_at: string
  updated_at: string
}

export type PublicPost = {
  id: string
  user_id: string
  original_url: string
  video_id: string
  embed_url: string
  caption: string | null
  created_at: string
  author_username: string
  author_display_name: string | null
  author_avatar_url: string | null
  like_count: number
  comment_count: number
  liked_by_me?: boolean
  author_followed_by_me?: boolean
}

export type PublicComment = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export type Follow = { follower_id: string; following_id: string; created_at: string }
export type Like = { user_id: string; post_id: string; created_at: string }
export type Block = { blocker_id: string; blocked_id: string; created_at: string }
export type NotInterested = { user_id: string; post_id: string; created_at: string }

export type Hashtag = { id: number; tag: string; created_at: string }
export type PostHashtag = { post_id: string; hashtag_id: number; created_at: string }

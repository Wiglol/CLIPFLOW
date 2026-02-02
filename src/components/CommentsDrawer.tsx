import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Avatar from './Avatar'
import Button from './Button'
import Skeleton from './Skeleton'
import { useAuth } from '../state/auth'
import type { PublicComment } from '../lib/types'
import { createComment, fetchCommentById, fetchComments, subscribeToComments } from '../lib/feed'
import { shortTime } from '../lib/format'

export default function CommentsDrawer({
  open,
  onClose,
  postId,
  onCountAdd,
  onRequireAuth,
}: {
  open: boolean
  onClose: () => void
  postId: string
  onCountAdd?: (delta: number) => void
  onRequireAuth: () => void
}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PublicComment[]>([])
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const seen = useRef<Set<string>>(new Set())

  const title = useMemo(() => 'Comments', [])

  useEffect(() => {
    if (!open) return
    setErr(null)
    setDraft('')
    setLoading(true)
    seen.current = new Set()

    fetchComments(postId)
      .then((data) => {
        setItems(data)
        for (const c of data) seen.current.add(c.id)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [open, postId])

  useEffect(() => {
    if (!open) return
    const unsub = subscribeToComments(postId, async (commentId) => {
      if (seen.current.has(commentId)) return
      seen.current.add(commentId)
      try {
        const full = await fetchCommentById(commentId)
        if (!full) return
        setItems((prev) => [...prev, full])
        onCountAdd?.(1)
      } catch {
        // ignore: realtime should not spam errors
      }
    })
    return () => unsub()
  }, [open, postId, onCountAdd])

  const onSend = async () => {
    setErr(null)
    if (!user) {
      onClose()
      onRequireAuth()
      return
    }

    try {
      await createComment(postId, user.id, draft)
      setDraft('')
      onCountAdd?.(1)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-xl">
      <div className="flex max-h-[72dvh] flex-col">
        <div className="flex-1 space-y-2 overflow-auto pr-1">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : items.length ? (
            items.map((c) => (
              <div key={c.id} className="flex gap-3 rounded-2xl bg-panel2/30 px-3 py-2">
                <Avatar url={c.avatar_url} name={c.display_name || c.username} size={36} className="shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <div className="truncate text-sm font-semibold">{c.username}</div>
                    <div className="text-xs text-muted">{shortTime(c.created_at)}</div>
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm text-fg/90">{c.content}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-stroke/20 bg-panel px-4 py-4 text-sm text-muted">
              No comments yet.
            </div>
          )}
        </div>

        <div className="mt-3">
          {err ? <div className="mb-2 text-sm text-danger">{err}</div> : null}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={user ? 'Write a comment…' : 'Sign in to comment'}
              className="min-h-[44px] w-full resize-none rounded-2xl border border-stroke/25 bg-panel px-3 py-2 text-sm text-fg placeholder:text-muted/70 focus-visible:safe-focus"
              rows={2}
              aria-label="Comment text"
            />
            <Button
              variant="solid"
              onClick={onSend}
              disabled={!draft.trim()}
              className="h-[44px] shrink-0"
              aria-label="Send comment"
            >
              Send
            </Button>
          </div>
          {!user ? (
            <div className="mt-2 text-xs text-muted">
              You can read comments without signing in.
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

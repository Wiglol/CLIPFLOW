import { useMemo, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { InputField, TextareaField } from './Field'
import { useAuth } from '../state/auth'
import { buildStoredEmbedUrl, extractHashtags, parseYouTubeVideoId } from '../lib/youtube'
import { createPost } from '../lib/feed'

export default function ComposerDialog({
  open,
  onClose,
  onCreated,
  onRequireAuth,
  onNeedProfile,
}: {
  open: boolean
  onClose: () => void
  onCreated: (postId: string) => void
  onRequireAuth: () => void
  onNeedProfile: () => void
}) {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const vid = useMemo(() => parseYouTubeVideoId(url), [url])
  const tags = useMemo(() => extractHashtags(caption), [caption])

  const reset = () => {
    setUrl('')
    setCaption('')
    setErr(null)
    setBusy(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const onSubmit = async () => {
    setErr(null)
    if (!user) {
      close()
      onRequireAuth()
      return
    }

    const videoId = vid
    if (!videoId) {
      setErr(
        'Paste a YouTube Shorts link (or a regular YouTube link). Examples: youtube.com/shorts/VIDEOID or youtu.be/VIDEOID',
      )
      return
    }

    setBusy(true)
    try {
      const embedUrl = buildStoredEmbedUrl(videoId)
      const postId = await createPost({
        userId: user.id,
        originalUrl: url.trim(),
        videoId,
        embedUrl,
        caption: caption.trim() || undefined,
        hashtags: tags,
      })
      close()
      onCreated(postId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('violates foreign key') || msg.toLowerCase().includes('profiles')) {
        // The user is signed in but hasn't created a profile row.
        close()
        onNeedProfile()
        return
      }
      setErr(msg)
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="New post" widthClassName="max-w-xl">
      <div className="space-y-4">
        <InputField
          label="YouTube link"
          hint="Shorts links only (we store the link, not the video)."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/shorts/VIDEOID"
          error={err}
          aria-label="YouTube URL"
        />

        <TextareaField
          label="Caption"
          hint="Optional. Hashtags like #minecraft are extracted automatically."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption…"
          rows={4}
          aria-label="Caption"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stroke/20 bg-panel2/30 px-4 py-3">
          <div className="text-sm text-muted">
            {vid ? (
              <span>
                Video ID: <span className="text-fg">{vid}</span>
              </span>
            ) : (
              <span>Paste a link and we’ll detect the video.</span>
            )}
          </div>
          {tags.length ? <div className="text-xs text-muted">{tags.map((t) => `#${t}`).join(' ')}</div> : null}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button onClick={close} aria-label="Cancel">
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={onSubmit}
            disabled={busy}
            aria-label="Publish"
          >
            {busy ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

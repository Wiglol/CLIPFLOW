const ID_RE = /^[a-zA-Z0-9_-]{6,32}$/

export function parseYouTubeVideoId(input: string): string | null {
  const raw = (input || '').trim()
  if (!raw) return null

  // If user pasted the ID directly
  if (ID_RE.test(raw) && !raw.includes('/')) return raw

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    // Try adding protocol
    try {
      url = new URL('https://' + raw)
    } catch {
      return null
    }
  }

  const host = url.hostname.replace(/^www\./, '')

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    if (id && ID_RE.test(id)) return id
  }

  // youtube.com/shorts/<id>
  if (host.endsWith('youtube.com')) {
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] === 'shorts' && parts[1] && ID_RE.test(parts[1])) return parts[1]

    // watch?v=<id>
    if (parts[0] === 'watch') {
      const v = url.searchParams.get('v')
      if (v && ID_RE.test(v)) return v
    }

    // /embed/<id>
    if (parts[0] === 'embed' && parts[1] && ID_RE.test(parts[1])) return parts[1]
  }

  return null
}

export function buildStoredEmbedUrl(videoId: string) {
  // Stored in DB (no origin/autoplay). The UI appends runtime params.
  return `https://www.youtube.com/embed/${videoId}?playsinline=1&controls=0&modestbranding=1&rel=0&enablejsapi=1`
}

export function buildPlayerUrl(storedEmbedUrl: string, opts: { autoplay?: boolean; muted?: boolean } = {}) {
  const { autoplay = false, muted = false } = opts
  const url = new URL(storedEmbedUrl)
  if (autoplay) url.searchParams.set('autoplay', '1')
  if (muted) url.searchParams.set('mute', '1')
  url.searchParams.set('origin', window.location.origin)
  return url.toString()
}

export function extractHashtags(caption: string): string[] {
  const tags = new Set<string>()
  const re = /#([\p{L}\p{N}_]{1,64})/gu
  for (const match of caption.matchAll(re)) {
    const t = match[1].toLowerCase()
    if (t) tags.add(t)
  }
  return [...tags]
}

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

function extractVideoId(url: string) {
  const s = String(url || '')
  const m =
    s.match(/\/embed\/([a-zA-Z0-9_-]{11})/) ||
    s.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    s.match(/\/shorts\/([a-zA-Z0-9_-]{11})/) ||
    s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  return m?.[1] || null
}

export function buildPlayerUrl(
  storedEmbedUrl: string,
  opts: { autoplay?: boolean; muted?: boolean } = {}
) {
  const autoplay = opts.autoplay ? '1' : '0'
  const mute = opts.muted ? '1' : '0'

  // Make sure we have an embed base
  const videoId = extractVideoId(storedEmbedUrl)
  const base = videoId ? `https://www.youtube.com/embed/${videoId}` : storedEmbedUrl

  const u = new URL(base)

  // Clean player UI as much as YouTube allows
  u.searchParams.set('autoplay', autoplay)
  u.searchParams.set('mute', mute)
  u.searchParams.set('playsinline', '1')
  u.searchParams.set('controls', '0')
  u.searchParams.set('modestbranding', '1')
  u.searchParams.set('rel', '0')
  u.searchParams.set('iv_load_policy', '3')
  u.searchParams.set('fs', '0')
  u.searchParams.set('disablekb', '1')

  // Loop forever (YouTube requires playlist=<videoId> for loop to work)
  if (videoId) {
    u.searchParams.set('loop', '1')
    u.searchParams.set('playlist', videoId)
  }

  // Enable JS API (you already use postMessage commands)
  u.searchParams.set('enablejsapi', '1')

  return u.toString()
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

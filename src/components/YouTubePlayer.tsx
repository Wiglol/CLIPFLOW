import { useEffect, useMemo, useRef, useState } from 'react'
import { buildPlayerUrl } from '../lib/youtube'

function post(iframe: HTMLIFrameElement, func: string, args: any[] = []) {
  try {
    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
  } catch {
    // ignore
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
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

function thumbUrlFromAnyUrl(url: string) {
  const id = extractVideoId(url)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}



function applyAudio(iframe: HTMLIFrameElement, muted: boolean, volume: number) {
  if (muted || volume <= 0) {
    post(iframe, 'mute')
  } else {
    post(iframe, 'unMute')
    post(iframe, 'setVolume', [clamp(volume, 0, 100)])
  }
}

export default function YouTubePlayer({
  storedEmbedUrl,
  title,
  active,
  muted,
  shouldLoad,
  volume = 100,
  aspectHint = 'shorts',
}: {
  storedEmbedUrl: string
  title: string
  active: boolean
  muted: boolean
  shouldLoad: boolean
  volume?: number // 0-100
  aspectHint?: 'shorts' | 'video'
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  const src = useMemo(() => {
    if (!shouldLoad) return 'about:blank'
    return buildPlayerUrl(storedEmbedUrl, { autoplay: active, muted })
  }, [storedEmbedUrl, shouldLoad, active, muted])

  // measure container
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (!r) return
      setBox({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Compute iframe size to "contain" inside container using aspect hint
  // shorts = 9/16, video = 16/9
  // This avoids cropping the top/bottom of vertical videos on some viewports.
  const targetAspect = aspectHint === 'video' ? 16 / 9 : 9 / 16
  const containerAspect = box.h > 0 ? box.w / box.h : 1
  const fitByWidth = containerAspect < targetAspect

  const iframeW = fitByWidth ? box.w : box.h * targetAspect
  const iframeH = fitByWidth ? box.w / targetAspect : box.h



  // Commands after load
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    if (!shouldLoad) return

    const timers: number[] = []
const run = () => {
  const f = iframeRef.current
  if (!f) return
  if (active) {
    if (muted || volume <= 0) {
      post(f, 'mute')
    } else {
      post(f, 'unMute')
      post(f, 'setVolume', [clamp(volume, 0, 100)])
    }
    post(f, 'playVideo')
  } else {
    post(f, 'pauseVideo')
  }
}

timers.push(window.setTimeout(run, 180))
timers.push(window.setTimeout(run, 600))
timers.push(window.setTimeout(run, 1200))

return () => timers.forEach((id) => window.clearTimeout(id))
  }, [active, muted, shouldLoad, volume])

  // Live update mute/volume while active
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    if (!shouldLoad) return
    if (!active) return

    if (muted || volume <= 0) {
      post(iframe, 'mute')
    } else {
      post(iframe, 'unMute')
      post(iframe, 'setVolume', [clamp(volume, 0, 100)])
    }
  }, [muted, volume, active, shouldLoad])

  const bgThumb = useMemo(() => thumbUrlFromAnyUrl(storedEmbedUrl), [storedEmbedUrl])

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-black">
      {bgThumb ? (
        <img
          src={bgThumb}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl opacity-40"
          loading="lazy"
          aria-hidden="true"
        />
      ) : null}

      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="absolute left-1/2 top-1/2"
        style={{
          width: iframeW ? `${iframeW}px` : '100%',
          height: iframeH ? `${iframeH}px` : '100%',
          transform: 'translate(-50%, -50%)',
        }}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        loading={shouldLoad ? 'eager' : 'lazy'}
        onLoad={() => {
          const run = () => {
            const f = iframeRef.current
            if (!f) return
            applyAudio(f, muted, volume)
            if (active) post(f, 'playVideo')
          }
          window.setTimeout(run, 200)
          window.setTimeout(run, 500)
          window.setTimeout(run, 1000)
        }}
      />
    </div>
  )
}

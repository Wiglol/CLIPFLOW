import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  throw new Error(
    'Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).',
  )
}

const DEFAULT_TIMEOUT_MS = 15_000

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Respect any existing signal, but also enforce a default timeout.
  const outerSignal = init?.signal
  const controller = new AbortController()

  const onOuterAbort = () => controller.abort()
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort()
    else outerSignal.addEventListener('abort', onOuterAbort, { once: true })
  }

  const timer = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  return globalThis
    .fetch(input, { ...init, signal: controller.signal })
    .finally(() => {
      window.clearTimeout(timer)
      if (outerSignal) outerSignal.removeEventListener('abort', onOuterAbort)
    })
}

export const supabase = createClient(url, anon, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: true,
  },
})

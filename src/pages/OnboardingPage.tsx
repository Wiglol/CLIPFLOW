import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import { InputField } from '../components/Field'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../state/auth'

const RESERVED = new Set(['auth', 'onboarding', 'settings', 'search', 'tag', 'p', 'u', '404'])

function validUsername(u: string) {
  const x = u.trim().toLowerCase()
  if (x.length < 3) return 'Use at least 3 characters.'
  if (x.length > 24) return 'Use 24 characters or less.'
  if (RESERVED.has(x)) return 'That name is reserved.'
  if (!/^[a-z0-9_]+$/.test(x)) return 'Only lowercase letters, numbers, and underscores.'
  return null
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => window.setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ])
}

function getProjectRefFromUrl(supabaseUrl: string): string | null {
  try {
    const host = new URL(supabaseUrl).host
    return host.split('.')[0] || null
  } catch {
    return null
  }
}

function getAccessTokenFromLocalStorage(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url) return null
  const ref = getProjectRefFromUrl(url)
  if (!ref) return null

  const key = `sb-${ref}-auth-token`
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.access_token ?? null
  } catch {
    return null
  }
}

async function upsertProfile(args: {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}) {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  const token = getAccessTokenFromLocalStorage()
  if (!token) throw new Error('No access token found. Sign in again.')

  const r = await withTimeout(
    fetch(`${url}/rest/v1/profiles?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(args),
    }),
    12_000,
    'Create profile',
  )

  const text = await r.text().catch(() => '')
  if (!r.ok) throw new Error(`Create profile failed: ${r.status} ${text}`)

  const data = JSON.parse(text || '[]')
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.id) throw new Error('Create profile succeeded but returned no row.')
  return row
}

export default function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const next = useMemo(() => {
    const raw = searchParams.get('next')
    if (!raw) return '/'
    if (!raw.startsWith('/')) return '/'
    return raw
  }, [searchParams])

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent('/onboarding')}`, { replace: true })
      return
    }
    if (profile) navigate(next, { replace: true })
  }, [loading, user, profile, next, navigate])

  const onCreate = async () => {
    setErr(null)
    if (!user) return

    const base = username.trim().toLowerCase()
    const v = validUsername(base)
    if (v) {
      setErr(v)
      return
    }

    setBusy(true)
    try {
      console.log('[Onboarding] create start')

      // If DB still has UNIQUE(username), this will auto-suffix and retry.
      let finalUsername = base
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await upsertProfile({
            id: user.id,
            username: finalUsername,
            display_name: (displayName.trim() || finalUsername).slice(0, 60),
            avatar_url: avatarUrl.trim() || null,
          })
          break
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          if (msg.includes('23505') || msg.toLowerCase().includes('duplicate')) {
            finalUsername = `${base}_${Math.random().toString(36).slice(2, 6)}`
            continue
          }
          throw e
        }
      }

      console.log('[Onboarding] profile created/upserted')

      try {
        await withTimeout(refreshProfile(), 6000, 'Profile refresh')
      } catch {
        // ignore
      }

      navigate(next, { replace: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErr(msg)
      console.error('[Onboarding] create profile failed:', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[820px] px-4 pb-20 pt-20 sm:pt-24">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Create your profile</h1>
        <p className="mt-1 text-sm text-muted">You only do this once.</p>
      </div>

      <div className="mt-6 space-y-4">
        {err ? <EmptyState title="Couldn’t create profile" hint={err} /> : null}

        <div className="rounded-3xl border border-stroke/20 bg-panel px-4 py-4">
          <div className="space-y-4">
            <InputField
              label="Username"
              hint="Public. Used in profile links."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="wiglol"
              autoComplete="username"
              right=""
              error={null}
              aria-label="Username"
            />

            <InputField
              label="Display name"
              hint="Optional. Friendly name on your profile."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Wiggo"
              autoComplete="name"
              error={null}
              aria-label="Display name"
            />

            <InputField
              label="Avatar URL"
              hint="Optional. Paste an image URL (https)."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              inputMode="url"
              error={null}
              aria-label="Avatar URL"
            />

            <div className="flex items-center justify-end gap-2">
              <Button variant="solid" onClick={onCreate} disabled={busy} aria-label="Create profile">
                {busy ? 'Creating…' : 'Create profile'}
              </Button>
            </div>

            <div className="text-xs text-muted">Your email stays private. Username and display name are public.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

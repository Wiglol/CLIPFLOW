import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { humanError } from '../lib/errors'

type AuthState = {
  loading: boolean
  user: User | null
  session: Session | null
  profile: Profile | null
  needsProfile: boolean
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

function buildAuthRedirectUrl() {
  const base = import.meta.env.BASE_URL || '/'
  const origin = window.location.origin
  const path = base.endsWith('/') ? base : base + '/'
  return origin + path + 'auth'
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => window.setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ])
}

function getProjectRefFromUrl(supabaseUrl: string): string | null {
  try {
    const host = new URL(supabaseUrl).host // sbxxxx.supabase.co
    return host.split('.')[0] || null
  } catch {
    return null
  }
}

function readStoredSession(): { session: Session | null; user: User | null; accessToken: string | null } {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url) return { session: null, user: null, accessToken: null }

  const ref = getProjectRefFromUrl(url)
  if (!ref) return { session: null, user: null, accessToken: null }

  const key = `sb-${ref}-auth-token`
  const raw = localStorage.getItem(key)
  if (!raw) return { session: null, user: null, accessToken: null }

  try {
    const parsed = JSON.parse(raw)

    // Supabase v2 stores the session-like object directly
    const s = parsed as Session
    const u = (parsed?.user ?? null) as User | null
    const token = (parsed?.access_token ?? null) as string | null

    return { session: (s?.access_token ? s : null) as Session | null, user: u, accessToken: token }
  } catch {
    return { session: null, user: null, accessToken: null }
  }
}

async function loadProfile(uid: string, accessToken: string | null): Promise<Profile | null> {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  const headers: Record<string, string> = {
    apikey: anon,
    Accept: 'application/json',
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const r = await withTimeout(
    fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=*&limit=1`, { headers }),
    10_000,
    'Load profile',
  )

  const text = await r.text().catch(() => '')
  if (!r.ok) throw new Error(`Load profile failed: ${r.status} ${text}`)

  const data = JSON.parse(text || '[]')
  return Array.isArray(data) && data.length ? (data[0] as Profile) : null
}

function clearStoredAuth() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url) return
  const ref = getProjectRefFromUrl(url)
  if (!ref) return

  const prefix = `sb-${ref}-`
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) toRemove.push(k)
  }
  for (const k of toRemove) localStorage.removeItem(k)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const refreshProfile = async () => {
    const { user: u, accessToken } = readStoredSession()
    const uid = u?.id ?? null

    if (!uid) {
      setProfile(null)
      return
    }

    const p = await loadProfile(uid, accessToken)
    setProfile(p)
  }

  useEffect(() => {
    let alive = true

    const init = async () => {
      setLoading(true)

      // ✅ DO NOT call supabase.auth.getSession() (it hangs for you)
      const stored = readStoredSession()
      if (!alive) return

      setSession(stored.session)
      setUser(stored.user)

      if (stored.user?.id) {
        try {
          const p = await loadProfile(stored.user.id, stored.accessToken)
          if (!alive) return
          setProfile(p)
        } catch (e) {
          console.error('[Auth] loadProfile failed:', e)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    }

    init()

    // Still listen to auth changes so magic-link callback updates the UI
    const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user?.id) {
        try {
          const p = await loadProfile(newSession.user.id, newSession.access_token ?? null)
          setProfile(p)
        } catch (e) {
          console.error('[Auth] loadProfile failed:', e)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
    })

    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  const sendMagicLink = async (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) throw new Error('Enter an email address.')

    const redirectTo = buildAuthRedirectUrl()
    const res = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    })

    if (res.error) throw new Error(humanError(res.error))
  }

  const signOut = async () => {
    // Always clear local state + storage even if network signOut fails/hangs
    setSession(null)
    setUser(null)
    setProfile(null)
    clearStoredAuth()

    try {
      await withTimeout(supabase.auth.signOut(), 8000, 'Sign out')
    } catch {
      // ignore
    }
  }

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      session,
      profile,
      needsProfile: !!user && !profile,
      sendMagicLink,
      signOut,
      refreshProfile,
    }),
    [loading, user, session, profile],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

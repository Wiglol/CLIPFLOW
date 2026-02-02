import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import { InputField } from '../components/Field'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../state/auth'

function safeNext(path: string | null) {
  if (!path) return null
  if (!path.startsWith('/')) return null
  if (path.startsWith('/auth')) return '/'
  return path
}

export default function AuthPage() {
  const { user, profile, needsProfile, loading, sendMagicLink, signOut } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const next = useMemo(() => safeNext(searchParams.get('next')), [searchParams])

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (needsProfile) {
      navigate('/onboarding', { replace: true })
      return
    }
    if (profile) {
      navigate(next || '/', { replace: true })
    }
  }, [loading, user, needsProfile, profile, next, navigate])

  const onSend = async () => {
    setErr(null)
    setBusy(true)
    try {
      await sendMagicLink(email)
      setSent(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onSignOut = async () => {
    setErr(null)
    setBusy(true)
    try {
      await signOut()
      setSent(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[820px] px-4 pb-20 pt-20 sm:pt-24">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Magic link to your email. No password.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {err ? <EmptyState title="Couldn’t sign in" hint={err} /> : null}

        {user ? (
          <div className="rounded-3xl border border-stroke/20 bg-panel px-4 py-4">
            <div className="text-sm font-semibold">You’re signed in</div>
            <div className="mt-1 text-sm text-muted">{user.email ?? user.id}</div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="solid" onClick={() => navigate('/')} aria-label="Go to feed">
                Go to feed
              </Button>
              <Button onClick={onSignOut} disabled={busy} aria-label="Sign out">
                Sign out
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-stroke/20 bg-panel px-4 py-4">
            <div className="space-y-4">
              <InputField
                label="Email"
                hint="We’ll send a one-time sign-in link."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                error={null}
                aria-label="Email"
              />

              {sent ? (
                <div className="rounded-2xl bg-panel2/40 px-3 py-3 text-sm text-fg">
                  Link sent. Open the email on this device and tap the sign-in link.
                  <div className="mt-1 text-xs text-muted">
                    If you land on a blank page, copy the full URL into this tab.
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button variant="solid" onClick={onSend} disabled={busy} aria-label="Send magic link">
                  {busy ? 'Sending…' : 'Send link'}
                </Button>
              </div>

              <div className="text-xs text-muted">
                By signing in you agree not to post illegal content. Reports are stored.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

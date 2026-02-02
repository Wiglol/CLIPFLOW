import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import Icon from './icons'

const CHROME_KEY = 'clipflow:chromeHidden'

function readChromeHidden(): boolean {
  try {
    return localStorage.getItem(CHROME_KEY) === '1'
  } catch {
    return false
  }
}

function writeChromeHidden(v: boolean) {
  try {
    localStorage.setItem(CHROME_KEY, v ? '1' : '0')
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('clipflow:chrome'))
}


function TopNavItem({ to, label, icon }: { to: string; label: string; icon?: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-muted hover:bg-panel2/60 hover:text-fg focus-visible:safe-focus',
          isActive ? 'bg-panel2/80 text-fg' : '',
        ].join(' ')
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  )
}

export default function TopBar() {
  const { profile, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [chromeHidden, setChromeHidden] = useState(readChromeHidden())

  useEffect(() => {
    const on = () => setChromeHidden(readChromeHidden())
    window.addEventListener('clipflow:chrome', on as any)
    return () => window.removeEventListener('clipflow:chrome', on as any)
  }, [])

  const onNewPost = () => {
    // Keep it simple: open composer from the feed using a query param.
    if (location.pathname !== '/') navigate('/')
    const url = new URL(window.location.href)
    url.searchParams.set('new', '1')
    history.replaceState(null, '', url.pathname + url.search)
    window.dispatchEvent(new Event('clipflow:newpost'))
  }

  return (
    <>
<button
  type="button"
  onClick={() => {
    const next = !chromeHidden
    setChromeHidden(next)
    writeChromeHidden(next)
  }}
  className="fixed left-3 top-3 z-[60] inline-flex items-center justify-center rounded-xl border border-stroke/20 bg-bg/60 p-2 text-fg/90 backdrop-blur hover:bg-bg/70 focus-visible:safe-focus"
  aria-label={chromeHidden ? "Show header" : "Hide header"}
  title={chromeHidden ? "Show header" : "Hide header"}
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-90">
    <path
      d={chromeHidden ? "M6 9l6 6 6-6" : "M6 15l6-6 6 6"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</button>

    <header className="fixed left-0 right-0 top-0 z-50 border-b border-stroke/30 bg-bg/70 backdrop-blur supports-[backdrop-filter]:bg-bg/60" style={{ transform: chromeHidden ? "translateY(-100%)" : "translateY(0)", transition: "transform 220ms ease" }}>
      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="group inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-left focus-visible:safe-focus"
            aria-label="Go to feed"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-panel2/60">
              <Icon.Mark className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">CLIPFLOW</div>
             
            </div>
          </button>

          <nav className="hidden items-center gap-1 sm:flex">
            <TopNavItem to="/" label="Feed" icon={<Icon.Home className="h-4 w-4" />} />
            <TopNavItem to="/search" label="Search" icon={<Icon.Search className="h-4 w-4" />} />
            <TopNavItem to="/settings" label="Settings" icon={<Icon.Settings className="h-4 w-4" />} />
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewPost}
            className="inline-flex items-center gap-2 rounded-2xl bg-panel2/70 px-3 py-2 text-sm font-medium text-fg hover:bg-panel2 focus-visible:safe-focus"
            aria-label="New post"
          >
            <Icon.Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </button>

          {user ? (
            <button
              onClick={() => navigate(profile ? `/u/${profile.username}` : '/onboarding')}
              className="inline-flex items-center gap-2 rounded-2xl px-2 py-1.5 text-sm text-muted hover:bg-panel2/60 hover:text-fg focus-visible:safe-focus"
              aria-label="Open your profile"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-2xl bg-panel2/60 text-xs font-semibold text-fg">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (profile?.display_name || profile?.username || user.email || 'U').slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="hidden sm:inline">{profile?.username ?? 'Account'}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted hover:bg-panel2/60 hover:text-fg focus-visible:safe-focus"
              aria-label="Sign in"
            >
              <Icon.LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
    </>
  )
}

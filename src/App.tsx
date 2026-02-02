import type { ReactNode } from "react"
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import TopBar from './components/TopBar'
import FeedPage from './pages/FeedPage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import ProfilePage from './pages/ProfilePage'
import PostPage from './pages/PostPage'
import SearchPage from './pages/SearchPage'
import HashtagPage from './pages/HashtagPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const isFeed = location.pathname === '/' || location.pathname.startsWith('/p/')

  return (
    <div className="min-h-[100dvh] bg-bg text-fg">
      <TopBar />
      <main className={isFeed ? '' : 'pt-16 pb-16'}>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/p/:id" element={<PostPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/tag/:tag" element={<HashtagPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Layout>
  )
}

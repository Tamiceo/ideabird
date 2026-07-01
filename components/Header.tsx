'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { SettingsModal } from './SettingsModal'

export default function Header() {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  if (pathname === '/login') return null
  // 에디터는 자체 GlobalActionBar를 쓰므로 전역 Header 숨김
  if (pathname && /^\/linkedin\/[^/]+$/.test(pathname)) return null

  const handleLogout = async () => {
    setSettingsOpen(false)
    await fetch('/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <>
      <header className="app-header">
        <Link href="/" className="logo">
          <img
            src="/ideabird-symbol.png"
            alt=""
            width={66}
            height={66}
            className="logo-mark"
          />
          <span className="logo-text">IdeaBird</span>
        </Link>
        <div className="spacer" />
        <div className="app-header-actions">
          {email && <span className="app-header-email">{email}</span>}
          <button
            className={`icon-btn${settingsOpen ? ' active' : ''}`}
            onClick={() => setSettingsOpen(true)}
          >
            ⚙ 설정
          </button>
          <span className="app-header-divider" aria-hidden="true" />
          <button className="icon-btn" onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        email={email}
        onLogout={handleLogout}
      />
    </>
  )
}

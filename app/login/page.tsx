'use client'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleLogin = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <section className="login-visual" aria-hidden="true">
          <div className="bird-mark">
            <img src="/ideabird-symbol.png" alt="" />
          </div>
        </section>

        <section className="login-form">
          <h1 className="welcome">아이디어버드에 오신 것을 환영합니다</h1>

          {error === 'unauthorized' && (
            <p className="login-error">접근 권한이 없는 계정입니다</p>
          )}

          <button className="btn-google" onClick={handleLogin} type="button">
            <span className="g-icon">G</span>
            <span>Google 계정으로 시작하기</span>
          </button>

          <div className="login-footer">🔒 승인된 도메인 계정만 접속 가능</div>
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

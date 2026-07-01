import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? '@example.com'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user?.email?.endsWith(ALLOWED_DOMAIN)) {
      const next = searchParams.get('next') || '/'
      return NextResponse.redirect(new URL(next, origin))
    }

    // 허용되지 않은 이메일이면 세션 삭제 후 에러 메시지와 함께 로그인 페이지로
    await supabase.auth.signOut()

    const reason = error ? `exchange_error: ${error.message}` : `wrong_email: ${data.user?.email}`
    return NextResponse.redirect(new URL(`/login?error=unauthorized&reason=${encodeURIComponent(reason)}`, origin))
  }

  return NextResponse.redirect(new URL('/login?error=unauthorized&reason=no_code', origin))
}

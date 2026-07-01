import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? '@example.com'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 로그인 및 OAuth 콜백 경로는 인증 체크 제외
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // 정적 에셋(이미지·폰트·CSS·JS 등)은 인증 체크 제외 — public/ 자원이 로그인 페이지에서도 필요
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|mjs|map|woff2?|ttf|otf|eot|txt|xml)$/i.test(pathname)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser()는 서버에서 검증된 사용자 정보를 반환 (getSession보다 안전)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 미로그인 또는 허용되지 않은 이메일이면 로그인 페이지로
  if (!user || !user.email?.endsWith(ALLOWED_DOMAIN)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

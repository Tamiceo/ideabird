import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { listPosts } from '@/lib/posts'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { HomePageClient, type InstagramRow } from '@/components/HomePageClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          // Server Component에서 쓰기 금지 — noop. proxy.ts가 갱신 처리.
        },
      },
    },
  )

  // 로그인 사용자 정보는 세션(쿠키)으로, 데이터는 service_role 로 조회.
  const { data: userData } = await supabase.auth.getUser()
  const posts = await listPosts(supabaseAdmin)

  const { data: instagramData } = await supabaseAdmin
    .from('instagram_cardnews')
    .select('id, source_text, topic, stage, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10)

  const userName = userData.user?.email?.split('@')[0] ?? '사용자'
  const instagramRows = (instagramData ?? []) as InstagramRow[]

  return <HomePageClient posts={posts} instagramRows={instagramRows} userName={userName} />
}

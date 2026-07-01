import Stage1Source, { type RecentRow } from '@/components/cardnews/Stage1Source'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export default async function Stage1Page() {
  // 인증 게이팅은 proxy.ts(미들웨어)가 처리. 데이터는 service_role 로 조회.
  const { data } = await supabaseAdmin
    .from('instagram_cardnews')
    .select('id, source_text, topic, stage, updated_at')
    .order('updated_at', { ascending: false })
    .limit(3)

  const initialRecent: RecentRow[] = (data ?? []) as RecentRow[]

  return <Stage1Source initialRecent={initialRecent} />
}

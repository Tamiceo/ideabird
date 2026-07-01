import { notFound } from 'next/navigation'
import { getPost } from '@/lib/posts'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { LinkedInEditor } from '@/components/editor/LinkedInEditor'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function LinkedInEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  // 인증 게이팅은 proxy.ts(미들웨어)가 처리. 데이터는 service_role 로 조회.
  const post = await getPost(supabaseAdmin, id)
  if (!post) notFound()

  return <LinkedInEditor initialPost={post} />
}

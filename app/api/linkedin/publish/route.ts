import { NextRequest, NextResponse } from 'next/server'
import { getLinkedInToken, publishPost } from '@/lib/linkedin'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

// Source of Truth = DB. 클라이언트가 보내는 text/image_urn은 무시.
// post_id만 받아 DB에서 final_text·image_urn을 직접 조회 후 발행.
export async function POST(req: NextRequest) {
  let post_id: string
  try {
    const body = await req.json()
    post_id = body.post_id
    if (!post_id || typeof post_id !== 'string') {
      return NextResponse.json({ error: 'post_id가 필요합니다' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  const { data: post, error: fetchError } = await supabase
    .from('linkedin_posts')
    .select('final_text, image_urn')
    .eq('id', post_id)
    .single()

  if (fetchError || !post) {
    return NextResponse.json({ error: '포스트를 찾을 수 없습니다' }, { status: 404 })
  }

  if (!post.final_text?.trim()) {
    return NextResponse.json({ error: '발행할 텍스트가 없습니다. 먼저 저장해주세요' }, { status: 400 })
  }

  const token = await getLinkedInToken()
  if (!token) {
    return NextResponse.json({ error: 'LinkedIn 연결이 필요합니다', code: 'NOT_CONNECTED' }, { status: 401 })
  }

  try {
    const linkedInPostId = await publishPost(
      post.final_text,
      token.access_token,
      token.person_urn,
      post.image_urn ?? undefined
    )

    await supabase
      .from('linkedin_posts')
      .update({
        status: 'published',
        linkedin_post_id: linkedInPostId,
        published_at: new Date().toISOString(),
      })
      .eq('id', post_id)

    return NextResponse.json({ success: true, linkedin_post_id: linkedInPostId })
  } catch (err) {
    console.error('LinkedIn publish error:', err)
    return NextResponse.json({ error: '발행 중 오류가 발생했습니다' }, { status: 500 })
  }
}

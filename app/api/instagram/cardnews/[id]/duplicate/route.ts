import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

const TABLE = 'instagram_cardnews'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/instagram/cardnews/[id]/duplicate  —  Stage 4 duplicateCardnews
// published 된 카드뉴스를 복제해 새 draft(stage='rendered')로 생성.
// 발행 메타(instagram_media_id, permalink, published_at)는 초기화.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params

  const { data: src, error: fetchError } = await supabase
    .from(TABLE)
    .select('source_text, topic, cards, suggested_layout, layout_key, palette_key, card_count')
    .eq('id', id)
    .single()

  if (fetchError || !src) {
    return NextResponse.json(
      { error: '원본을 찾을 수 없어요', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  const { data: created, error: insertError } = await supabase
    .from(TABLE)
    .insert({
      source_text: src.source_text,
      topic: src.topic,
      cards: src.cards,
      suggested_layout: src.suggested_layout,
      layout_key: src.layout_key,
      palette_key: src.palette_key,
      card_count: src.card_count,
      stage: src.cards ? 'rendered' : 'planning',
      status: 'draft',
    })
    .select('id, stage, status, created_at')
    .single()

  if (insertError || !created) {
    console.error('cardnews duplicate error:', insertError)
    return NextResponse.json({ error: '복제에 실패했어요' }, { status: 500 })
  }

  return NextResponse.json(created, { status: 201 })
}

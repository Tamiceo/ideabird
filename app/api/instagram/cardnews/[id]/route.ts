import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { validatePatch } from '../route'

const TABLE = 'instagram_cardnews'
const FULL_COLS =
  'id, source_text, topic, cards, suggested_layout, layout_key, palette_key, card_count, stage, status, instagram_media_id, permalink, published_at, created_at, updated_at'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/instagram/cardnews/[id]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const { data, error } = await supabase
    .from(TABLE)
    .select(FULL_COLS)
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: '카드뉴스를 찾을 수 없어요', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }
  return NextResponse.json(data)
}

// PATCH /api/instagram/cardnews/[id]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  const { patch, error, code } = validatePatch(body)
  if (error || !patch) {
    return NextResponse.json({ error, code }, { status: 400 })
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없어요', code: 'EMPTY_PATCH' }, { status: 400 })
  }

  const { data, error: updateError } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select(FULL_COLS)
    .single()

  if (updateError || !data) {
    console.error('cardnews PATCH error:', updateError)
    return NextResponse.json({ error: '저장에 실패했어요' }, { status: 500 })
  }
  return NextResponse.json(data)
}

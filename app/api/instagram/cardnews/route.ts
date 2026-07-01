import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import {
  LAYOUT_KEYS,
  PALETTE_KEYS,
  STAGE_KEYS,
  SOURCE_TEXT_MAX,
} from '@/lib/cardnews/constants'

const TABLE = 'instagram_cardnews'
const LIST_COLS =
  'id, source_text, topic, suggested_layout, layout_key, palette_key, card_count, stage, status, published_at, created_at, updated_at'

// GET /api/instagram/cardnews?limit=3&stage=sourcing,planning
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100)
  const stageParam = url.searchParams.get('stage')

  let query = supabase
    .from(TABLE)
    .select(LIST_COLS)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (stageParam) {
    const stages = stageParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) => (STAGE_KEYS as readonly string[]).includes(s))
    if (stages.length) query = query.in('stage', stages)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: '리스트를 불러올 수 없어요' }, { status: 500 })
  }
  return NextResponse.json({ rows: data ?? [] })
}

// POST /api/instagram/cardnews  —  Stage 1 saveSourceOnly
export async function POST(req: NextRequest) {
  let source_text: string
  try {
    const body = await req.json()
    source_text = body.source_text
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  if (typeof source_text !== 'string' || !source_text.trim()) {
    return NextResponse.json(
      { error: '소재를 입력해주세요', code: 'STAGE1_EMPTY_SOURCE' },
      { status: 400 }
    )
  }
  if (source_text.length > SOURCE_TEXT_MAX) {
    return NextResponse.json(
      { error: `최대 ${SOURCE_TEXT_MAX.toLocaleString()}자까지 가능해요`, code: 'STAGE1_OVER_LIMIT' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ source_text, stage: 'sourcing', status: 'draft' })
    .select('id, stage, status, created_at, updated_at')
    .single()

  if (error || !data) {
    console.error('cardnews POST error:', error)
    return NextResponse.json({ error: '저장에 실패했어요' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

// 공용 PATCH 필드 화이트리스트 (id 라우트에서 재활용)
export const PATCH_WHITELIST = [
  'source_text',
  'topic',
  'cards',
  'suggested_layout',
  'layout_key',
  'palette_key',
  'stage',
] as const
export type PatchField = (typeof PATCH_WHITELIST)[number]

// 공용 validator (id 라우트에서 재활용)
export function validatePatch(body: Record<string, unknown>): {
  patch: Partial<Record<PatchField, unknown>> | null
  error?: string
  code?: string
} {
  const patch: Partial<Record<PatchField, unknown>> = {}

  for (const k of PATCH_WHITELIST) {
    if (!(k in body)) continue
    const v = body[k]

    if (k === 'source_text') {
      if (typeof v !== 'string' || !v.trim())
        return { patch: null, error: '소재가 비어있어요', code: 'EMPTY_SOURCE' }
      if (v.length > SOURCE_TEXT_MAX)
        return { patch: null, error: `최대 ${SOURCE_TEXT_MAX}자`, code: 'OVER_LIMIT' }
    }
    if (k === 'stage' && !(STAGE_KEYS as readonly string[]).includes(v as string)) {
      return { patch: null, error: 'stage 값이 올바르지 않아요', code: 'INVALID_STAGE' }
    }
    if (k === 'layout_key' && v !== null && !(LAYOUT_KEYS as readonly string[]).includes(v as string)) {
      return { patch: null, error: 'layout_key 값이 올바르지 않아요', code: 'INVALID_LAYOUT' }
    }
    if (k === 'palette_key' && v !== null && !(PALETTE_KEYS as readonly string[]).includes(v as string)) {
      return { patch: null, error: 'palette_key 값이 올바르지 않아요', code: 'INVALID_PALETTE' }
    }
    if (k === 'cards' && v !== null && !Array.isArray(v)) {
      return { patch: null, error: 'cards 는 배열이어야 해요', code: 'INVALID_CARDS' }
    }

    patch[k] = v
  }

  // card_count 자동 동기
  if (Array.isArray(patch.cards)) {
    ;(patch as Record<string, unknown>).card_count = (patch.cards as unknown[]).length
  }

  return { patch }
}

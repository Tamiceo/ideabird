import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { RENDER_SYSTEM_PROMPT } from '@/lib/cardnews/render-prompt'
import type { CardnewsCard, CardRendered } from '@/lib/cardnews/constants'

const anthropic = new Anthropic()
export async function POST(req: NextRequest) {
  let id: string
  try {
    const body = await req.json()
    id = body.id
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id 가 필요합니다' }, { status: 400 })
  }

  const { data: row, error: fetchError } = await supabase
    .from('instagram_cardnews')
    .select('topic, cards, layout_key, palette_key')
    .eq('id', id)
    .single()

  if (fetchError || !row) {
    return NextResponse.json({ error: '카드뉴스를 찾을 수 없어요' }, { status: 404 })
  }

  const cards = (row.cards ?? []) as CardnewsCard[]
  if (cards.length === 0) {
    return NextResponse.json({ error: '카드 구성이 비어있어요' }, { status: 400 })
  }
  if (!row.layout_key || !row.palette_key) {
    return NextResponse.json(
      { error: '레이아웃·팔레트를 먼저 선택해주세요' },
      { status: 400 }
    )
  }

  const userPayload = JSON.stringify({
    topic: row.topic,
    layout_key: row.layout_key,
    cards: cards.map((c) => ({ order: c.order, role: c.role, message: c.message })),
  })

  let aiRaw = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: [
        { type: 'text', text: RENDER_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userPayload }],
    })
    aiRaw = message.content[0]?.type === 'text' ? message.content[0].text : ''
  } catch (err) {
    console.error('render AI error:', err)
    return NextResponse.json({ error: 'AI 렌더에 실패했어요' }, { status: 500 })
  }

  const clean = aiRaw.replace(/```(?:json)?/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('render JSON not found:', aiRaw.substring(0, 300))
    return NextResponse.json({ error: 'AI 응답을 이해하지 못했어요' }, { status: 500 })
  }

  let parsed: { cards?: unknown }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI 응답 형식이 잘못됐어요' }, { status: 500 })
  }

  const renderedCards = Array.isArray(parsed.cards) ? parsed.cards : []
  if (renderedCards.length === 0) {
    return NextResponse.json({ error: 'AI 가 카드를 반환하지 않았어요' }, { status: 500 })
  }

  // 입력 cards 에 rendered 병합
  const merged: CardnewsCard[] = cards.map((c) => {
    const found = renderedCards.find(
      (r: unknown) =>
        typeof r === 'object' && r !== null && (r as { order?: unknown }).order === c.order
    ) as { rendered?: CardRendered } | undefined
    return { ...c, rendered: found?.rendered ?? c.rendered ?? {} }
  })

  const { error: updateError } = await supabase
    .from('instagram_cardnews')
    .update({ cards: merged, stage: 'rendered' })
    .eq('id', id)

  if (updateError) {
    console.error('render DB update error:', updateError)
    return NextResponse.json({ error: '렌더 저장에 실패했어요' }, { status: 500 })
  }

  return NextResponse.json({ id, cards: merged })
}

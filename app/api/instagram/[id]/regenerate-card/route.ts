import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { RENDER_SINGLE_SYSTEM_PROMPT } from '@/lib/cardnews/render-prompt'
import type { CardnewsCard, CardRendered } from '@/lib/cardnews/constants'

const anthropic = new Anthropic()
type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  let cardOrder: number
  try {
    const body = await req.json()
    cardOrder = Number(body.cardOrder)
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }
  if (!Number.isFinite(cardOrder)) {
    return NextResponse.json({ error: 'cardOrder 가 필요합니다' }, { status: 400 })
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
  const target = cards.find((c) => c.order === cardOrder)
  if (!target) {
    return NextResponse.json({ error: '해당 카드를 찾을 수 없어요' }, { status: 404 })
  }

  const userPayload = JSON.stringify({
    topic: row.topic,
    layout_key: row.layout_key,
    target_card: { order: target.order, role: target.role, message: target.message },
  })

  let aiRaw = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: [
        { type: 'text', text: RENDER_SINGLE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userPayload }],
    })
    aiRaw = message.content[0]?.type === 'text' ? message.content[0].text : ''
  } catch (err) {
    console.error('regenerate-card AI error:', err)
    return NextResponse.json({ error: 'AI 재생성에 실패했어요' }, { status: 500 })
  }

  const clean = aiRaw.replace(/```(?:json)?/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) {
    return NextResponse.json({ error: 'AI 응답을 이해하지 못했어요' }, { status: 500 })
  }

  let parsed: { card?: { rendered?: CardRendered } }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI 응답 형식이 잘못됐어요' }, { status: 500 })
  }

  const newRendered: CardRendered = parsed.card?.rendered ?? {}

  const updated: CardnewsCard[] = cards.map((c) =>
    c.order === cardOrder ? { ...c, rendered: newRendered } : c
  )

  const { error: updateError } = await supabase
    .from('instagram_cardnews')
    .update({ cards: updated })
    .eq('id', id)

  if (updateError) {
    console.error('regenerate-card DB update error:', updateError)
    return NextResponse.json({ error: '저장에 실패했어요' }, { status: 500 })
  }

  return NextResponse.json({ id, card: { order: cardOrder, rendered: newRendered } })
}

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import {
  CARD_COUNT_MIN,
  CARD_COUNT_MAX,
  type CardnewsCard,
  type LayoutKey,
  type RoleKey,
} from '@/lib/cardnews/constants'
import {
  VISIBLE_LAYOUT_KEYS,
  buildLayoutsPlanningHints,
} from '@/lib/cardnews/layouts/registry'

const anthropic = new Anthropic()
const LAYOUT_ENUM = VISIBLE_LAYOUT_KEYS.map((k) => `"${k}"`).join(' | ')

const SYSTEM_PROMPT = `너는 Instagram 카드뉴스 기획자야. IdeaBird CMS 톤에 맞춰 한국어로 작성해.

입력된 소재를 읽고 반드시 아래 JSON 만 출력해 (설명·마크다운·코드펜스 절대 금지):

{
  "topic": "메인 주제 — 후킹되는 한 문장, 15~25자",
  "suggested_layout": ${LAYOUT_ENUM},
  "suggested_count": ${CARD_COUNT_MIN} 이상 ${CARD_COUNT_MAX} 이하 정수,
  "cards": [
    { "order": 0, "role": "cover", "message": "표지 카드 메시지" },
    { "order": 1, "role": "content", "message": "본문 카드 메시지" },
    ...
    { "order": N-1, "role": "cover", "message": "마지막 표지 — CTA" }
  ]
}

규칙:
- order 는 0부터 시작
- 첫 카드(role=cover)는 후킹 + 기대감 유도
- 마지막 카드(role=cover)는 CTA (다음 콘텐츠 예고, 뉴스레터 등)
- 본문 카드(role=content)는 논리 흐름 · 하나의 핵심 메시지 1~2문장
- cards 배열 총 개수는 suggested_count 와 동일해야 함

레이아웃 추천 기준:
${buildLayoutsPlanningHints()}

톤:
- 경어체 기본 (~해요, ~합니다)
- 진솔하고 구체적. 추상적 조언 금지
- 소재의 수치·사례·고유명사는 유지
- 이모지는 표지에만 선택적으로 1개, 본문 카드 message 에는 절대 금지`

export async function POST(req: NextRequest) {
  let id: string
  let instruction: string | undefined
  try {
    const body = await req.json()
    id = body.id
    instruction = typeof body.instruction === 'string' ? body.instruction.trim() : undefined
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id 가 필요합니다' }, { status: 400 })
  }

  const { data: row, error: fetchError } = await supabase
    .from('instagram_cardnews')
    .select('source_text, topic, cards')
    .eq('id', id)
    .single()

  if (fetchError || !row) {
    return NextResponse.json(
      { error: '카드뉴스를 찾을 수 없어요', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }
  if (!row.source_text?.trim()) {
    return NextResponse.json(
      { error: '소재가 비어있어요', code: 'EMPTY_SOURCE' },
      { status: 400 }
    )
  }

  const userParts: string[] = [`[소재]\n${row.source_text}`]
  if (instruction) {
    userParts.push(`[추가 지시사항]\n${instruction}`)
    if (row.topic || (Array.isArray(row.cards) && row.cards.length > 0)) {
      userParts.push(
        `[이전 버전 — 지시사항에 맞춰 개선하되 좋은 부분은 유지]\n${JSON.stringify(
          { topic: row.topic, cards: row.cards },
          null,
          2
        )}`
      )
    }
  }
  const userContent = userParts.join('\n\n')

  let aiRaw = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userContent }],
    })
    aiRaw = message.content[0]?.type === 'text' ? message.content[0].text : ''
  } catch (err) {
    console.error('plan AI error:', err)
    return NextResponse.json({ error: 'AI 기획 호출에 실패했어요' }, { status: 500 })
  }

  const clean = aiRaw.replace(/```(?:json)?/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('plan JSON not found:', aiRaw.substring(0, 300))
    return NextResponse.json({ error: 'AI 응답을 이해하지 못했어요' }, { status: 500 })
  }

  let parsed: {
    topic?: unknown
    suggested_layout?: unknown
    suggested_count?: unknown
    cards?: unknown
  }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI 응답 형식이 잘못됐어요' }, { status: 500 })
  }

  const topic = typeof parsed.topic === 'string' ? parsed.topic.trim() : ''
  const rawCards = Array.isArray(parsed.cards) ? parsed.cards : []
  if (!topic || rawCards.length === 0) {
    return NextResponse.json({ error: 'AI 응답이 비어있어요' }, { status: 500 })
  }

  const suggested_layout: LayoutKey = (VISIBLE_LAYOUT_KEYS as readonly string[]).includes(
    parsed.suggested_layout as string
  )
    ? (parsed.suggested_layout as LayoutKey)
    : 'bullet-list'

  const cards: CardnewsCard[] = rawCards.map((c: unknown, i: number) => {
    const obj = (c ?? {}) as { role?: unknown; message?: unknown }
    const role: RoleKey = obj.role === 'cover' ? 'cover' : 'content'
    const message = typeof obj.message === 'string' ? obj.message.trim() : ''
    return { order: i, role, message }
  })

  const suggestedCountRaw =
    typeof parsed.suggested_count === 'number' ? parsed.suggested_count : cards.length
  const suggested_count = Math.min(
    Math.max(Math.round(suggestedCountRaw), CARD_COUNT_MIN),
    CARD_COUNT_MAX
  )

  const { error: updateError } = await supabase
    .from('instagram_cardnews')
    .update({
      topic,
      cards,
      suggested_layout,
      card_count: cards.length,
      stage: 'planning',
    })
    .eq('id', id)

  if (updateError) {
    console.error('plan DB update error:', updateError)
    return NextResponse.json({ error: '기획 저장에 실패했어요' }, { status: 500 })
  }

  return NextResponse.json({
    id,
    topic,
    suggested_layout,
    suggested_count,
    cards,
  })
}

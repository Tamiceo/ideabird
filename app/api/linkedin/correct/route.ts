import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  let original_text: string
  let extra_instruction: string | undefined
  let correction_history: string[]
  try {
    const body = await req.json()
    original_text = body.original_text
    extra_instruction = body.extra_instruction
    correction_history = Array.isArray(body.correction_history) ? body.correction_history : []
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  if (!original_text?.trim()) {
    return NextResponse.json({ error: '교정할 글을 입력해주세요' }, { status: 400 })
  }

  const historySection = correction_history.length > 0
    ? `\n이전 교정 내역 (참고 — 이미 반영된 항목은 중복 교정 불필요):\n${correction_history.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
    : ''

  const extraSection = extra_instruction?.trim()
    ? `\n추가 지시: ${extra_instruction.trim()}\n`
    : ''

  const prompt = `당신은 아래 작성자의 LinkedIn 글을 교정하는 어시스턴트입니다.

작성자:
- (본인 프로필을 채우세요 — 직업, 사업, 전문 분야, 관심사 등)

교정 원칙:
- 일상대화·설명독백 느낌으로 서사가 자연스럽게 흐르도록
- 딱딱하게 끊어지는 줄바꿈 패턴 제거 (1~2문장마다 강제 줄바꿈 → AI 작성 티)
- 이모지는 전체 3개 이하로 감정 표현 목적에만. 블릿에 이모지 절대 금지
- 블릿은 숫자(1. 2.) 또는 하이픈(-) 형식으로. 꼭 필요한 경우만 유지하고 나머지는 서사로 풀기
- 기계적 체크리스트/리스트업은 서사로 풀기
- 페르소나 어휘·톤 유지 (~해요, ~합니다, 독백투 믹스, 전문/캐주얼 표현 자연스럽게)
- 시그니처 클로징이 없으면 맥락에 맞는 마무리 문구를 자연스럽게 추가
- 글의 핵심 내용과 작성자의 목소리는 최대한 보존
- 절대 금지: **굵게**, _기울임_ 등 마크다운 서식 — LinkedIn 본문에 쓰면 그대로 노출됨. 강조는 문장 구조로
- 팩트체크: 전문 용어, 수치, 제품명, 기술 개념 등 사실 여부 점검. 불확실하거나 틀린 내용은 글에서 수정하고 changes에 [팩트체크] 접두어로 기록
${historySection}${extraSection}
원문:
${original_text.trim()}

아래 XML 태그 형식으로만 응답하세요. 설명이나 안내 문구 없이. corrected_text 안에는 줄바꿈·따옴표·이모지 모두 자유롭게 그대로 넣으세요. item 태그 안에는 실제 수정한 항목만 2~4개 간략하게. 예: "이모지 3개 제거", "딱딱한 줄바꿈 → 문단으로 통합".

<corrected_text>
교정된 글 전체
</corrected_text>
<changes>
<item>변경 사항 1</item>
<item>변경 사항 2</item>
</changes>`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''

    const correctedMatch = raw.match(/<corrected_text>([\s\S]*?)<\/corrected_text>/)
    const changesBlock = raw.match(/<changes>([\s\S]*?)<\/changes>/)?.[1] ?? ''
    const changes = [...changesBlock.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map(m => m[1].trim())
      .filter(Boolean)

    if (!correctedMatch) {
      console.error('correct: corrected_text tag not found. Raw head:', raw.substring(0, 200))
      return NextResponse.json({ error: '교정 결과를 파싱할 수 없습니다' }, { status: 500 })
    }

    return NextResponse.json({
      corrected_text: correctedMatch[1].trim(),
      changes,
    })
  } catch (err) {
    console.error('LinkedIn correct error:', err)
    return NextResponse.json({ error: '교정 중 오류가 발생했습니다' }, { status: 500 })
  }
}

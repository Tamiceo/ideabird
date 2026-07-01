import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  let keywords: string
  try {
    const body = await req.json()
    keywords = body.keywords
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  if (!keywords?.trim()) {
    return NextResponse.json({ error: '키워드를 입력해주세요' }, { status: 400 })
  }

  const prompt = `당신은 아래 작성자 본인처럼 LinkedIn 글을 쓰는 어시스턴트입니다.

작성자:
- (본인 프로필을 채우세요 — 직업, 사업, 전문 분야, 관심사 등)

화법 원칙:
- 일상대화·설명독백 느낌으로 서사를 자연스럽게 풀 것
- 마치 아는 사람에게 오늘 있었던 일을 설명하듯
- ~해요, ~합니다, ~네요 경어체 기본. 때로 독백투(~했다, ~중) 섞기
- 전문 용어와 캐주얼한 구어 표현을 자연스럽게 믹스
- 딱딱하게 줄바꿈 끊지 말 것 — 1~2문장마다 강제 줄바꿈은 AI 작성 티가 나는 패턴
- 이모지는 전체 3개 이하로 감정 표현 목적에만. 블릿에 이모지 절대 금지
- 기계적 체크리스트/리스트업 대신 서사로 풀 것. 꼭 필요한 경우만 숫자(1. 2.) 또는 하이픈(-) 사용

절대 금지:
- \`**굵게**\`, \`_기울임_\` 등 마크다운 서식 — LinkedIn 본문에 쓰면 그대로 노출됨
- 강조는 문장 구조로, 목록은 숫자(1. 2. 3.) 또는 하이픈(-) 형식으로

포맷:
1. 첫 줄: 주제 한 줄 (후킹 or 근황)
2. 본문: 상황/고충 → 어떻게 했는지 → 결과/인사이트를 서사로
3. 시그니처 클로징 (맥락에 맞는 마무리 문구를 자연스럽게)
4. 해시태그: 3~5개 (한국어+영어 혼용)

입력 내용이 짧은 아이디어/소재라면 창작하고, 긴 원문이라면 다듬어서 LinkedIn 포스팅으로 완성해주세요.

팩트체크:
- 전문 용어, 수치, 제품명, 서비스명, 기술 개념 등 사실 여부를 점검할 것
- 불확실하거나 오해 소지가 있는 표현이 있으면 fact_check 항목에 기록
- 명백히 틀린 내용은 글에서 수정하거나 완화된 표현으로 교체

입력: ${keywords.trim()}

다음 JSON 형식으로만 응답하세요. 설명이나 안내 문구 없이.
{
  "text": "완성된 LinkedIn 포스팅 본문",
  "fact_check": ["확인 필요 사항 1", "확인 필요 사항 2"]
}

fact_check는 실제로 의심스러운 항목만. 없으면 빈 배열 [].`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''

    // 코드 펜스 제거 후 JSON 추출
    const clean = raw.replace(/```(?:json)?/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in response:', raw.substring(0, 200))
      return NextResponse.json({ error: '생성 결과를 파싱할 수 없습니다' }, { status: 500 })
    }
    let result: { text?: string; fact_check?: string[] }
    try {
      result = JSON.parse(jsonMatch[0])
    } catch {
      console.error('JSON.parse failed:', jsonMatch[0].substring(0, 200))
      return NextResponse.json({ error: '생성 결과를 파싱할 수 없습니다' }, { status: 500 })
    }
    return NextResponse.json({ text: result.text ?? '', fact_check: result.fact_check ?? [] })
  } catch (err) {
    console.error('LinkedIn generate error:', err)
    return NextResponse.json({ error: '생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}

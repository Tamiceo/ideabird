import { notFound, redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Stage1Source, { type RecentRow } from '@/components/cardnews/Stage1Source'
import Stage2Planning from '@/components/cardnews/Stage2Planning'
import Stage3StylePicker from '@/components/cardnews/Stage3StylePicker'
import Stage4Editor from '@/components/cardnews/Stage4Editor'
import type {
  CardnewsCard,
  LayoutKey,
  PaletteKey,
  StageKey,
} from '@/lib/cardnews/constants'

export const dynamic = 'force-dynamic'

type SP = { stage?: string }

export default async function InstagramCardnewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SP>
}) {
  const { id } = await params
  const { stage: queryStage } = await searchParams

  // 인증 게이팅은 proxy.ts(미들웨어)가 처리. 데이터는 service_role 로 조회.
  const { data } = await supabaseAdmin
    .from('instagram_cardnews')
    .select(
      'id, source_text, topic, cards, suggested_layout, layout_key, palette_key, stage, status, updated_at'
    )
    .eq('id', id)
    .single()

  if (!data) notFound()

  const dbStage = data.stage as StageKey
  const requested = queryStage ?? defaultStageFor(dbStage)

  // Stage 전이 가드 (Gemini Q9: RSC redirect)
  if (requested === '3' && dbStage === 'sourcing') {
    redirect(`/instagram/${id}?stage=1`)
  }
  if (requested === '3' && dbStage === 'published') {
    redirect(`/instagram/${id}`)
  }
  if (requested === '2' && dbStage === 'sourcing') {
    redirect(`/instagram/${id}?stage=1`)
  }

  if (requested === '1') {
    const { data: recent } = await supabaseAdmin
      .from('instagram_cardnews')
      .select('id, source_text, topic, stage, updated_at')
      .order('updated_at', { ascending: false })
      .limit(3)
    return (
      <Stage1Source
        initialRecent={(recent ?? []) as RecentRow[]}
        initialId={id}
        initialText={data.source_text ?? ''}
        initialTopic={data.topic ?? ''}
      />
    )
  }

  const cards = (data.cards ?? []) as CardnewsCard[]

  if (requested === '2') {
    return (
      <Stage2Planning id={id} initialTopic={data.topic ?? ''} initialCards={cards} />
    )
  }

  if (requested === '3') {
    return (
      <Stage3StylePicker
        id={id}
        topic={data.topic ?? ''}
        cards={cards}
        initialLayout={(data.layout_key ?? null) as LayoutKey | null}
        initialPalette={(data.palette_key ?? null) as PaletteKey | null}
        suggestedLayout={(data.suggested_layout ?? null) as LayoutKey | null}
        currentStage={dbStage}
      />
    )
  }

  // 기본값: Stage 4 (rendered 또는 published)
  if (dbStage === 'planning' || dbStage === 'sourcing') {
    redirect(`/instagram/${id}?stage=${dbStage === 'sourcing' ? '1' : '2'}`)
  }
  if (!data.layout_key || !data.palette_key) {
    redirect(`/instagram/${id}?stage=3`)
  }

  return (
    <Stage4Editor
      id={id}
      topic={data.topic ?? ''}
      initialCards={cards}
      layoutKey={data.layout_key as LayoutKey}
      paletteKey={data.palette_key as PaletteKey}
      stage={dbStage}
    />
  )
}

function defaultStageFor(dbStage: StageKey): string {
  switch (dbStage) {
    case 'sourcing':
      return '1'
    case 'planning':
      return '2'
    case 'rendered':
    case 'published':
      return '4'
  }
}

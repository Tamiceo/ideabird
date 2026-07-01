'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import WizardStepper from './WizardStepper'
import ContextBar from './ContextBar'
import CardLayoutRenderer from './CardLayoutRenderer'
import type { SaveState } from './SaveChip'
import {
  PALETTE_KEYS,
  PALETTE_DISABLED,
  PALETTE_LABEL,
  AI_RENDER_COST,
  AI_RENDER_TIME,
  type CardnewsCard,
  type LayoutKey,
  type PaletteKey,
  type StageKey,
} from '@/lib/cardnews/constants'
import { VISIBLE_LAYOUTS } from '@/lib/cardnews/layouts/registry'

interface Props {
  id: string
  topic: string
  cards: CardnewsCard[]
  initialLayout: LayoutKey | null
  initialPalette: PaletteKey | null
  suggestedLayout: LayoutKey | null
  currentStage: StageKey
}

export default function Stage3StylePicker({
  id,
  topic,
  cards,
  initialLayout,
  initialPalette,
  suggestedLayout,
  currentStage,
}: Props) {
  const router = useRouter()
  const [layoutKey, setLayoutKey] = useState<LayoutKey>(
    initialLayout ?? suggestedLayout ?? 'bullet-list'
  )
  const [paletteKey, setPaletteKey] = useState<PaletteKey>(initialPalette ?? 'dark-neon')
  const [isAiBusy, setIsAiBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const patchSelection = async (body: Partial<{ layout_key: LayoutKey; palette_key: PaletteKey }>) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSaveState('saving')
    try {
      const res = await fetch(`/api/instagram/cardnews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (res.ok) {
        setSaveState('saved')
        setLastSavedAt(Date.now())
      } else if (!controller.signal.aborted) {
        setSaveState('dirty')
        setError('저장 실패')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setSaveState('dirty')
        setError('저장 실패')
      }
    }
  }

  const selectLayout = (key: LayoutKey) => {
    if (isAiBusy) return
    setLayoutKey(key)
    patchSelection({ layout_key: key })
  }

  const selectPalette = (key: PaletteKey) => {
    if (isAiBusy) return
    if (PALETTE_DISABLED.includes(key)) return
    setPaletteKey(key)
    patchSelection({ palette_key: key })
  }

  const generateRender = async () => {
    if (currentStage === 'rendered') {
      const ok = window.confirm(
        `레이아웃/팔레트가 바뀌어 편집한 카드 내용이 모두 다시 렌더됩니다.\n(${AI_RENDER_COST} · ${AI_RENDER_TIME})\n계속할까요?`
      )
      if (!ok) return
    }
    setIsAiBusy(true)
    setError(null)
    try {
      // DB 에 현재 선택 보장 — 기본값만 보고 PATCH 없이 생성 누른 케이스 대비
      await fetch(`/api/instagram/cardnews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout_key: layoutKey, palette_key: paletteKey }),
      })
      const res = await fetch('/api/instagram/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setError(j?.error ?? '렌더 실패')
        return
      }
      router.push(`/instagram/${id}`)
    } finally {
      setIsAiBusy(false)
    }
  }

  const goBack = () => {
    if (isAiBusy) return
    router.push(`/instagram/${id}?stage=2`)
  }
  const exitWizard = () => {
    if (isAiBusy) return
    router.push('/')
  }

  const firstContent = cards.find((c) => c.role === 'content') ?? cards[0]

  const rightSlot = (
    <>
      <button
        type="button"
        onClick={goBack}
        disabled={isAiBusy}
        className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-white text-xs text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] disabled:opacity-40"
      >
        ← AI 기획 수정
      </button>
      <button
        type="button"
        onClick={generateRender}
        disabled={isAiBusy}
        className="px-4 py-1.5 rounded-full bg-[var(--fg)] text-white text-xs font-semibold hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isAiBusy ? '🎨 카드를 그리는 중...' : '카드뉴스 생성 →'}
      </button>
    </>
  )

  return (
    <div className="flex flex-col h-screen">
      <ContextBar
        title={topic || '카드뉴스'}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        onBack={exitWizard}
        rightSlot={rightSlot}
      />
      <WizardStepper active={3} />

      <main className="flex-1 min-h-0 max-w-[1300px] w-full mx-auto px-6 py-5 grid grid-cols-[1fr_440px] gap-8 overflow-auto">
        <section className="flex flex-col gap-5 min-h-0">
          <div>
            <h1 className="text-xl font-bold">카드뉴스 스타일을 정합니다</h1>
            <p className="text-[var(--muted)] text-xs mt-0.5">
              내용에 맞는 <b>레이아웃</b>과 <b>팔레트</b>를 선택하세요.
            </p>
          </div>

          {currentStage === 'rendered' && (
            <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-900">
              ⚠️ 레이아웃·팔레트를 바꾸면 편집본이 재렌더됩니다.
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                레이아웃 · 본문 카드
              </h2>
              <span className="text-[11px] text-[var(--subtle)]">Cover 자동</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {VISIBLE_LAYOUTS.map((meta) => {
                const isActive = meta.key === layoutKey
                const isRec = meta.key === suggestedLayout
                return (
                  <button
                    key={meta.key}
                    type="button"
                    onClick={() => selectLayout(meta.key)}
                    disabled={isAiBusy}
                    className={`relative text-left p-3 border rounded-xl bg-white hover:border-[var(--muted)] ${
                      isActive ? 'border-[var(--fg)] border-2' : 'border-[var(--border)]'
                    } disabled:opacity-50`}
                  >
                    {isRec && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--fg)] text-[#B9FF66]">
                        ✨ AI 추천
                      </span>
                    )}
                    <div className="text-sm font-semibold mb-1">{meta.label}</div>
                    <div className="text-[11px] text-[var(--subtle)] leading-relaxed">
                      {meta.shortDescription}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                팔레트
              </h2>
              <span className="text-[11px] text-[var(--subtle)]">전체 통일</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {PALETTE_KEYS.map((key) => {
                const isActive = key === paletteKey
                const disabled = PALETTE_DISABLED.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectPalette(key)}
                    disabled={isAiBusy || disabled}
                    className={`text-left p-3 border rounded-xl bg-white ${
                      isActive ? 'border-[var(--fg)] border-2' : 'border-[var(--border)]'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--muted)]'}`}
                    title={disabled ? '브랜드 컬러 확정 후 지원 예정' : undefined}
                  >
                    <div className="text-sm font-semibold mb-1">{PALETTE_LABEL[key]}</div>
                    <div className="text-[11px] text-[var(--subtle)] leading-relaxed">
                      {key === 'dark-neon' && '검정 + 네온 강조'}
                      {key === 'light-mono' && '베이지 + 흑백'}
                      {key === 'brand' && '준비 중'}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <div className="mt-auto pt-4 border-t border-[var(--border)] text-[11px] text-[var(--subtle)] text-right">
            🪄 Claude Sonnet 4.6 · {AI_RENDER_TIME} · {AI_RENDER_COST}
          </div>
        </section>

        <aside className="flex flex-col items-center justify-center">
          <div className="w-full max-w-[420px]">
            <div className="text-[11px] text-[var(--subtle)] mb-2 text-center">
              미리보기 (첫 본문 카드)
            </div>
            <CardLayoutRenderer
              card={firstContent}
              layoutKey={layoutKey}
              paletteKey={paletteKey}
              total={cards.length}
              username="yourhandle"
              editable={false}
            />
          </div>
        </aside>
      </main>
    </div>
  )
}

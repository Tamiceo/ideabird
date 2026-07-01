'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CardLayoutRenderer from './CardLayoutRenderer'
import ContextBar from './ContextBar'
import WizardStepper from './WizardStepper'
import ExportSheet from './ExportSheet'
import FigmaExportModal from './FigmaExportModal'
import type { SaveState } from './SaveChip'
import {
  captureAllCards,
  downloadZip,
  uploadBlobsToServer,
  sanitizeFilename,
} from '@/lib/cardnews/export'
import {
  CARD_COUNT_MAX,
  CARD_COUNT_MIN,
  AI_REGEN_CARD_COST,
  AI_REGEN_CARD_TIME,
  LAYOUT_LABEL,
  PALETTE_LABEL,
  type CardnewsCard,
  type CardRendered,
  type LayoutKey,
  type PaletteKey,
  type StageKey,
} from '@/lib/cardnews/constants'

interface Props {
  id: string
  topic: string
  initialCards: CardnewsCard[]
  layoutKey: LayoutKey
  paletteKey: PaletteKey
  stage: StageKey
}

export default function Stage4Editor({
  id,
  topic,
  initialCards,
  layoutKey,
  paletteKey,
  stage,
}: Props) {
  const router = useRouter()
  const [cards, setCards] = useState<CardnewsCard[]>(initialCards)
  const [activeOrder, setActiveOrder] = useState<number>(0)
  const [regenOrder, setRegenOrder] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [exportBusy, setExportBusy] = useState<null | 'png' | 'figma'>(null)
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null)
  const [figmaUrls, setFigmaUrls] = useState<string[] | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const exportSheetRef = useRef<HTMLDivElement | null>(null)

  const isPublished = stage === 'published'
  const editable = !isPublished && regenOrder === null

  // 서버 즉시 저장 — 구조 변경(추가/삭제/복제/순서)·AI 재생성 전용
  const persistNow = async (payload: CardnewsCard[]): Promise<boolean> => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSaveState('saving')
    try {
      const res = await fetch(`/api/instagram/cardnews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: payload }),
        signal: controller.signal,
      })
      if (res.ok) {
        setSaveState('saved')
        setLastSavedAt(Date.now())
        return true
      }
      setSaveState('dirty')
      setError('저장 실패')
      return false
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setSaveState('dirty')
        setError('네트워크 오류')
      }
      return false
    }
  }

  // 전체 저장 버튼
  const saveAll = async () => {
    if (saveState === 'saving') return
    await persistNow(cards)
  }

  // 미저장 변경 있을 때 탭 닫기 경고
  useEffect(() => {
    if (saveState !== 'dirty') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveState])

  const confirmIfDirty = (msg: string): boolean => {
    if (saveState === 'dirty') {
      return window.confirm(msg)
    }
    return true
  }

  const activeIdx = cards.findIndex((c) => c.order === activeOrder)
  const activeCard = activeIdx >= 0 ? cards[activeIdx] : cards[0]
  const total = cards.length

  const handleRenderedChange = (newRendered: CardRendered) => {
    if (!activeCard) return
    const next = cards.map((c) =>
      c.order === activeCard.order ? { ...c, rendered: newRendered } : c
    )
    setCards(next)
    setSaveState('dirty')
  }

  const navPrev = () => {
    const prev = cards.findIndex((c) => c.order === activeOrder) - 1
    if (prev >= 0) setActiveOrder(cards[prev].order)
  }
  const navNext = () => {
    const nextIdx = cards.findIndex((c) => c.order === activeOrder) + 1
    if (nextIdx < cards.length) setActiveOrder(cards[nextIdx].order)
  }

  const regenerateCard = async () => {
    if (!activeCard || isPublished) return
    if (!window.confirm(`현재 카드의 편집 내용이 사라지고 AI 가 다시 제안합니다.\n(${AI_REGEN_CARD_COST} · ${AI_REGEN_CARD_TIME})`)) return
    setMenuOpen(false)
    setRegenOrder(activeCard.order)
    setError(null)
    try {
      const res = await fetch(`/api/instagram/${id}/regenerate-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardOrder: activeCard.order }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setError(j?.error ?? '재생성 실패')
        return
      }
      const data = (await res.json()) as { card: { order: number; rendered: CardRendered } }
      const next = cards.map((c) =>
        c.order === data.card.order ? { ...c, rendered: data.card.rendered } : c
      )
      setCards(next)
    } finally {
      setRegenOrder(null)
    }
  }

  const deleteCard = () => {
    if (!activeCard || isPublished) return
    if (activeCard.role === 'cover') return
    if (cards.length <= CARD_COUNT_MIN) return
    if (!window.confirm('이 카드를 삭제할까요?')) return
    setMenuOpen(false)
    const next = cards.filter((c) => c.order !== activeCard.order).map((c, i) => ({ ...c, order: i }))
    setCards(next)
    setActiveOrder(Math.max(0, activeOrder - 1))
    persistNow(next)
  }

  const duplicateCard = () => {
    if (!activeCard || isPublished) return
    if (activeCard.role === 'cover') return
    if (cards.length >= CARD_COUNT_MAX) return
    setMenuOpen(false)
    const idx = cards.findIndex((c) => c.order === activeCard.order)
    const clone = { ...activeCard, rendered: { ...(activeCard.rendered ?? {}) } }
    const next = [...cards.slice(0, idx + 1), clone, ...cards.slice(idx + 1)].map((c, i) => ({
      ...c,
      order: i,
    }))
    setCards(next)
    persistNow(next)
  }

  const addContentCard = () => {
    if (isPublished || cards.length >= CARD_COUNT_MAX) return
    const insertAt = Math.max(cards.length - 1, 1)
    const next = [
      ...cards.slice(0, insertAt),
      { order: 0, role: 'content' as const, message: '', rendered: {} },
      ...cards.slice(insertAt),
    ].map((c, i) => ({ ...c, order: i }))
    setCards(next)
    setActiveOrder(insertAt)
    persistNow(next)
  }

  const handleDuplicateCardnews = async () => {
    const res = await fetch(`/api/instagram/cardnews/${id}/duplicate`, { method: 'POST' })
    if (!res.ok) {
      alert('복제 실패')
      return
    }
    const data = (await res.json()) as { id: string }
    router.push(`/instagram/${data.id}`)
  }

  const handleExport = async () => {
    if (exportBusy || !exportSheetRef.current) return
    if (saveState === 'dirty') {
      if (!window.confirm('저장 안 된 변경이 있어요. 저장 안 한 상태로 PNG 를 뽑을까요?')) return
    }
    setExportBusy('png')
    setError(null)
    setExportProgress({ done: 0, total: cards.length })
    try {
      const orders = cards.map((c) => c.order)
      const blobs = await captureAllCards(exportSheetRef.current, orders, (done, total) =>
        setExportProgress({ done, total })
      )
      await downloadZip(blobs, sanitizeFilename(topic || 'cardnews'))
    } catch (e) {
      setError((e as Error).message || 'PNG 생성 실패')
    } finally {
      setExportBusy(null)
      setExportProgress(null)
    }
  }

  const handleFigmaExport = async () => {
    if (exportBusy || !exportSheetRef.current) return
    if (saveState === 'dirty') {
      if (!window.confirm('저장 안 된 변경이 있어요. 먼저 [전체저장] 을 누르고 다시 시도하는 걸 권장해요. 계속?')) return
    }
    setExportBusy('figma')
    setError(null)
    setExportProgress({ done: 0, total: cards.length })
    try {
      const orders = cards.map((c) => c.order)
      const blobs = await captureAllCards(exportSheetRef.current, orders, (done, total) =>
        setExportProgress({ done, total: total * 2 })
      )
      const urls = await uploadBlobsToServer(id, blobs, (done, total) =>
        setExportProgress({ done: total + done, total: total * 2 })
      )
      setFigmaUrls(urls)
    } catch (e) {
      setError((e as Error).message || 'Figma 내보내기 실패')
    } finally {
      setExportBusy(null)
      setExportProgress(null)
    }
  }

  const goRestructure = () => {
    if (!confirmIfDirty('저장 안 된 변경이 있어요. 저장 안 하고 구조·스타일 화면으로 갈까요?')) return
    if (!window.confirm('구조·스타일을 바꾸면 편집한 카드가 다시 그려집니다. 계속할까요?')) return
    router.push(`/instagram/${id}?stage=3`)
  }

  const goHome = () => {
    if (!confirmIfDirty('저장 안 된 변경이 있어요. 저장 안 하고 나갈까요?')) return
    router.push('/')
  }

  const pngLabel =
    exportBusy === 'png'
      ? exportProgress
        ? `캡처 중 ${exportProgress.done}/${exportProgress.total}`
        : '캡처 중...'
      : '⤓ PNG ZIP'

  const figmaButton = (
    <button
      type="button"
      disabled
      title="자체 Figma 플러그인 개발 예정"
      className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-white text-xs opacity-40 cursor-not-allowed"
    >
      🅵 Figma (준비 중)
    </button>
  )

  const rightSlot = isPublished ? (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={exportBusy !== null}
        className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-white text-xs hover:border-[var(--fg)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pngLabel}
      </button>
      {figmaButton}
      <button
        type="button"
        onClick={handleDuplicateCardnews}
        className="px-4 py-1.5 rounded-full bg-[var(--fg)] text-white text-xs font-semibold hover:bg-black"
      >
        복제 후 편집
      </button>
    </>
  ) : (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={exportBusy !== null}
        className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-white text-xs hover:border-[var(--fg)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pngLabel}
      </button>
      {figmaButton}
      <button
        type="button"
        onClick={saveAll}
        disabled={saveState === 'saving' || saveState === 'saved' || saveState === 'idle' || exportBusy !== null}
        className="px-4 py-1.5 rounded-full border border-[var(--border)] bg-white text-xs font-semibold hover:border-[var(--fg)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saveState === 'saving' ? '저장 중...' : '전체저장'}
      </button>
      <button
        type="button"
        disabled
        title="Instagram Graph API 연동 준비 중"
        className="px-4 py-1.5 rounded-full bg-[var(--fg)] text-white text-xs font-semibold opacity-40 cursor-not-allowed"
      >
        Instagram 발행
      </button>
    </>
  )

  return (
    <div className="flex flex-col h-screen">
      {/* 좁은 화면 안내 — 1024px 미만 */}
      <div className="lg:hidden flex-shrink-0 bg-amber-50 border-b border-amber-300 px-4 py-2 text-xs text-amber-900 flex items-center gap-2">
        <span>🖥</span>
        <span>카드뉴스 편집은 데스크탑 (1024px 이상) 에서 최적화돼요. 창을 넓게 해주세요.</span>
      </div>

      <ContextBar
        title={topic}
        isPublished={isPublished}
        saveState={isPublished ? undefined : saveState}
        lastSavedAt={lastSavedAt}
        onBack={goHome}
        rightSlot={rightSlot}
      />

      <WizardStepper active={4} />

      {/* 적용된 구조 바 */}
      <div className="flex-shrink-0 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto px-6 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <span className="text-[var(--subtle)]">적용된 구조:</span>
            <span className="font-medium">{LAYOUT_LABEL[layoutKey]}</span>
            <span className="text-[var(--subtle)]">·</span>
            <span className="font-medium">{PALETTE_LABEL[paletteKey]}</span>
            <span className="text-[var(--subtle)]">·</span>
            <span className="font-medium">1080 × 1350</span>
            <span className="text-[var(--subtle)]">·</span>
            <span className="font-medium">{total}장</span>
          </div>
          {!isPublished && (
            <button
              type="button"
              onClick={goRestructure}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900 text-[11px] hover:bg-amber-100"
            >
              ⚠️ ← 구조·스타일 바꾸기
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 px-6 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 2열 메인 */}
      <main className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto px-6 py-4 grid grid-cols-[240px_1fr] gap-5 overflow-hidden">
        {/* 좌 카드 목록 */}
        <aside className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h3 className="text-xs font-semibold text-[var(--subtle)] uppercase tracking-wider">
              카드 목록
            </h3>
            <span className="text-[11px] text-[var(--subtle)]">
              {total} / {CARD_COUNT_MAX}
            </span>
          </div>
          <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
            {cards.map((card) => {
              const isActive = card.order === activeOrder
              const preview =
                card.rendered?.title_primary ||
                card.rendered?.headline ||
                card.message?.slice(0, 30) ||
                '(비어있음)'
              return (
                <button
                  key={card.order}
                  type="button"
                  onClick={() => setActiveOrder(card.order)}
                  className={`w-full flex items-center gap-2 p-2.5 border rounded-lg text-xs text-left transition-colors ${
                    isActive
                      ? 'border-[var(--fg)] border-2 bg-[#FAFAF8]'
                      : 'border-[var(--border)] bg-white hover:border-[var(--muted)]'
                  }`}
                >
                  <span className="w-5 text-center font-semibold">
                    {String(card.order + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      card.role === 'cover' ? 'bg-pink-100 text-pink-900' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {card.role === 'cover' ? 'COVER' : '본문'}
                  </span>
                  <span className="flex-1 truncate">{preview}</span>
                </button>
              )
            })}
            {!isPublished && cards.length < CARD_COUNT_MAX && (
              <button
                type="button"
                onClick={addContentCard}
                className="w-full py-2.5 border-2 border-dashed border-[var(--border)] rounded-lg text-xs text-[var(--subtle)] hover:border-[var(--muted)] hover:text-[var(--fg)]"
              >
                + 본문 카드 추가
              </button>
            )}
          </div>
        </aside>

        {/* 우 IG 프리뷰 */}
        <section className="flex flex-col items-center min-h-0">
          <div className="flex items-center gap-5 mb-3 flex-shrink-0 w-full max-w-[480px] justify-center">
            <button
              type="button"
              onClick={navPrev}
              disabled={activeIdx <= 0}
              className="w-9 h-9 rounded-full border border-[var(--border)] bg-white hover:border-[var(--fg)] disabled:opacity-30"
            >
              ‹
            </button>
            <div className="text-sm text-center flex-1">
              <div className="font-semibold">
                카드 {activeIdx + 1} / {total}
              </div>
              <div className="text-[11px] text-[var(--subtle)]">
                {activeCard?.role === 'cover' ? 'COVER' : '본문'} · {LAYOUT_LABEL[layoutKey]}
              </div>
            </div>
            <button
              type="button"
              onClick={navNext}
              disabled={activeIdx >= cards.length - 1}
              className="w-9 h-9 rounded-full border border-[var(--border)] bg-white hover:border-[var(--fg)] disabled:opacity-30"
            >
              ›
            </button>
          </div>

          <div className="flex-1 min-h-0 w-full flex items-center justify-center relative">
            <div className="relative w-full max-w-[480px]">
              {!isPublished && (
                <div className="absolute top-2 right-2 z-10">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="w-7 h-7 rounded-full bg-white/70 backdrop-blur text-[var(--fg)] text-base flex items-center justify-center hover:bg-white"
                    aria-label="메뉴"
                  >
                    ⋯
                  </button>
                  {menuOpen && (
                    <div className="absolute top-9 right-0 min-w-[180px] bg-white border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-10">
                      <button
                        type="button"
                        onClick={regenerateCard}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg)]"
                      >
                        ↻ 이 카드만 재생성
                      </button>
                      <button
                        type="button"
                        onClick={duplicateCard}
                        disabled={activeCard?.role === 'cover' || cards.length >= CARD_COUNT_MAX}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg)] disabled:opacity-40"
                      >
                        ⎘ 복제
                      </button>
                      <div className="h-px bg-[var(--border)]" />
                      <button
                        type="button"
                        onClick={deleteCard}
                        disabled={activeCard?.role === 'cover' || cards.length <= CARD_COUNT_MIN}
                        className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        🗑 삭제
                      </button>
                    </div>
                  )}
                </div>
              )}

              {regenOrder === activeCard?.order && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <div className="text-xl mb-1">🎨</div>
                    <div className="text-sm font-semibold">다시 그리는 중...</div>
                  </div>
                </div>
              )}

              {activeCard && (
                <CardLayoutRenderer
                  card={activeCard}
                  layoutKey={layoutKey}
                  paletteKey={paletteKey}
                  total={total}
                  username="yourhandle"
                  editable={editable && activeCard.order === activeOrder}
                  onChange={handleRenderedChange}
                />
              )}
            </div>
          </div>

          {!isPublished && (
            <div className="mt-2 text-[11px] text-[var(--subtle)]">
              💡 텍스트를 클릭해 직접 수정하세요 · 저장은 자동
            </div>
          )}
        </section>
      </main>

      {menuOpen && <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(false)} />}

      <ExportSheet
        ref={exportSheetRef}
        cards={cards}
        layoutKey={layoutKey}
        paletteKey={paletteKey}
        username="yourhandle"
      />

      {figmaUrls && (
        <FigmaExportModal urls={figmaUrls} onClose={() => setFigmaUrls(null)} />
      )}

      <Link href="/" className="hidden" prefetch={false}>
        home
      </Link>
    </div>
  )
}

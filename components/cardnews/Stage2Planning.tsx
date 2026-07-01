'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import WizardStepper from './WizardStepper'
import ContextBar from './ContextBar'
import type { SaveState } from './SaveChip'
import {
  CARD_COUNT_MAX,
  CARD_COUNT_MIN,
  AI_PLAN_COST,
  AI_PLAN_TIME,
  type CardnewsCard,
} from '@/lib/cardnews/constants'

const PATCH_DEBOUNCE_MS = 1500

interface Props {
  id: string
  initialTopic: string
  initialCards: CardnewsCard[]
}

export default function Stage2Planning({ id, initialTopic, initialCards }: Props) {
  const router = useRouter()
  const [topic, setTopic] = useState(initialTopic)
  const [cards, setCards] = useState<CardnewsCard[]>(initialCards)
  const [isAiBusy, setIsAiBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const patchNow = async (body: Record<string, unknown>) => {
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
        setError(null)
      } else if (!controller.signal.aborted) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setSaveState('dirty')
        setError(j?.error ?? '저장 실패')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setSaveState('dirty')
        setError('네트워크 오류')
      }
    }
  }

  const schedulePatch = (body: Record<string, unknown>) => {
    setSaveState('dirty')
    if (patchTimerRef.current) clearTimeout(patchTimerRef.current)
    patchTimerRef.current = setTimeout(() => patchNow(body), PATCH_DEBOUNCE_MS)
  }

  const handleTopicChange = (v: string) => {
    setTopic(v)
    schedulePatch({ topic: v })
  }

  const handleMessageChange = (order: number, message: string) => {
    const next = cards.map((c) => (c.order === order ? { ...c, message } : c))
    setCards(next)
    schedulePatch({ cards: next })
  }

  const addContentCard = () => {
    if (cards.length >= CARD_COUNT_MAX || isAiBusy) return
    const insertAt = Math.max(cards.length - 1, 1)
    const next = [
      ...cards.slice(0, insertAt),
      { order: 0, role: 'content' as const, message: '' },
      ...cards.slice(insertAt),
    ].map((c, i) => ({ ...c, order: i }))
    setCards(next)
    schedulePatch({ cards: next })
  }

  const deleteCard = (order: number) => {
    if (cards.length <= CARD_COUNT_MIN || isAiBusy) return
    const target = cards.find((c) => c.order === order)
    if (target?.role === 'cover') return
    if (!window.confirm('이 카드를 삭제할까요?')) return
    const next = cards.filter((c) => c.order !== order).map((c, i) => ({ ...c, order: i }))
    setCards(next)
    schedulePatch({ cards: next })
  }

  const regenerateAll = async (instr?: string) => {
    const label = instr
      ? `"${instr}" 지시사항으로 다시 뽑을까요?`
      : `지금 편집한 주제·카드 구성이 모두 사라지고 AI 가 처음부터 다시 제안합니다.`
    if (!window.confirm(`${label}\n(${AI_PLAN_COST} · ${AI_PLAN_TIME})`)) {
      return
    }
    setIsAiBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/instagram/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, instruction: instr }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setError(j?.error ?? 'AI 재호출 실패')
        return
      }
      const data = (await res.json()) as { topic: string; cards: CardnewsCard[] }
      setTopic(data.topic)
      setCards(data.cards)
      setInstruction('')
    } finally {
      setIsAiBusy(false)
    }
  }

  const submitInstruction = () => {
    const trimmed = instruction.trim()
    if (!trimmed || isAiBusy) return
    regenerateAll(trimmed)
  }

  const applyPresetChip = (preset: string) => {
    if (isAiBusy) return
    regenerateAll(preset)
  }

  const goNext = async () => {
    if (patchTimerRef.current) {
      clearTimeout(patchTimerRef.current)
      await patchNow({ topic, cards })
    }
    router.push(`/instagram/${id}?stage=3`)
  }
  const goBack = () => router.push(`/instagram/${id}?stage=1`)
  const exitWizard = () => router.push('/')

  const canAdvance = topic.trim().length > 0 && cards.length >= CARD_COUNT_MIN && !isAiBusy

  const rightSlot = (
    <>
      <button
        type="button"
        onClick={goBack}
        disabled={isAiBusy}
        className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-white text-xs text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] disabled:opacity-40"
      >
        ← 소재 수정
      </button>
      <button
        type="button"
        onClick={() => regenerateAll()}
        disabled={isAiBusy}
        className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-white text-xs text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] disabled:opacity-40"
      >
        ↻ 처음부터
      </button>
      <button
        type="button"
        onClick={goNext}
        disabled={!canAdvance}
        className="px-4 py-1.5 rounded-full bg-[var(--fg)] text-white text-xs font-semibold hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
      >
        다음: 구조·스타일 →
      </button>
    </>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <ContextBar
        title={topic || '새 카드뉴스'}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        onBack={exitWizard}
        rightSlot={rightSlot}
      />
      <WizardStepper active={2} />

      <main
        className={`flex-1 max-w-[1100px] mx-auto w-full px-6 py-8 relative ${isAiBusy ? 'pointer-events-none' : ''}`}
      >
        {isAiBusy && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="text-2xl mb-2">🪄</div>
              <div className="font-semibold">다시 뽑는 중...</div>
              <div className="text-xs text-[var(--subtle)] mt-1">{AI_PLAN_TIME}</div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">AI 기획 결과</h1>
          <p className="text-[var(--muted)] text-sm">
            AI 가 뽑은 주제와 카드 구성을 자유롭게 다듬어주세요. 이 단계에서 <b>내용의 뼈대</b>가 결정됩니다.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
                ✨ AI 생성
              </span>
              <span className="text-xs text-[var(--subtle)]">· 편집 가능</span>
            </div>
            <input
              value={topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              placeholder="메인 주제"
              className="w-full text-2xl font-bold py-1 px-0 bg-transparent border-0 border-b-2 border-transparent hover:border-[var(--border)] focus:border-[var(--fg)] focus:outline-none"
            />
          </div>

          <div className="h-px bg-[var(--border)]" />

          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">카드 구성</h3>
                <div className="text-xs text-[var(--subtle)] mt-0.5">
                  총 <b>{cards.length}장</b> · 범위 {CARD_COUNT_MIN}~{CARD_COUNT_MAX}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {cards.map((card) => {
                const isCover = card.role === 'cover'
                return (
                  <div
                    key={card.order}
                    className={`flex items-start gap-3 p-3 border rounded-xl ${
                      isCover
                        ? 'bg-gradient-to-r from-pink-50 to-purple-50 border-[var(--border)]'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    <div className="w-12 text-center pt-1">
                      <div className="text-base font-bold">
                        {String(card.order + 1).padStart(2, '0')}
                      </div>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          isCover ? 'bg-pink-100 text-pink-900' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {isCover ? 'COVER' : '본문'}
                      </span>
                    </div>
                    <textarea
                      value={card.message}
                      onChange={(e) => handleMessageChange(card.order, e.target.value)}
                      rows={2}
                      placeholder="카드 메시지"
                      className="flex-1 resize-none border-0 bg-transparent focus:outline-none text-sm py-1"
                    />
                    {!isCover && cards.length > CARD_COUNT_MIN && (
                      <button
                        type="button"
                        onClick={() => deleteCard(card.order)}
                        className="text-sm text-[var(--subtle)] hover:text-red-600 pt-1"
                        aria-label="삭제"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                )
              })}

              {cards.length < CARD_COUNT_MAX && (
                <button
                  type="button"
                  onClick={addContentCard}
                  className="w-full mt-3 py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-sm text-[var(--subtle)] hover:border-[var(--muted)] hover:text-[var(--fg)]"
                >
                  + 본문 카드 추가
                </button>
              )}
            </div>
          </div>

          <div className="px-8 py-5 border-t border-[var(--border)] bg-[var(--bg)] space-y-3">
            <div>
              <div className="text-[11px] font-semibold text-[var(--subtle)] uppercase tracking-wider mb-2">
                🪄 AI 에게 추가 지시 (선택)
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['+ 더 짧게', '+ 더 캐주얼하게', '+ 수치 더 넣기', '+ 이모지 빼기', '+ 카드 수 줄이기', '+ 카드 수 늘리기'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPresetChip(preset.replace(/^\+\s*/, ''))}
                    disabled={isAiBusy}
                    className="px-3 py-1 rounded-full border border-[var(--border)] bg-white text-[12px] text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] disabled:opacity-40"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-start">
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      submitInstruction()
                    }
                  }}
                  disabled={isAiBusy}
                  rows={2}
                  placeholder="예: 2번 카드에 구체적 수치 하나 추가해줘 · ⌘+Enter 로 전송"
                  className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm resize-none focus:outline-none focus:border-[var(--fg)] focus:ring-2 focus:ring-[rgba(17,17,16,0.08)] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={submitInstruction}
                  disabled={isAiBusy || !instruction.trim()}
                  className="px-4 py-2.5 rounded-lg bg-[var(--fg)] text-white text-sm font-semibold hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
                  title="⌘+Enter"
                >
                  ↑ 적용
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

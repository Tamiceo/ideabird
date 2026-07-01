'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import WizardStepper from './WizardStepper'
import ContextBar from './ContextBar'
import type { SaveState } from './SaveChip'
import { SOURCE_TEXT_MAX } from '@/lib/cardnews/constants'

const LS_KEY_NEW = 'ideabird:cardnews:draft:new'
const LS_DEBOUNCE_MS = 500
const LS_EXPIRE_MS = 5 * 60 * 1000

function lsKey(id?: string): string {
  return id ? `ideabird:cardnews:draft:${id}` : LS_KEY_NEW
}

export interface RecentRow {
  id: string
  source_text: string
  topic: string | null
  stage: string
  updated_at: string
}

interface Props {
  initialRecent: RecentRow[]
  initialId?: string
  initialText?: string
  initialTopic?: string
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 1) return '방금'
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const weeks = Math.floor(days / 7)
  return `${weeks}주 전`
}

function stageLabel(stage: string): string {
  if (stage === 'published') return 'Published'
  return 'Draft'
}

export default function Stage1Source({ initialRecent, initialId, initialText, initialTopic }: Props) {
  const router = useRouter()
  const [text, setText] = useState(initialText ?? '')
  const [autoSavedAt, setAutoSavedAt] = useState<number | null>(null)
  const [busy, setBusy] = useState<null | 'save' | 'plan'>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastDbSavedAt, setLastDbSavedAt] = useState<number | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveState: SaveState = (() => {
    if (busy === 'save') return 'saving'
    if (isDirty) return 'dirty'
    if (text.trim().length === 0) return 'idle'
    if (lastDbSavedAt !== null || initialText !== undefined) return 'saved'
    return 'idle'
  })()

  useEffect(() => {
    // 재진입(?id=)에서 initialText 가 있으면 localStorage 복원 스킵 — DB 가 원천
    if (initialText !== undefined) return
    try {
      const raw = localStorage.getItem(lsKey(initialId))
      if (!raw) return
      const parsed = JSON.parse(raw) as { source_text?: unknown; updated_at?: unknown }
      if (
        typeof parsed.source_text === 'string' &&
        typeof parsed.updated_at === 'number' &&
        Date.now() - parsed.updated_at < LS_EXPIRE_MS
      ) {
        setText(parsed.source_text)
      }
    } catch {
      // ignore
    }
  }, [initialId, initialText])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const key = lsKey(initialId)
    if (text.length === 0) {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
      setAutoSavedAt(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ source_text: text, updated_at: Date.now() })
        )
        setAutoSavedAt(Date.now())
      } catch {
        // ignore
      }
    }, LS_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [text, initialId])

  const trimmed = text.trim()
  const length = text.length
  const overLimit = length > SOURCE_TEXT_MAX
  const canSubmit = trimmed.length > 0 && !overLimit
  const isBusy = busy !== null

  const saveCardnews = async (): Promise<string | null> => {
    if (initialId) {
      const res = await fetch(`/api/instagram/cardnews/${initialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_text: text }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setError(j?.error ?? '저장에 실패했어요')
        return null
      }
      return initialId
    }
    const res = await fetch('/api/instagram/cardnews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_text: text }),
    })
    if (!res.ok) {
      const errJson = (await res.json().catch(() => null)) as { error?: string } | null
      setError(errJson?.error ?? '저장에 실패했어요')
      return null
    }
    const data = (await res.json()) as { id: string }
    return data.id
  }

  const saveOnly = async () => {
    if (!canSubmit || isBusy) return
    setBusy('save')
    setError(null)
    try {
      const id = await saveCardnews()
      if (!id) return
      try {
        localStorage.removeItem(lsKey(initialId))
      } catch {
        // ignore
      }
      setIsDirty(false)
      setLastDbSavedAt(Date.now())
      router.replace(`/instagram/${id}?stage=1`)
    } finally {
      setBusy(null)
    }
  }

  const startPlanning = async () => {
    if (!canSubmit || isBusy) return
    setBusy('plan')
    setError(null)
    try {
      const id = await saveCardnews()
      if (!id) return

      const planRes = await fetch('/api/instagram/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!planRes.ok) {
        const errJson = (await planRes.json().catch(() => null)) as { error?: string } | null
        setError(
          errJson?.error ??
            'AI 기획에 실패했어요. 소재는 저장됐으니 홈에서 다시 시도할 수 있어요.'
        )
        setTimeout(() => router.push(`/instagram/${id}?stage=1`), 1500)
        return
      }
      try {
        localStorage.removeItem(lsKey(initialId))
      } catch {
        // ignore
      }
      router.push(`/instagram/${id}?stage=2`)
    } finally {
      setBusy(null)
    }
  }

  const exitWizard = () => {
    if (isDirty && trimmed.length >= 10) {
      if (!window.confirm('저장 안 된 소재가 있어요. 나가시겠어요?')) return
    }
    router.push('/')
  }

  const counterColor = overLimit ? 'text-red-600' : 'text-[var(--subtle)]'

  const rightSlot = (
    <>
      <button
        type="button"
        onClick={saveOnly}
        disabled={!canSubmit || isBusy}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--border)] bg-white text-xs text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy === 'save' ? '저장 중...' : '💾 소재만 저장'}
      </button>
      <button
        type="button"
        onClick={startPlanning}
        disabled={!canSubmit || isBusy}
        className="px-4 py-1.5 rounded-full bg-[var(--fg)] text-white text-xs font-semibold hover:bg-black disabled:bg-[var(--subtle)] disabled:cursor-not-allowed"
      >
        {busy === 'plan' ? '🪄 주제를 뽑는 중...' : 'AI 기획 시작 →'}
      </button>
    </>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <ContextBar
        title={initialTopic || '새 카드뉴스'}
        showStatusPill={Boolean(initialId)}
        saveState={saveState}
        lastSavedAt={lastDbSavedAt ?? autoSavedAt}
        onBack={exitWizard}
        rightSlot={rightSlot}
      />
      <WizardStepper active={1} />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8 grid grid-cols-[240px_1fr] gap-6">
        <aside className="space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-[var(--subtle)] uppercase tracking-wider mb-2">
              최근 작업
            </h3>
            {initialRecent.length === 0 ? (
              <div className="text-xs text-[var(--subtle)] leading-relaxed">
                아직 이 플랫폼에 작업이 없어요
              </div>
            ) : (
              <div className="space-y-1.5">
                {initialRecent.map((row) => (
                  <Link
                    key={row.id}
                    href={`/instagram/${row.id}${row.stage === 'sourcing' ? '?stage=1' : ''}`}
                    className="block p-2.5 bg-white border border-[var(--border)] rounded-lg text-xs hover:border-[var(--muted)] transition-colors"
                  >
                    <div className="font-medium truncate">
                      {row.topic ?? row.source_text.slice(0, 30)}
                    </div>
                    <div className="text-[var(--subtle)] text-[11px] mt-0.5">
                      {stageLabel(row.stage)} · {formatRelative(row.updated_at)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[var(--border)] rounded-lg p-3 text-xs leading-relaxed">
            <div className="font-semibold mb-1.5">💡 좋은 소재 예시</div>
            <ul className="space-y-1 text-[var(--muted)]">
              <li>· 최근 겪은 문제와 해결</li>
              <li>· 실수·실패에서 배운 것</li>
              <li>· 3~5개 핵심 원칙·팁</li>
              <li>· 구체적 수치·사례</li>
            </ul>
          </div>
        </aside>

        <section>
          <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="px-8 pt-8 pb-6">
              <h1 className="text-2xl font-bold mb-2">어떤 소재로 카드뉴스를 만들까요?</h1>
              <p className="text-[var(--muted)] text-sm">
                경험·스토리·수치·인사이트를 자유롭게 적어주세요. AI 가 주제와 카드 구성을 먼저 제안합니다.
              </p>
            </div>

            <div className="px-8 pb-4">
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setIsDirty(true)
                }}
                disabled={isBusy}
                rows={10}
                placeholder="예: 바이브코딩으로 혼자 IdeaBird 라는 1인 CMS 를 만들었어요. Claude Code 와 3주 작업. 시작 전에 3가지 원칙을 정했고..."
                className="w-full border border-[var(--border)] rounded-xl p-5 text-[15px] leading-relaxed resize-none focus:outline-none focus:border-[var(--fg)] focus:ring-2 focus:ring-[rgba(17,17,16,0.08)] disabled:opacity-60"
              />

              <div className="flex items-center justify-between mt-3 text-xs">
                <div className="flex items-center gap-2">
                  {autoSavedAt && (
                    <span className="text-[var(--subtle)]">✓ 자동 저장됨</span>
                  )}
                </div>
                <span className={`tabular-nums ${counterColor}`}>
                  {length.toLocaleString()} / {SOURCE_TEXT_MAX.toLocaleString()} 자
                </span>
              </div>

              {error && (
                <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="h-px bg-[var(--border)]" />

            <div className="px-8 py-4 bg-[var(--bg)] flex items-center justify-between text-xs text-[var(--subtle)]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-white border border-[var(--border)] rounded-md text-[11px] font-medium text-[var(--fg)]">
                  🪄 Claude Sonnet 4.6
                </span>
                <span>→ 주제 + 카드별 핵심 메시지 제안 (약 10초)</span>
              </div>
              {!canSubmit && !isBusy && (
                <span className="text-[11px]">↑ 소재를 입력하면 상단 버튼이 활성화됩니다</span>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

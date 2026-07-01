'use client'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved'

interface Props {
  saveState: SaveState
  lastSavedAt: number | null
}

export default function SaveChip({ saveState, lastSavedAt }: Props) {
  const { dot, text } = (() => {
    if (saveState === 'saving') return { dot: '#9CA3AF', text: '저장 중...' }
    if (saveState === 'saved') {
      const mm = lastSavedAt
        ? new Date(lastSavedAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null
      return { dot: '#10B981', text: mm ? `저장됨 · ${mm}` : '저장됨' }
    }
    if (saveState === 'dirty') return { dot: '#F59E0B', text: '저장되지 않은 변경 있음' }
    return { dot: '#10B981', text: '변경 없음' }
  })()

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] text-[var(--muted)]">
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      {text}
    </span>
  )
}

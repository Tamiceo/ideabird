'use client'

type Props = {
  title: string
  backHref: string
  saveState: 'idle' | 'saving' | 'saved' | 'dirty'
  lastSavedAt?: string | null
  onSave: () => void
  onPublish: () => void
  canPublish: boolean
  publishing?: boolean
}

export function GlobalActionBar({
  title,
  backHref,
  saveState,
  lastSavedAt,
  onSave,
  onPublish,
  canPublish,
  publishing = false,
}: Props) {
  const statusText = (() => {
    if (saveState === 'saving') return '저장 중...'
    if (saveState === 'saved') return lastSavedAt ? `저장됨 · ${lastSavedAt}` : '저장됨'
    if (saveState === 'dirty') return '저장되지 않은 변경 있음'
    return '새 글'
  })()

  const dotColor =
    saveState === 'dirty'
      ? 'var(--warning)'
      : saveState === 'saving'
        ? 'var(--muted)'
        : 'var(--success)'

  return (
    <div className="global-bar">
      <a href={backHref} className="back-link">← 목록</a>
      <span className="divider">·</span>
      <span className="title">{title}</span>
      <span className="status-chip">
        <span className="dot" style={{ background: dotColor }} />
        {statusText}
      </span>
      <button
        className="btn"
        onClick={onSave}
        disabled={saveState === 'saving' || saveState === 'saved'}
      >
        {saveState === 'saving' ? '저장 중...' : '전체저장'}
      </button>
      <button
        className="btn btn-primary"
        onClick={onPublish}
        disabled={!canPublish || publishing}
      >
        {publishing ? '발행 중...' : 'LinkedIn 발행'}
      </button>
    </div>
  )
}

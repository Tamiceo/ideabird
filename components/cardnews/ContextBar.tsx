'use client'

import type { ReactNode } from 'react'
import SaveChip, { type SaveState } from './SaveChip'

interface Props {
  title: string
  isPublished?: boolean
  showStatusPill?: boolean
  saveState?: SaveState
  lastSavedAt?: number | null
  onBack: () => void
  rightSlot: ReactNode
}

export default function ContextBar({
  title,
  isPublished = false,
  showStatusPill = true,
  saveState,
  lastSavedAt = null,
  onBack,
  rightSlot,
}: Props) {
  return (
    <div className="flex-shrink-0 bg-white border-b border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto px-6 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-full border border-[var(--border)] bg-white flex items-center justify-center hover:border-[var(--fg)] flex-shrink-0"
            aria-label="홈으로"
          >
            ←
          </button>
          <span className="font-semibold truncate max-w-[360px]">{title}</span>
          {showStatusPill && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${
                isPublished ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {isPublished ? 'Published' : 'Draft'}
            </span>
          )}
          {saveState !== undefined && !isPublished && (
            <SaveChip saveState={saveState} lastSavedAt={lastSavedAt} />
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">{rightSlot}</div>
      </div>
    </div>
  )
}

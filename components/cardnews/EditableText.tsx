'use client'

import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type FocusEvent,
} from 'react'

interface Props {
  value: string
  placeholder?: string
  className?: string
  style?: CSSProperties
  editable?: boolean
  onCommit?: (value: string) => void
  multiline?: boolean
}

export default function EditableText({
  value,
  placeholder = '',
  className = '',
  style,
  editable = false,
  onCommit,
  multiline = false,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  // value prop 변경 시 DOM 업데이트 — 단, 편집 중(focus) 이면 건드리지 않음
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.textContent !== value) el.textContent = value
  }, [value])

  if (!editable) {
    return (
      <div className={className} style={style}>
        {value || placeholder}
      </div>
    )
  }

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent ?? ''
    if (text !== value) onCommit?.(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      // Escape 로 원본 복원 후 blur
      e.preventDefault()
      if (ref.current) ref.current.textContent = value
      e.currentTarget.blur()
    }
  }

  return (
    <div
      ref={ref}
      className={`editable-text outline-none focus:ring-2 focus:ring-[rgba(185,255,102,0.85)] focus:bg-[rgba(185,255,102,0.08)] rounded-sm cursor-text ${className}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
    />
  )
}

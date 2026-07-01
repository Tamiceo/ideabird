'use client'
import { useEffect, useRef, useState } from 'react'
import type { StreamItem } from './types'

type Props = {
  items: StreamItem[]
  chips?: string[]
  onSend: (text: string) => void
  onChipClick?: (chip: string) => void
  onAttachImage?: (file: File) => void
  onSelectImageChoice?: (itemIndex: number, optionId: string) => void
  disabled?: boolean
}

export function Conversational({
  items,
  chips = ['+ 더 짧게', '+ 캐주얼하게', '+ 해시태그 추가', '+ 이모지 빼기', '+ 이미지 제안받기'],
  onSend,
  onChipClick,
  onAttachImage,
  onSelectImageChoice,
  disabled = false,
}: Props) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streamRef = useRef<HTMLDivElement>(null)
  const splitterRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userResized, setUserResized] = useState(false)
  const draggingRef = useRef(false)

  // Auto-scroll to bottom when new items arrive
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight
    }
  }, [items.length])

  // Auto-expand textarea up to 500px unless user has manually resized
  useEffect(() => {
    const el = inputRef.current
    if (!el || userResized) return
    el.style.height = 'auto'
    el.style.height = Math.min(Math.max(el.scrollHeight, 44), 500) + 'px'
  }, [input, userResized])

  // Splitter drag — vertical resize
  useEffect(() => {
    const splitter = splitterRef.current
    if (!splitter) return

    let startY = 0
    let startH = 0

    const onMouseDown = (e: MouseEvent) => {
      draggingRef.current = true
      setUserResized(true)
      startY = e.clientY
      startH = inputRef.current?.offsetHeight ?? 44
      splitter.classList.add('dragging')
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      e.preventDefault()
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !inputRef.current) return
      const delta = startY - e.clientY
      const newH = Math.max(44, Math.min(500, startH + delta))
      inputRef.current.style.height = newH + 'px'
    }
    const onMouseUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      splitter.classList.remove('dragging')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    splitter.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      splitter.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleSend = () => {
    const text = input.trim()
    if (!text || disabled) return
    onSend(text)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = '44px'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = '44px'
      inputRef.current.focus()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onAttachImage) onAttachImage(file)
    if (e.target) e.target.value = ''
  }

  return (
    <div className="conv">
      <div className="conv-header">💬 아이디어버드와 대화</div>

      <div className="conv-stream" ref={streamRef}>
        {items.map((item, i) => {
          if (item.kind === 'narration') {
            return (
              <div key={i} className={`narration ${item.tone}`}>
                <span>{item.text}</span>
                {item.skeletons ? (
                  <span style={{ display: 'inline-flex', gap: 4, marginLeft: 8 }}>
                    {Array.from({ length: item.skeletons }).map((_, k) => (
                      <span
                        key={k}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
                          animation: `pulse 1.5s infinite ${k * 0.3}s`,
                        }}
                      />
                    ))}
                  </span>
                ) : null}
                {item.link ? (
                  <a
                    href={item.link.href}
                    className="link-btn"
                    target={item.link.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    style={{
                      background:
                        item.link.variant === 'warning'
                          ? 'var(--warning)'
                          : item.link.variant === 'accent'
                            ? 'var(--fg)'
                            : 'var(--linkedin)',
                    }}
                  >
                    {item.link.label}
                  </a>
                ) : null}
              </div>
            )
          }
          if (item.kind === 'image-choices') {
            return (
              <div key={i} className="msg msg-ai">
                <div className="msg-avatar">🐦</div>
                <div className="msg-bubble">
                  {item.text}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {item.options.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => onSelectImageChoice?.(i, opt.id)}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          background: opt.gradient,
                          cursor: 'pointer',
                          border:
                            item.selectedId === opt.id
                              ? '2px solid var(--fg)'
                              : '2px solid transparent',
                          padding: 0,
                        }}
                        aria-label={`이미지 ${opt.id} 선택`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          }
          // message
          return (
            <div key={i} className={`msg msg-${item.role}`}>
              <div className="msg-avatar">{item.role === 'ai' ? '🐦' : '👤'}</div>
              <div className={`msg-bubble${item.streaming ? ' cursor-blink' : ''}`}>
                {item.image ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 6,
                        background: 'linear-gradient(135deg, #fecaca, #f87171)',
                      }}
                    />
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      {item.image.filename} · {item.image.size}
                    </span>
                  </div>
                ) : null}
                {item.text ? <div>{item.text}</div> : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="splitter" ref={splitterRef} title="상하 드래그로 입력창 크기 조정" />

      <div className="input-area">
        <div className="chips">
          {chips.map(c => (
            <button
              key={c}
              className="chip"
              onClick={() => {
                if (onChipClick) onChipClick(c)
                else onSend(c.replace(/^\+\s*/, ''))
              }}
              type="button"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="input-row">
          <button className="reset-btn" onClick={handleReset} title="입력창 초기화" type="button">
            ↺
          </button>
          <button
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            title="이미지 첨부"
            type="button"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div className="input-wrap">
            <textarea
              ref={inputRef}
              className="editor-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="소재·지시를 자연어로 입력 · 이미지는 📎 또는 드래그앤드롭 · 위 가운데 바를 드래그해서 창 크기 조정"
              disabled={disabled}
            />
          </div>
          <button className="send-btn" onClick={handleSend} type="button" disabled={disabled}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

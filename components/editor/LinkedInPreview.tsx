'use client'
import { useEffect, useRef } from 'react'

type Props = {
  profileName: string
  profileSub: string
  text: string
  onTextChange: (next: string) => void
  imageUrl?: string | null
  imagePlaceholder?: string
  streaming?: boolean
  unsaved?: boolean
}

export function LinkedInPreview({
  profileName,
  profileSub,
  text,
  onTextChange,
  imageUrl,
  imagePlaceholder = '썸네일 이미지',
  streaming = false,
  unsaved = false,
}: Props) {
  const postRef = useRef<HTMLDivElement>(null)
  // DOM에 마지막으로 반영한 텍스트. 사용자 입력 중에는 prop과 같아 DOM을 다시 건드리지 않는다.
  const committedRef = useRef<string>(text)

  // 마운트 시 1회 초기 세팅
  useEffect(() => {
    if (postRef.current && postRef.current.innerText !== text) {
      postRef.current.innerText = text
      committedRef.current = text
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 외부에서 text가 바뀐 경우(예: AI 교정 결과)에만 DOM 재세팅
  useEffect(() => {
    if (!postRef.current) return
    if (committedRef.current === text) return // 사용자 입력으로 인한 변경이면 skip
    postRef.current.innerText = text
    committedRef.current = text
  }, [text])

  const handleInput = () => {
    const next = postRef.current?.innerText ?? ''
    committedRef.current = next
    if (next !== text) onTextChange(next)
  }

  return (
    <div className="linkedin-card">
      <div className="profile">
        <div className="profile-avatar" />
        <div className="profile-info">
          <span className="profile-name">{profileName}</span>
          <span className="profile-sub">{profileSub}</span>
        </div>
      </div>
      <div
        ref={postRef}
        className={`post-text${streaming ? ' streaming' : ''}`}
        contentEditable={!streaming}
        suppressContentEditableWarning
        onInput={handleInput}
      />
      {unsaved && (
        <div className="edit-hint unsaved">저장되지 않은 편집 · 전체저장으로 확정</div>
      )}
      {imageUrl ? (
        <div
          className="post-image"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-label={imagePlaceholder}
        />
      ) : null}
    </div>
  )
}

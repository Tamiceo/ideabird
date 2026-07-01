'use client'
import type { ReactNode } from 'react'
import type { AttachedImage } from './types'

type Props = {
  children: ReactNode
  image?: AttachedImage | null
  onRemoveImage?: () => void
  headerLabel?: string
}

export function Canvas({
  children,
  image,
  onRemoveImage,
  headerLabel = '📄 프리뷰 (LinkedIn 발행 버전)',
}: Props) {
  return (
    <div className="canvas">
      <div className="canvas-header">{headerLabel}</div>
      <div className="canvas-body">{children}</div>
      {image ? (
        <div className="image-tray">
          <div
            className="image-tray-thumb"
            style={
              image.url
                ? {
                    backgroundImage: `url(${image.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />
          <div className="image-tray-info">
            <div className="name">{image.filename}</div>
            <div className="meta">{image.meta}</div>
          </div>
          <button
            className="btn"
            title="이미지 제거 (글만 발행)"
            style={{ padding: '6px 10px' }}
            onClick={onRemoveImage}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}

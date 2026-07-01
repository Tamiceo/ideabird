'use client'

import { forwardRef } from 'react'
import CardLayoutRenderer from './CardLayoutRenderer'
import type {
  CardnewsCard,
  LayoutKey,
  PaletteKey,
} from '@/lib/cardnews/constants'

interface Props {
  cards: CardnewsCard[]
  layoutKey: LayoutKey
  paletteKey: PaletteKey
  username: string
}

/**
 * 오프스크린 렌더 시트 — 7장을 모두 실사이즈(1080×1350)로 그려두고
 * html2canvas 가 data-card-order 로 찾아 캡처하도록 함.
 */
const ExportSheet = forwardRef<HTMLDivElement, Props>(function ExportSheet(
  { cards, layoutKey, paletteKey, username },
  ref
) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: '-99999px',
        width: '540px',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      {cards.map((card) => (
        <div
          key={card.order}
          data-card-order={card.order}
          style={{ width: '540px', height: '675px' }}
        >
          <CardLayoutRenderer
            card={card}
            layoutKey={layoutKey}
            paletteKey={paletteKey}
            total={cards.length}
            username={username}
            editable={false}
          />
        </div>
      ))}
    </div>
  )
})

export default ExportSheet

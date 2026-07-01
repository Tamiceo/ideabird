'use client';

import { paletteToCssVars, getPalette, type PaletteTokens } from '@/lib/cardnews/palettes';
import type {
  PaletteKey,
  LayoutKey,
  CardnewsCard,
  CardRendered,
} from '@/lib/cardnews/constants';
import { getLayoutComponent } from '@/lib/cardnews/layouts/registry';
import CoverLayout from './layouts/CoverLayout';

export interface LayoutMeta {
  order: number;
  total: number;
  username: string;
}

export interface LayoutProps {
  rendered: CardRendered;
  palette: PaletteTokens;
  meta: LayoutMeta;
  editable?: boolean;
  onChange?: (rendered: CardRendered) => void;
}

interface Props {
  card: CardnewsCard;
  layoutKey: LayoutKey;
  paletteKey: PaletteKey;
  total: number;
  username: string;
  editable?: boolean;
  onChange?: (rendered: CardRendered) => void;
  className?: string;
}

export default function CardLayoutRenderer({
  card,
  layoutKey,
  paletteKey,
  total,
  username,
  editable = false,
  onChange,
  className = '',
}: Props) {
  const palette = getPalette(paletteKey);
  const style = paletteToCssVars(paletteKey);
  const rendered = card.rendered ?? {};
  const meta: LayoutMeta = { order: card.order, total, username };

  const layoutProps: LayoutProps = { rendered, palette, meta, editable, onChange };
  const ContentLayout = getLayoutComponent(layoutKey);

  return (
    <div
      className={`relative w-full aspect-[1080/1350] overflow-hidden ${className}`}
      style={{
        ...style,
        background: palette.bg,
        color: palette.fg,
        // html2canvas 호환 위해 font-family 명시 (inherit 체인 끊기지 않도록)
        fontFamily:
          `'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif`,
      }}
    >
      {card.role === 'cover' ? (
        <CoverLayout {...layoutProps} />
      ) : (
        <ContentLayout {...layoutProps} />
      )}
    </div>
  );
}

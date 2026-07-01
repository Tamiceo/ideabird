'use client';

import type { CardRendered } from '@/lib/cardnews/constants';
import EditableText from '../EditableText';
import type { LayoutProps } from '../CardLayoutRenderer';

export default function HeadlineOverlayLayout({
  rendered,
  palette,
  meta,
  editable,
  onChange,
}: LayoutProps) {
  const orderLabel = String(meta.order + 1).padStart(2, '0');
  const totalLabel = String(meta.total).padStart(2, '0');

  const set = <K extends keyof CardRendered>(k: K, v: CardRendered[K]) =>
    onChange?.({ ...rendered, [k]: v });

  const style = rendered.background_style ?? 'gradient';
  const overlay =
    style === 'gradient'
      ? `radial-gradient(circle at 30% 20%, ${hexWithAlpha(palette.accent, 0.25)} 0%, transparent 55%), radial-gradient(circle at 75% 80%, ${hexWithAlpha(palette.accent, 0.15)} 0%, transparent 60%)`
      : `repeating-linear-gradient(45deg, ${hexWithAlpha(palette.accent, 0.08)} 0 12px, transparent 12px 24px)`;

  return (
    <div className="absolute inset-0 flex flex-col p-[40px]" style={{ backgroundImage: overlay }}>
      <div className="flex items-start justify-between">
        <div
          className="text-[10px] font-semibold tracking-[0.2em]"
          style={{ color: palette.accentDim }}
        >
          {orderLabel} / {totalLabel}
        </div>
        <div className="text-[10px]" style={{ color: palette.subtle }}>
          @{meta.username}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center text-center">
        <EditableText
          value={rendered.headline ?? ''}
          placeholder="가장 강한 한 문장을 적으세요"
          className="text-[48px] font-black leading-[1.1] tracking-tight"
          style={{ color: palette.fg }}
          editable={editable}
          onCommit={(v) => set('headline', v)}
          multiline
        />
      </div>

      {editable && (
        <div className="flex gap-2 mt-4 justify-center">
          {(['gradient', 'pattern'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => set('background_style', opt)}
              className="text-[11px] px-3 py-1 rounded-full border"
              style={{
                borderColor: style === opt ? palette.accent : palette.boxBorder,
                color: style === opt ? palette.accent : palette.subtle,
                background: style === opt ? 'transparent' : palette.boxBg,
              }}
            >
              {opt === 'gradient' ? '그라디언트' : '패턴'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

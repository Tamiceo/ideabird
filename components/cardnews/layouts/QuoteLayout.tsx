'use client';

import type { CardRendered } from '@/lib/cardnews/constants';
import EditableText from '../EditableText';
import type { LayoutProps } from '../CardLayoutRenderer';

export default function QuoteLayout({
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

  return (
    <div className="absolute inset-0 flex flex-col p-[42px]">
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

      <div className="flex-1 flex flex-col justify-center -mt-4">
        <div
          className="text-[120px] leading-[0.6] font-serif mb-3 select-none"
          style={{ color: palette.accent, opacity: 0.65 }}
          aria-hidden="true"
        >
          “
        </div>

        <EditableText
          value={rendered.quote_text ?? ''}
          placeholder="인용할 핵심 문장을 입력하세요"
          className="text-[30px] font-bold leading-[1.3] tracking-[-0.01em]"
          style={{ color: palette.fg }}
          editable={editable}
          onCommit={(v) => set('quote_text', v)}
          multiline
        />
      </div>

      <div className="flex items-center gap-3">
        <div
          className="w-[28px] h-[1px]"
          style={{ background: palette.accent }}
          aria-hidden="true"
        />
        <EditableText
          value={rendered.quote_attribution ?? ''}
          placeholder="— 저자·출처"
          className="text-[13px] font-medium leading-tight"
          style={{ color: palette.muted }}
          editable={editable}
          onCommit={(v) => set('quote_attribution', v)}
        />
      </div>
    </div>
  );
}

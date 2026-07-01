'use client';

import type { CardRendered } from '@/lib/cardnews/constants';
import EditableText from '../EditableText';
import type { LayoutProps } from '../CardLayoutRenderer';

export default function CoverLayout({ rendered, palette, meta, editable, onChange }: LayoutProps) {
  const set = <K extends keyof CardRendered>(k: K, v: CardRendered[K]) =>
    onChange?.({ ...rendered, [k]: v });

  const orderLabel = String(meta.order + 1).padStart(2, '0');
  const totalLabel = String(meta.total).padStart(2, '0');
  const isFirst = meta.order === 0;
  const isLast = meta.order === meta.total - 1;

  return (
    <div className="absolute inset-0 flex flex-col p-[42px]">
      {/* 상단 메타 */}
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

      {/* 중앙 타이틀 영역 */}
      <div className="flex-1 flex flex-col justify-center">
        {/* 액센트 바 */}
        <div
          className="w-[48px] h-[3px] mb-5"
          style={{ background: palette.accent }}
          aria-hidden="true"
        />

        {(rendered.category_tag || editable) && (
          <EditableText
            value={rendered.category_tag ?? ''}
            placeholder="INSIGHT (선택)"
            className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3"
            style={{ color: palette.accent }}
            editable={editable}
            onCommit={(v) => set('category_tag', v)}
          />
        )}

        <EditableText
          value={rendered.title_primary ?? ''}
          placeholder={isLast ? '마지막 CTA 타이틀' : '메인 타이틀을 입력하세요'}
          className="text-[40px] leading-[1.2] tracking-[-0.02em] mb-3"
          style={{ color: palette.fg, fontWeight: 700 }}
          editable={editable}
          onCommit={(v) => set('title_primary', v)}
          multiline
        />

        {(rendered.title_secondary || editable) && (
          <EditableText
            value={rendered.title_secondary ?? ''}
            placeholder="서브 타이틀 (선택)"
            className="text-[18px] font-semibold leading-[1.3]"
            style={{ color: palette.accent }}
            editable={editable}
            onCommit={(v) => set('title_secondary', v)}
            multiline
          />
        )}
      </div>

      {/* 하단 — subcopy + CTA */}
      <div className="flex flex-col gap-3">
        {(rendered.subcopy || editable) && (
          <EditableText
            value={rendered.subcopy ?? ''}
            placeholder={isFirst ? '후킹 문구 · 이어질 카드에 기대감' : '요약 문구'}
            className="text-[13px] leading-[1.55]"
            style={{ color: palette.muted }}
            editable={editable}
            onCommit={(v) => set('subcopy', v)}
            multiline
          />
        )}

        {(rendered.cta || editable) && (
          <div className="flex items-center gap-2">
            <div
              className="w-[18px] h-[1px]"
              style={{ background: palette.accent }}
              aria-hidden="true"
            />
            <EditableText
              value={rendered.cta ?? ''}
              placeholder={isLast ? '다음 콘텐츠 예고 · CTA →' : 'CTA (선택)'}
              className="text-[12px] font-bold tracking-[0.1em]"
              style={{ color: palette.accent }}
              editable={editable}
              onCommit={(v) => set('cta', v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

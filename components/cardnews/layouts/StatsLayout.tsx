'use client';

import type { CardRendered } from '@/lib/cardnews/constants';
import EditableText from '../EditableText';
import type { LayoutProps } from '../CardLayoutRenderer';

function valueStyle(value: string): { fontSize: number; lineHeight: number } {
  const len = value.trim().length;
  if (len === 0) return { fontSize: 96, lineHeight: 1.0 };
  if (len <= 3) return { fontSize: 108, lineHeight: 1.0 }; // 73%, 10x
  if (len <= 5) return { fontSize: 88, lineHeight: 1.05 }; // 3,200
  if (len <= 8) return { fontSize: 64, lineHeight: 1.15 }; // 3,200명, Top 3
  if (len <= 12) return { fontSize: 46, lineHeight: 1.25 }; // Agentic AI
  if (len <= 20) return { fontSize: 32, lineHeight: 1.35 };
  return { fontSize: 24, lineHeight: 1.4 };
}

export default function StatsLayout({
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

  const value = rendered.stat_value ?? '';
  const vs = valueStyle(value);

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

      <div className="flex-1 flex flex-col justify-center">
        <EditableText
          value={rendered.stat_label ?? ''}
          placeholder="⚡ 라벨 (선택)"
          className="text-[11px] font-semibold tracking-[0.15em] uppercase mb-3"
          style={{ color: palette.accent }}
          editable={editable}
          onCommit={(v) => set('stat_label', v)}
        />

        <EditableText
          value={value}
          placeholder="73%"
          className="font-bold tracking-[-0.03em] mb-5 break-keep"
          style={{
            color: palette.fg,
            fontSize: `${vs.fontSize}px`,
            lineHeight: vs.lineHeight,
          }}
          editable={editable}
          onCommit={(v) => set('stat_value', v)}
          multiline
        />

        <EditableText
          value={rendered.stat_context ?? ''}
          placeholder="숫자를 설명하는 한두 줄 문장"
          className="text-[15px] font-medium leading-[1.4] max-w-[94%]"
          style={{ color: palette.muted }}
          editable={editable}
          onCommit={(v) => set('stat_context', v)}
          multiline
        />
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-[14px] h-[1px]"
          style={{ background: palette.accentDim }}
          aria-hidden="true"
        />
        <EditableText
          value={rendered.stat_source ?? ''}
          placeholder="출처·맥락 (선택)"
          className="text-[11px]"
          style={{ color: palette.subtle }}
          editable={editable}
          onCommit={(v) => set('stat_source', v)}
        />
      </div>
    </div>
  );
}

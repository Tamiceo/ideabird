'use client';

import type { CardRendered } from '@/lib/cardnews/constants';
import { BOX_MIN, BOX_MAX } from '@/lib/cardnews/constants';
import EditableText from '../EditableText';
import type { LayoutProps } from '../CardLayoutRenderer';

export default function BoxGridLayout({ rendered, palette, meta, editable, onChange }: LayoutProps) {
  const boxes = rendered.boxes ?? [];
  const orderLabel = String(meta.order + 1).padStart(2, '0');
  const totalLabel = String(meta.total).padStart(2, '0');

  const set = <K extends keyof CardRendered>(k: K, v: CardRendered[K]) =>
    onChange?.({ ...rendered, [k]: v });

  const setBox = (idx: number, patch: Partial<(typeof boxes)[number]>) => {
    const next = boxes.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    onChange?.({ ...rendered, boxes: next });
  };

  const removeBox = (idx: number) => {
    if (boxes.length <= BOX_MIN) return;
    onChange?.({ ...rendered, boxes: boxes.filter((_, i) => i !== idx) });
  };

  const addBox = () => {
    if (boxes.length >= BOX_MAX) return;
    onChange?.({
      ...rendered,
      boxes: [...boxes, { label: '', title: '', description: '' }],
    });
  };

  return (
    <div className="absolute inset-0 flex flex-col p-[26px]">
      <div className="flex items-start justify-between mb-3">
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

      {(rendered.category_tag || editable) && (
        <EditableText
          value={rendered.category_tag ?? ''}
          placeholder="⚡ 카테고리 태그"
          className="inline-flex text-[12px] font-semibold mb-2"
          style={{ color: palette.accent }}
          editable={editable}
          onCommit={(v) => set('category_tag', v)}
        />
      )}

      <EditableText
        value={rendered.title_primary ?? ''}
        placeholder="메인 타이틀"
        className="text-[26px] font-bold leading-[1.2] mb-3"
        editable={editable}
        onCommit={(v) => set('title_primary', v)}
        multiline
      />

      <div className="space-y-2 flex-1 min-h-0">
        {boxes.map((box, idx) => (
          <div
            key={idx}
            className="relative rounded-xl p-3 group"
            style={{ background: palette.boxBg, border: `1px solid ${palette.boxBorder}` }}
          >
            {editable && boxes.length > BOX_MIN && (
              <button
                type="button"
                onClick={() => removeBox(idx)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] leading-none hidden group-hover:flex items-center justify-center border-2"
                style={{ borderColor: palette.card }}
                aria-label="박스 삭제"
              >
                ×
              </button>
            )}
            <EditableText
              value={box.label}
              placeholder="01"
              className="text-[10px] font-semibold tracking-wider"
              style={{ color: palette.accent }}
              editable={editable}
              onCommit={(v) => setBox(idx, { label: v })}
            />
            <EditableText
              value={box.title}
              placeholder="박스 제목"
              className="text-[13px] font-semibold mt-0.5"
              editable={editable}
              onCommit={(v) => setBox(idx, { title: v })}
            />
            <EditableText
              value={box.description}
              placeholder="간단한 설명"
              className="text-[11px]"
              style={{ color: palette.subtle }}
              editable={editable}
              onCommit={(v) => setBox(idx, { description: v })}
              multiline
            />
          </div>
        ))}

        {editable && boxes.length < BOX_MAX && (
          <button
            type="button"
            onClick={addBox}
            className="w-full py-2 text-[11px] rounded-xl border border-dashed transition-colors"
            style={{ borderColor: palette.boxBorder, color: palette.subtle }}
          >
            + 박스 추가
          </button>
        )}
      </div>

      {(rendered.highlight || editable) && (
        <div
          className="mt-3 rounded-xl p-3 flex gap-2 items-start"
          style={{ background: palette.boxBg, border: `1px solid ${palette.boxBorder}` }}
        >
          <span className="text-sm shrink-0">💡</span>
          <EditableText
            value={rendered.highlight ?? ''}
            placeholder="핵심 인사이트 한 줄"
            className="text-[12px] font-semibold leading-snug flex-1"
            style={{ color: palette.accent }}
            editable={editable}
            onCommit={(v) => set('highlight', v)}
            multiline
          />
        </div>
      )}
    </div>
  );
}

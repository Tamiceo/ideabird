'use client';

import type { CardRendered } from '@/lib/cardnews/constants';
import { BULLET_MIN, BULLET_MAX } from '@/lib/cardnews/constants';
import EditableText from '../EditableText';
import type { LayoutProps } from '../CardLayoutRenderer';

export default function BulletListLayout({
  rendered,
  palette,
  meta,
  editable,
  onChange,
}: LayoutProps) {
  const bullets = rendered.bullets ?? [];
  const orderLabel = String(meta.order + 1).padStart(2, '0');
  const totalLabel = String(meta.total).padStart(2, '0');

  const set = <K extends keyof CardRendered>(k: K, v: CardRendered[K]) =>
    onChange?.({ ...rendered, [k]: v });

  const setBullet = (idx: number, patch: Partial<(typeof bullets)[number]>) => {
    const next = bullets.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    onChange?.({ ...rendered, bullets: next });
  };

  const removeBullet = (idx: number) => {
    if (bullets.length <= BULLET_MIN) return;
    onChange?.({ ...rendered, bullets: bullets.filter((_, i) => i !== idx) });
  };

  const addBullet = () => {
    if (bullets.length >= BULLET_MAX) return;
    onChange?.({ ...rendered, bullets: [...bullets, { icon: '', text: '' }] });
  };

  return (
    <div className="absolute inset-0 flex flex-col p-[42px]">
      <div className="flex items-start justify-between mb-5">
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
          placeholder="⚡ 카테고리 태그 (선택)"
          className="inline-flex text-[11px] font-semibold tracking-[0.15em] uppercase mb-2"
          style={{ color: palette.accent }}
          editable={editable}
          onCommit={(v) => set('category_tag', v)}
        />
      )}

      <EditableText
        value={rendered.title_primary ?? ''}
        placeholder="메인 타이틀"
        className="text-[28px] font-bold leading-[1.25] tracking-[-0.01em] mb-5"
        style={{ color: palette.fg }}
        editable={editable}
        onCommit={(v) => set('title_primary', v)}
        multiline
      />

      <div
        className="h-[1px] mb-4"
        style={{ background: palette.boxBorder }}
        aria-hidden="true"
      />

      <div
        className={`flex-1 min-h-0 flex flex-col gap-[14px] ${
          bullets.length <= 3 ? 'justify-center' : 'justify-start'
        }`}
      >
        {bullets.map((bullet, idx) => {
          const indexLabel = String(idx + 1).padStart(2, '0');
          return (
            <div key={idx} className="relative flex items-start gap-3 group">
              {editable && bullets.length > BULLET_MIN && (
                <button
                  type="button"
                  onClick={() => removeBullet(idx)}
                  className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] leading-none hidden group-hover:flex items-center justify-center"
                  aria-label="불릿 삭제"
                >
                  ×
                </button>
              )}
              <div
                className="shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center"
                style={{
                  background: palette.boxBg,
                  border: `1px solid ${palette.boxBorder}`,
                }}
              >
                <EditableText
                  value={bullet.icon && bullet.icon !== '•' ? bullet.icon : indexLabel}
                  placeholder={indexLabel}
                  className="text-[11px] font-bold leading-none"
                  style={{ color: palette.accent }}
                  editable={editable}
                  onCommit={(v) => setBullet(idx, { icon: v })}
                />
              </div>
              <EditableText
                value={bullet.text}
                placeholder="불릿 텍스트"
                className="text-[14px] font-medium leading-[1.45] flex-1 pt-[2px]"
                style={{ color: palette.fg }}
                editable={editable}
                onCommit={(v) => setBullet(idx, { text: v })}
                multiline
              />
            </div>
          );
        })}

        {editable && bullets.length < BULLET_MAX && (
          <button
            type="button"
            onClick={addBullet}
            className="w-full py-[10px] text-[11px] rounded-xl border border-dashed transition-colors mt-auto"
            style={{ borderColor: palette.boxBorder, color: palette.subtle }}
          >
            + 불릿 추가
          </button>
        )}
      </div>
    </div>
  );
}

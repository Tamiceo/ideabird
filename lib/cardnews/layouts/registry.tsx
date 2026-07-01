import type { ComponentType } from 'react';
import type { LayoutKey } from '../constants';
import type { LayoutProps } from '@/components/cardnews/CardLayoutRenderer';

import BulletListLayout from '@/components/cardnews/layouts/BulletListLayout';
import QuoteLayout from '@/components/cardnews/layouts/QuoteLayout';
import StatsLayout from '@/components/cardnews/layouts/StatsLayout';
import BoxGridLayout from '@/components/cardnews/layouts/BoxGridLayout';
import HeadlineOverlayLayout from '@/components/cardnews/layouts/HeadlineOverlayLayout';

export interface LayoutMeta {
  key: LayoutKey;
  label: string;
  shortDescription: string;
  suggestedFor: string;
  component: ComponentType<LayoutProps>;
  promptSpec: string;
  planningHint: string;
  hidden?: boolean;
  deprecated?: boolean;
}

export const LAYOUT_REGISTRY: Record<LayoutKey, LayoutMeta> = {
  'bullet-list': {
    key: 'bullet-list',
    label: 'Bullet-List',
    shortDescription: '긴 목록·팁·체크리스트',
    suggestedFor: '팁 모음, 체크리스트, 원칙 나열',
    component: BulletListLayout,
    promptSpec: `role="content", layout_key="bullet-list":
{
  "category_tag": "⚡ 이모지 + 카테고리 (선택)",
  "title_primary": "카드 헤드라인 (필수, 20자 이내)",
  "bullets": [
    { "icon": "•", "text": "불릿 텍스트 (50자 이내)" }
  ]  // 2~6개
}`,
    planningHint: '긴 목록·팁·체크리스트·원칙 나열 → "bullet-list"',
  },

  quote: {
    key: 'quote',
    label: 'Quote',
    shortDescription: '핵심 문장·인용',
    suggestedFor: '명언, 저자 인용, 핵심 한 문장 강조',
    component: QuoteLayout,
    promptSpec: `role="content", layout_key="quote":
{
  "quote_text": "한두 문장의 강렬한 핵심 메시지 (필수, 60자 이내)",
  "quote_attribution": "— 저자·역할 또는 출처 (선택)"
}`,
    planningHint: '핵심 한 문장을 강조·인용문 강조 → "quote"',
  },

  stats: {
    key: 'stats',
    label: 'Stats',
    shortDescription: '큰 숫자·데이터 포인트',
    suggestedFor: '통계 강조, %·배수·$ 같은 수치',
    component: StatsLayout,
    promptSpec: `role="content", layout_key="stats":
{
  "stat_label": "⚡ 라벨 (선택, 15자 이내, 예: KEY METRIC, INSIGHT)",
  "stat_value": "큰 숫자·값 (필수, 2~8자 내외, 수치·기호·약어만. 예: 73%, 10x, 3,200명, Top 3). 긴 개념명·문장 금지",
  "stat_context": "숫자 의미를 설명하는 한두 줄 (필수, 40자 이내)",
  "stat_source": "출처 (선택, 예: IdeaBird 내부 조사)"
}`,
    planningHint: '퍼센트·배수·금액·횟수 같은 수치 강조 → "stats"',
  },

  'box-grid': {
    key: 'box-grid',
    label: 'Box-Grid',
    shortDescription: '(구) 병렬 박스 구조',
    suggestedFor: '레거시',
    component: BoxGridLayout,
    promptSpec: `role="content", layout_key="box-grid":
{
  "category_tag": "⚡ 이모지 + 카테고리 (선택)",
  "title_primary": "카드 헤드라인 (필수)",
  "boxes": [
    { "label": "01", "title": "박스 제목", "description": "1줄 설명" }
  ],
  "highlight": "하단 핵심 인사이트 한 줄 (선택)"
}`,
    planningHint: '',
    hidden: true,
    deprecated: true,
  },

  'headline-overlay': {
    key: 'headline-overlay',
    label: 'Headline-Overlay',
    shortDescription: '(구) 강한 단일 메시지',
    suggestedFor: '레거시',
    component: HeadlineOverlayLayout,
    promptSpec: `role="content", layout_key="headline-overlay":
{
  "headline": "한 문장 강렬한 메시지 (필수)",
  "background_style": "gradient" 또는 "pattern"
}`,
    planningHint: '',
    hidden: true,
    deprecated: true,
  },
};

export const VISIBLE_LAYOUTS: LayoutMeta[] = Object.values(LAYOUT_REGISTRY).filter(
  (l) => !l.hidden
);

export const VISIBLE_LAYOUT_KEYS: LayoutKey[] = VISIBLE_LAYOUTS.map((l) => l.key);

export function getLayoutMeta(key: LayoutKey): LayoutMeta {
  return LAYOUT_REGISTRY[key];
}

export function getLayoutComponent(key: LayoutKey): ComponentType<LayoutProps> {
  return LAYOUT_REGISTRY[key].component;
}

/** AI render-prompt 용 — 활성 레이아웃의 필드 스펙 합본 */
export function buildLayoutsPromptSpec(): string {
  return VISIBLE_LAYOUTS.map((l) => l.promptSpec).join('\n\n');
}

/** AI plan-prompt 용 — 활성 레이아웃의 선택 힌트 합본 */
export function buildLayoutsPlanningHints(): string {
  return VISIBLE_LAYOUTS.filter((l) => l.planningHint)
    .map((l) => `- ${l.planningHint}`)
    .join('\n');
}

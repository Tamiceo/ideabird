export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const CARD_ASPECT = '1080/1350';

export const CARD_COUNT_MIN = 3;
export const CARD_COUNT_MAX = 10;
export const CARD_COUNT_DEFAULT = 7;

export const BULLET_MIN = 2;
export const BULLET_MAX = 6;

export const BOX_MIN = 1;
export const BOX_MAX = 3;

export const LAYOUT_KEYS = [
  'bullet-list',
  'quote',
  'stats',
  // 아래 2개는 deprecated — 신규 생성 UI 에서 숨김, 기존 row 호환 위해 타입엔 남김
  'box-grid',
  'headline-overlay',
] as const;
export type LayoutKey = (typeof LAYOUT_KEYS)[number];

export const PALETTE_KEYS = ['dark-neon', 'light-mono', 'brand'] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];
export const PALETTE_DISABLED: PaletteKey[] = ['brand'];

export const STAGE_KEYS = ['sourcing', 'planning', 'rendered', 'published'] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export const STATUS_KEYS = ['draft', 'published'] as const;
export type StatusKey = (typeof STATUS_KEYS)[number];

export const ROLE_KEYS = ['cover', 'content'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const SOURCE_TEXT_MAX = 3000;

export const AI_PLAN_COST = '약 $0.02';
export const AI_PLAN_TIME = '약 10초';
export const AI_RENDER_COST = '약 $0.03';
export const AI_RENDER_TIME = '약 10초';
export const AI_REGEN_CARD_COST = '약 $0.005';
export const AI_REGEN_CARD_TIME = '약 3초';

export const LAYOUT_LABEL: Record<LayoutKey, string> = {
  'bullet-list': 'Bullet-List',
  quote: 'Quote',
  stats: 'Stats',
  'box-grid': 'Box-Grid (deprecated)',
  'headline-overlay': 'Headline-Overlay (deprecated)',
};

export const PALETTE_LABEL: Record<PaletteKey, string> = {
  'dark-neon': 'Dark + Neon',
  'light-mono': 'Light Mono',
  brand: 'Brand (준비 중)',
};

export const STAGE_CTA: Record<StageKey, string> = {
  sourcing: '기획 이어가기',
  planning: '구조·스타일 고르기',
  rendered: '편집 계속',
  published: '다시 보기',
};

export interface CardnewsCard {
  order: number;
  role: RoleKey;
  message: string;
  rendered?: CardRendered;
}

export interface CardRendered {
  // cover
  title_primary?: string;
  title_secondary?: string;
  subcopy?: string;
  cta?: string;
  category_tag?: string;

  // bullet-list
  bullets?: Array<{ icon?: string; text: string }>;

  // quote
  quote_text?: string;
  quote_attribution?: string;

  // stats
  stat_value?: string;
  stat_label?: string;
  stat_context?: string;
  stat_source?: string;

  // legacy (box-grid · headline-overlay) - 기존 row 호환 유지
  boxes?: Array<{ label: string; title: string; description: string }>;
  highlight?: string;
  headline?: string;
  background_style?: 'gradient' | 'pattern';
}

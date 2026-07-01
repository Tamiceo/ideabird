import type { CSSProperties } from 'react';
import type { PaletteKey } from './constants';

export interface PaletteTokens {
  key: PaletteKey;
  label: string;
  disabled?: boolean;
  bg: string;
  card: string;
  fg: string;
  muted: string;
  subtle: string;
  accent: string;
  accentDim: string;
  boxBg: string;
  boxBorder: string;
}

export const PALETTES: Record<PaletteKey, PaletteTokens> = {
  'dark-neon': {
    key: 'dark-neon',
    label: 'Dark + Neon',
    bg: 'linear-gradient(180deg, #0E1116 0%, #0A0D12 100%)',
    card: '#0A0D12',
    fg: '#E8ECEF',
    muted: '#9CA3AF',
    subtle: '#5C6270',
    accent: '#B9FF66',
    accentDim: '#7AA84A',
    boxBg: '#161A22',
    boxBorder: '#22262F',
  },
  'light-mono': {
    key: 'light-mono',
    label: 'Light Mono',
    bg: 'linear-gradient(180deg, #FAF8F3 0%, #F3EFE7 100%)',
    card: '#FFFFFF',
    fg: '#1A1816',
    muted: '#5A544E',
    subtle: '#9A938B',
    accent: '#111110',
    accentDim: '#6B6660',
    boxBg: '#F3EFE7',
    boxBorder: '#DDD9D2',
  },
  brand: {
    key: 'brand',
    label: 'Brand (준비 중)',
    disabled: true,
    bg: '#FFFFFF',
    card: '#FFFFFF',
    fg: '#111110',
    muted: '#4A4642',
    subtle: '#8A8480',
    accent: '#111110',
    accentDim: '#6B6660',
    boxBg: '#F8F7F4',
    boxBorder: '#DDD9D2',
  },
};

export const getPalette = (key: PaletteKey): PaletteTokens => PALETTES[key];

export const paletteToCssVars = (key: PaletteKey): CSSProperties => {
  const p = PALETTES[key];
  return {
    '--cn-bg': p.bg,
    '--cn-card': p.card,
    '--cn-fg': p.fg,
    '--cn-muted': p.muted,
    '--cn-subtle': p.subtle,
    '--cn-accent': p.accent,
    '--cn-accent-dim': p.accentDim,
    '--cn-box-bg': p.boxBg,
    '--cn-box-border': p.boxBorder,
  } as CSSProperties;
};

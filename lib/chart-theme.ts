import type { CSSProperties } from 'react';

/** Paleta e estilos compartilhados pelos gráficos (tema preto e dourado). */

export const goldPalette = ['#d4af37', '#e9cb6d', '#b8912a', '#f2e0a0', '#936e23', '#dcb648', '#674b24', '#faf0cf'];

export const positiveColor = '#d4af37';
export const negativeColor = '#f43f5e';
export const neutralColor = '#8a8a8a';

export const chartTooltipStyle: CSSProperties = {
  background: '#0b0a07',
  border: '1px solid rgba(212,175,55,0.35)',
  borderRadius: 12,
  color: '#f6f1e4',
  fontSize: 12,
};

export const chartGrid = 'rgba(212,175,55,0.12)';
export const chartAxis = '#8a8a8a';

/** Rótulo curto para eixos de valor: 1.2k, 128k, 1.4M. */
export function compactTick(value: unknown): string {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '';
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (Math.abs(number) >= 1_000) return `${Math.round(number / 1_000)}k`;
  return String(number);
}

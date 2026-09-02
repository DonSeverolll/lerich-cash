import type { CSSProperties } from 'react';

import type { Tema } from '@/components/theme/theme-provider';

/**
 * Cores dos gráficos por tema. O Recharts recebe valores resolvidos, não
 * variáveis CSS — passar `var(...)` em atributos SVG não é confiável —, então
 * as paletas ficam declaradas aqui e o componente escolhe pelo tema atual.
 */

export interface PaletaGrafico {
  serie: string[];
  positivo: string;
  negativo: string;
  eixo: string;
  grade: string;
  cursor: string;
  tooltip: CSSProperties;
}

const ESCURO: PaletaGrafico = {
  serie: ['#d4af37', '#e9cb6d', '#b8912a', '#f2e0a0', '#936e23', '#dcb648', '#674b24', '#faf0cf'],
  positivo: '#d4af37',
  negativo: '#f43f5e',
  eixo: '#8a8a8a',
  grade: 'rgba(212,175,55,0.12)',
  cursor: 'rgba(212,175,55,0.06)',
  tooltip: {
    background: '#0b0a07',
    border: '1px solid rgba(212,175,55,0.35)',
    borderRadius: 12,
    color: '#f6f1e4',
    fontSize: 12,
  },
};

const CLARO: PaletaGrafico = {
  serie: ['#4a535e', '#77828f', '#2f363f', '#9aa4b0', '#5f6a77', '#8b95a2', '#3c444e', '#b6bec8'],
  positivo: '#4a535e',
  negativo: '#c0392f',
  eixo: '#6b7480',
  grade: 'rgba(74,83,94,0.14)',
  cursor: 'rgba(74,83,94,0.07)',
  tooltip: {
    background: '#ffffff',
    border: '1px solid rgba(74,83,94,0.28)',
    borderRadius: 12,
    color: '#161a20',
    fontSize: 12,
  },
};

export function paletaGrafico(tema: Tema): PaletaGrafico {
  return tema === 'claro' ? CLARO : ESCURO;
}

/** Rótulo curto para eixos de valor: 1.2k, 128k, 1.4M. */
export function compactTick(value: unknown): string {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '';
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (Math.abs(number) >= 1_000) return `${Math.round(number / 1_000)}k`;
  return String(number);
}

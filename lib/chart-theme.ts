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
  /** Legendas precisam de mais contraste que os rótulos dos eixos. */
  legenda: string;
  grade: string;
  cursor: string;
  tooltip: CSSProperties;
}

const ESCURO: PaletaGrafico = {
  // Tons alternados de claro e escuro para que fatias vizinhas se distingam.
  // Todos passam de 3:1 contra o fundo do tema — o mínimo para elemento gráfico.
  serie: ['#e9cb6d', '#8f6f1f', '#f2e0a0', '#b8912a', '#dcb648', '#8a6733', '#faf0cf', '#a07d24'],
  positivo: '#d4af37',
  negativo: '#d6304c',
  eixo: '#9a9a9a',
  legenda: '#d1d1d1',
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
  // Mesma regra do tema escuro: nenhum tom abaixo de 3:1 sobre o fundo claro.
  serie: ['#2b323b', '#868f9c', '#3c444e', '#7d8794', '#4a535e', '#838d9a', '#5f6a77', '#6e7885'],
  positivo: '#4a535e',
  negativo: '#be123c',
  eixo: '#5f6a77',
  legenda: '#333c47',
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

/**
 * Cor de uma categoria no gráfico. A cor gravada no banco é fixa (dourada) e
 * não acompanharia o tema claro, então a exibição usa a paleta pela posição —
 * o que também garante contraste entre fatias vizinhas.
 */
export function corDeCategoria(indice: number, paleta: PaletaGrafico): string {
  return paleta.serie[indice % paleta.serie.length];
}

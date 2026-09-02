/**
 * Escala de prioridade das contas, do amarelo ao vermelho.
 *
 * A cor deixa de ser uma escolha estética e passa a significar algo: quanto
 * mais quente, mais a conta exige atenção. Os tons foram escolhidos para
 * manter contraste sobre o fundo preto e para a diferença entre níveis
 * vizinhos ser perceptível.
 */

export interface Prioridade {
  nivel: number;
  nome: string;
  cor: string;
  descricao: string;
}

export const PRIORIDADES: Prioridade[] = [
  { nivel: 1, nome: 'Baixa', cor: '#f2d24c', descricao: 'Reserva, sem uso frequente' },
  { nivel: 2, nome: 'Moderada', cor: '#efac34', descricao: 'Movimento ocasional' },
  { nivel: 3, nome: 'Média', cor: '#e8823a', descricao: 'Uso recorrente' },
  { nivel: 4, nome: 'Alta', cor: '#dd5a35', descricao: 'Concentra as despesas do mês' },
  { nivel: 5, nome: 'Crítica', cor: '#c33a35', descricao: 'Exige acompanhamento diário' },
];

export const PRIORIDADE_PADRAO = PRIORIDADES[2];

/** Descobre o nível a partir da cor gravada; contas antigas caem no padrão. */
export function prioridadeDaCor(cor: string | undefined): Prioridade {
  const alvo = (cor ?? '').toLowerCase();
  return PRIORIDADES.find((item) => item.cor.toLowerCase() === alvo) ?? PRIORIDADE_PADRAO;
}

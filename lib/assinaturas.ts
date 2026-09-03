import type { Subscription } from '@/types';

/**
 * Situação de um plano recorrente. Um plano pausado não cobra; um plano com
 * prazo vencido também não — e a diferença importa, porque o encerrado não
 * volta sozinho ao reativar.
 */
export type SituacaoAssinatura = 'ATIVA' | 'PAUSADA' | 'ENCERRADA';

/** Chave `AAAA-MM` do mês de uma data. */
export function competencia(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

export function situacaoDaAssinatura(
  assinatura: Subscription,
  referencia = new Date(),
): SituacaoAssinatura {
  if (assinatura.vigente_ate && competencia(referencia) > assinatura.vigente_ate) return 'ENCERRADA';
  return assinatura.ativo ? 'ATIVA' : 'PAUSADA';
}

/** Só as que realmente cobram no mês de referência entram no comprometimento. */
export function assinaturaCobraNoMes(assinatura: Subscription, referencia = new Date()): boolean {
  return situacaoDaAssinatura(assinatura, referencia) === 'ATIVA';
}

/** `AAAA-MM` -> "mar. de 26", para exibição. */
export function rotuloCompetencia(valor: string): string {
  const [ano, mes] = valor.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(
    new Date(ano, mes - 1, 1),
  );
}

/** Quantos meses ainda restam, contando o mês corrente. */
export function mesesRestantes(assinatura: Subscription, referencia = new Date()): number | null {
  if (!assinatura.vigente_ate) return null;

  const [ano, mes] = assinatura.vigente_ate.split('-').map(Number);
  const fim = new Date(ano, mes - 1, 1);
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
  return meses + 1;
}

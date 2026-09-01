import type { Account, Category, Subscription, Transaction } from '@/types';

/**
 * Dados de demonstração.
 *
 * As transações são geradas de forma determinística a partir do mês corrente,
 * então o painel sempre mostra os últimos 6 meses — sem datas congeladas em
 * 2025. O gerador usa um LCG com semente fixa: o mesmo dia produz sempre o
 * mesmo resultado no servidor e no cliente (sem divergência de hidratação).
 */

export const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    user_id: 'user-1',
    nome: 'NuBank',
    tipo: 'CORRENTE',
    saldo_inicial: 4200,
    cor_hex: '#d4af37',
    created_at: '2025-01-10T00:00:00.000Z',
  },
  {
    id: 'acc-2',
    user_id: 'user-1',
    nome: 'Itaú',
    tipo: 'POUPANCA',
    saldo_inicial: 18000,
    cor_hex: '#e9cb6d',
    created_at: '2025-01-10T00:00:00.000Z',
  },
  {
    id: 'acc-3',
    user_id: 'user-1',
    nome: 'XP Investimentos',
    tipo: 'INVESTIMENTO',
    saldo_inicial: 54000,
    cor_hex: '#b8912a',
    created_at: '2025-01-15T00:00:00.000Z',
  },
  {
    id: 'acc-4',
    user_id: 'user-1',
    nome: 'Carteira',
    tipo: 'CARTEIRA',
    saldo_inicial: 980,
    cor_hex: '#f2e0a0',
    created_at: '2025-01-18T00:00:00.000Z',
  },
];

export const mockCategories: Category[] = [
  { id: 'cat-1', user_id: 'user-1', nome: 'Salário', tipo: 'RECEITA', cor_hex: '#d4af37', icone: 'wallet' },
  { id: 'cat-2', user_id: 'user-1', nome: 'Freelance', tipo: 'RECEITA', cor_hex: '#e9cb6d', icone: 'briefcase' },
  { id: 'cat-3', user_id: 'user-1', nome: 'Alimentação', tipo: 'DESPESA', cor_hex: '#b8912a', icone: 'utensils' },
  { id: 'cat-4', user_id: 'user-1', nome: 'Casa', tipo: 'DESPESA', cor_hex: '#936e23', icone: 'home' },
  { id: 'cat-5', user_id: 'user-1', nome: 'Transporte', tipo: 'DESPESA', cor_hex: '#dcb648', icone: 'car' },
  { id: 'cat-6', user_id: 'user-1', nome: 'Assinaturas', tipo: 'DESPESA', cor_hex: '#f2e0a0', icone: 'badge' },
  { id: 'cat-7', user_id: 'user-1', nome: 'Educação', tipo: 'DESPESA', cor_hex: '#674b24', icone: 'book' },
  { id: 'cat-8', user_id: 'user-1', nome: 'Lazer', tipo: 'DESPESA', cor_hex: '#faf0cf', icone: 'sparkles' },
];

export const mockSubscriptions: Subscription[] = [
  {
    id: 'sub-1',
    user_id: 'user-1',
    conta_id: 'acc-1',
    categoria_id: 'cat-6',
    nome_servico: 'Netflix',
    valor: 39.9,
    dia_vencimento: 10,
    ativo: true,
    created_at: '2025-02-01T00:00:00.000Z',
  },
  {
    id: 'sub-2',
    user_id: 'user-1',
    conta_id: 'acc-1',
    categoria_id: 'cat-6',
    nome_servico: 'Spotify',
    valor: 24.9,
    dia_vencimento: 12,
    ativo: true,
    created_at: '2025-02-02T00:00:00.000Z',
  },
  {
    id: 'sub-3',
    user_id: 'user-1',
    conta_id: 'acc-2',
    categoria_id: 'cat-7',
    nome_servico: 'Faculdade',
    valor: 850,
    dia_vencimento: 5,
    ativo: true,
    created_at: '2025-02-03T00:00:00.000Z',
  },
  {
    id: 'sub-4',
    user_id: 'user-1',
    conta_id: 'acc-1',
    categoria_id: 'cat-6',
    nome_servico: 'Internet',
    valor: 129.9,
    dia_vencimento: 15,
    ativo: true,
    created_at: '2025-02-04T00:00:00.000Z',
  },
  {
    id: 'sub-5',
    user_id: 'user-1',
    conta_id: 'acc-3',
    categoria_id: 'cat-8',
    nome_servico: 'Academia',
    valor: 119.9,
    dia_vencimento: 20,
    ativo: false,
    created_at: '2025-03-04T00:00:00.000Z',
  },
];

/** Gerador congruente linear — determinístico e sem dependências. */
function lcg(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

interface Template {
  categoria_id: string;
  descricao: string;
  base: number;
  variacao: number;
  dia: number;
  conta_id: string;
  tipo: 'RECEITA' | 'DESPESA';
  assinatura_id?: string;
}

const templates: Template[] = [
  { categoria_id: 'cat-1', descricao: 'Salário mensal', base: 6800, variacao: 0, dia: 1, conta_id: 'acc-1', tipo: 'RECEITA' },
  { categoria_id: 'cat-2', descricao: 'Projeto freelance', base: 1250, variacao: 900, dia: 17, conta_id: 'acc-2', tipo: 'RECEITA' },
  { categoria_id: 'cat-4', descricao: 'Aluguel', base: 2200, variacao: 0, dia: 5, conta_id: 'acc-1', tipo: 'DESPESA' },
  { categoria_id: 'cat-3', descricao: 'Supermercado', base: 780, variacao: 260, dia: 8, conta_id: 'acc-1', tipo: 'DESPESA' },
  { categoria_id: 'cat-3', descricao: 'Restaurantes', base: 320, variacao: 180, dia: 22, conta_id: 'acc-4', tipo: 'DESPESA' },
  { categoria_id: 'cat-5', descricao: 'Combustível', base: 210, variacao: 120, dia: 7, conta_id: 'acc-2', tipo: 'DESPESA' },
  { categoria_id: 'cat-8', descricao: 'Cinema e jantar', base: 180, variacao: 140, dia: 14, conta_id: 'acc-1', tipo: 'DESPESA' },
  { categoria_id: 'cat-6', descricao: 'Netflix', base: 39.9, variacao: 0, dia: 10, conta_id: 'acc-1', tipo: 'DESPESA', assinatura_id: 'sub-1' },
  { categoria_id: 'cat-6', descricao: 'Spotify', base: 24.9, variacao: 0, dia: 12, conta_id: 'acc-1', tipo: 'DESPESA', assinatura_id: 'sub-2' },
  { categoria_id: 'cat-6', descricao: 'Internet', base: 129.9, variacao: 0, dia: 15, conta_id: 'acc-1', tipo: 'DESPESA', assinatura_id: 'sub-4' },
  { categoria_id: 'cat-7', descricao: 'Mensalidade faculdade', base: 850, variacao: 0, dia: 5, conta_id: 'acc-2', tipo: 'DESPESA', assinatura_id: 'sub-3' },
];

const MONTHS_BACK = 5;

function buildTransactions(reference = new Date()): Transaction[] {
  const random = lcg(20250901);
  const transactions: Transaction[] = [];
  // Fim do dia de referência: lançamentos do próprio dia contam.
  const hoje = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59);

  for (let offset = MONTHS_BACK; offset >= 0; offset -= 1) {
    const cursor = new Date(reference.getFullYear(), reference.getMonth() - offset, 1);
    const ano = cursor.getFullYear();
    const mes = cursor.getMonth();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();

    for (const template of templates) {
      const dia = Math.min(template.dia, ultimoDia);
      const data = new Date(ano, mes, dia, 10, 0, 0);

      // Não inventamos lançamentos no futuro.
      if (data > hoje) continue;

      const ruido = template.variacao ? Math.round((random() - 0.5) * template.variacao) : 0;
      const valor = Math.max(10, Number((template.base + ruido).toFixed(2)));
      const futuroNoMes = data.getTime() > hoje.getTime() - 3 * 24 * 60 * 60 * 1000;

      transactions.push({
        id: `tx-${ano}-${String(mes + 1).padStart(2, '0')}-${template.categoria_id}-${dia}`,
        user_id: 'user-1',
        conta_id: template.conta_id,
        categoria_id: template.categoria_id,
        assinatura_id: template.assinatura_id ?? null,
        descricao: template.descricao,
        valor,
        tipo: template.tipo,
        data_transacao: data.toISOString(),
        status: futuroNoMes && random() > 0.6 ? 'PENDENTE' : 'EFETIVADA',
        created_at: data.toISOString(),
      });
    }
  }

  return transactions.sort((a, b) => b.data_transacao.localeCompare(a.data_transacao));
}

export const mockTransactions: Transaction[] = buildTransactions();

/** Chave `AAAA-MM` das transações, do mês mais recente para o mais antigo. */
export function availableMonths(transactions: Transaction[] = mockTransactions): string[] {
  const keys = new Set(transactions.map((tx) => tx.data_transacao.slice(0, 7)));
  return [...keys].sort((a, b) => b.localeCompare(a));
}

export type AccountType = 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA';
export type CategoryType = 'RECEITA' | 'DESPESA';
export type TransactionType = 'RECEITA' | 'DESPESA';
export type TransactionStatus = 'PENDENTE' | 'EFETIVADA';

export interface Account {
  id: string;
  user_id: string;
  nome: string;
  tipo: AccountType;
  saldo_inicial: number;
  cor_hex: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  nome: string;
  tipo: CategoryType;
  cor_hex: string;
  icone: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  conta_id: string;
  categoria_id: string;
  nome_servico: string;
  valor: number;
  dia_vencimento: number;
  ativo: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  conta_id: string;
  categoria_id: string;
  assinatura_id?: string | null;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  data_transacao: string;
  status: TransactionStatus;
  created_at: string;
}

export interface ImportPreviewItem {
  id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  status: TransactionStatus;
  conta_id?: string;
  categoria_id?: string;
  origem: string;
}

export interface DashboardSummary {
  saldoConsolidado: number;
  receitasMes: number;
  despesasMes: number;
  totalComprometido: number;
}

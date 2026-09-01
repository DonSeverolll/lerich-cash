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

/* ---------- Autenticação, papéis e administração ---------- */

export type UserRole = 'ADMIN' | 'CLIENTE';
export type UserStatus = 'ATIVO' | 'SUSPENSO';
export type UserPlan = 'FREE' | 'PRO' | 'PREMIUM';

export interface AppUser {
  id: string;
  username: string;
  nome: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  plano: UserPlan;
  created_at: string;
  last_login_at: string | null;
}

/** Registro persistido: inclui o hash da senha, nunca exposto ao cliente. */
export interface StoredUser extends AppUser {
  password_hash: string;
}

export interface SessionUser {
  id: string;
  username: string;
  nome: string;
  role: UserRole;
}

export type AuditAction =
  | 'LOGIN_OK'
  | 'LOGIN_FALHA'
  | 'LOGOUT'
  | 'USUARIO_CRIADO'
  | 'USUARIO_ATUALIZADO'
  | 'USUARIO_REMOVIDO'
  | 'SENHA_REDEFINIDA';

export interface AuditLog {
  id: string;
  action: AuditAction;
  actor: string;
  target: string | null;
  detalhe: string;
  created_at: string;
}

export interface AppSettings {
  nomeMarca: string;
  moeda: string;
  permitirCadastroPublico: boolean;
  limiteContasPorCliente: number;
  avisoManutencao: string;
}

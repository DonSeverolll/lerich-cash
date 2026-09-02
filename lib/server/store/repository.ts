import 'server-only';

import type {
  Account,
  AppSettings,
  AuditLog,
  Category,
  PasswordReset,
  StoreDriver,
  StoredUser,
  Subscription,
  Transaction,
} from '@/types';

export type { StoreDriver };

export const defaultSettings: AppSettings = {
  nomeMarca: 'Lerich Finance',
  moeda: 'BRL',
  permitirCadastroPublico: true,
  limiteContasPorCliente: 10,
  avisoManutencao: '',
};

/**
 * Operações primitivas de persistência. Toda a regra de negócio (hash de
 * senha, unicidade, "não fique sem administrador", validade de token) vive na
 * camada acima, em `index.ts` — o repositório só lê e grava documentos.
 *
 * Nenhum método devolve referência viva: quem altera um usuário precisa
 * chamar `saveUser`. Isso mantém o driver de arquivo e o de Firestore com o
 * mesmo contrato.
 */
export interface StoreRepository {
  readonly driver: StoreDriver;

  listUsers(): Promise<StoredUser[]>;
  getUser(id: string): Promise<StoredUser | undefined>;
  findUserByUsername(username: string): Promise<StoredUser | undefined>;
  findUserByEmail(email: string): Promise<StoredUser | undefined>;
  saveUser(user: StoredUser): Promise<void>;
  removeUser(id: string): Promise<void>;

  listAudit(limit: number): Promise<AuditLog[]>;
  appendAudit(log: AuditLog): Promise<void>;

  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  findResetByHash(hash: string): Promise<PasswordReset | undefined>;
  listResetsByUser(userId: string): Promise<PasswordReset[]>;
  saveReset(reset: PasswordReset): Promise<void>;
  purgeResetsBefore(instante: number): Promise<void>;

  /* ----- Dados financeiros, sempre por cliente ----- */

  listAccounts(userId: string): Promise<Account[]>;
  saveAccount(account: Account): Promise<void>;
  removeAccount(id: string): Promise<void>;

  listCategories(userId: string): Promise<Category[]>;
  saveCategory(category: Category): Promise<void>;
  removeCategory(id: string): Promise<void>;

  listSubscriptions(userId: string): Promise<Subscription[]>;
  saveSubscription(subscription: Subscription): Promise<void>;
  removeSubscription(id: string): Promise<void>;

  listTransactions(userId: string): Promise<Transaction[]>;
  saveTransaction(transaction: Transaction): Promise<void>;
  /** Grava vários de uma vez — usado na importação de extrato. */
  saveTransactions(transactions: Transaction[]): Promise<void>;
  removeTransaction(id: string): Promise<void>;

  /** Agregados do painel administrativo, somando todos os clientes. */
  listAllAccounts(): Promise<Account[]>;
  listAllTransactions(): Promise<Transaction[]>;
  listAllSubscriptions(): Promise<Subscription[]>;

  /** Apaga tudo de um cliente — usado ao remover a conta dele. */
  removeFinanceDataOfUser(userId: string): Promise<void>;

  /** `false` quando a gravação parou de funcionar (ex.: disco somente leitura). */
  gravacaoDisponivel(): boolean;
}

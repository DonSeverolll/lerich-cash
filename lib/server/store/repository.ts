import 'server-only';

import type { AppSettings, AuditLog, PasswordReset, StoreDriver, StoredUser } from '@/types';

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

  /** `false` quando a gravação parou de funcionar (ex.: disco somente leitura). */
  gravacaoDisponivel(): boolean;
}

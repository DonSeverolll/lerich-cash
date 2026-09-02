/**
 * Store de usuários, auditoria e configurações.
 *
 * Esta camada concentra as regras de negócio; onde os dados ficam é decidido
 * pelo ambiente: havendo credencial do Firebase, usa Firestore; caso
 * contrário, cai no arquivo local `.data/store.json`. A API pública é a mesma
 * nos dois casos, então nada acima daqui muda.
 */
import 'server-only';

import type {
  AppSettings,
  AppUser,
  AuditAction,
  AuditLog,
  PasswordReset,
  StoredUser,
  UserPlan,
  UserRole,
  UserStatus,
} from '@/types';

import { hashPassword, hashToken, randomId, verifyPassword } from '@/lib/auth/crypto';

import { createFileRepository } from './file-repository';
import { createFirestoreRepository, lerCredenciaisFirebase } from './firestore-repository';
import type { StoreDriver, StoreRepository } from './repository';

export type { StoreDriver } from './repository';

/* ---------- Escolha do driver ---------- */

let repositorio: StoreRepository | null = null;

function repo(): StoreRepository {
  if (repositorio) return repositorio;

  const credenciais = lerCredenciaisFirebase();

  if (credenciais) {
    try {
      repositorio = createFirestoreRepository(credenciais);
      return repositorio;
    } catch (causa) {
      // Credencial presente mas inválida: avisamos alto e seguimos em arquivo,
      // para o site não ficar fora do ar por erro de configuração.
      console.error('[lerich-finance] Falha ao conectar no Firestore, usando arquivo local:', causa);
    }
  }

  repositorio = createFileRepository();
  return repositorio;
}

export function storeDriver(): StoreDriver {
  return repo().driver;
}

export function isPersistenceAvailable(): boolean {
  return repo().gravacaoDisponivel();
}

/* ---------- Seed ---------- */
/**
 * Nenhuma credencial fica no código: o administrador inicial só é criado se
 * ADMIN_USERNAME e ADMIN_PASSWORD estiverem no ambiente. Sem elas, o sistema
 * sobe sem administrador — falha fechada, em vez de expor um acesso padrão.
 *
 * Os ids são fixos para que duas instâncias subindo ao mesmo tempo gravem o
 * mesmo documento em vez de criarem administradores duplicados.
 */

const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME?.trim() || 'Administrador';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || 'admin@lerichfinance.app';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

let seeding: Promise<void> | null = null;

async function seed() {
  const usuarios = await repo().listUsers();
  const semAdmin = !usuarios.some((user) => user.role === 'ADMIN');

  if (semAdmin && ADMIN_USERNAME && ADMIN_PASSWORD) {
    await repo().saveUser({
      id: 'seed-admin',
      username: ADMIN_USERNAME,
      nome: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      status: 'ATIVO',
      plano: 'PREMIUM',
      created_at: new Date().toISOString(),
      last_login_at: null,
      password_hash: await hashPassword(ADMIN_PASSWORD),
    });
  } else if (semAdmin) {
    console.warn(
      '[lerich-finance] Nenhum administrador cadastrado. Defina ADMIN_USERNAME e ADMIN_PASSWORD para criar o primeiro acesso.',
    );
  }

  if (!usuarios.length && DEMO_PASSWORD) {
    await repo().saveUser({
      id: 'seed-cliente-demo',
      username: 'cliente.demo',
      nome: 'Cliente Demonstração',
      email: 'cliente@lerichfinance.app',
      role: 'CLIENTE',
      status: 'ATIVO',
      plano: 'PRO',
      created_at: new Date().toISOString(),
      last_login_at: null,
      password_hash: await hashPassword(DEMO_PASSWORD),
    });
  }
}

async function ready(): Promise<StoreRepository> {
  seeding ??= seed().catch((causa) => {
    // Um seed que falha não pode derrubar todas as requisições seguintes.
    console.error('[lerich-finance] Falha ao preparar o store:', causa);
    seeding = null;
  });
  await seeding;
  return repo();
}

/* ---------- Leitura ---------- */

/** Projeta apenas os campos seguros — o hash da senha nunca sai daqui. */
export function toPublicUser(user: StoredUser): AppUser {
  return {
    id: user.id,
    username: user.username,
    nome: user.nome,
    email: user.email,
    role: user.role,
    status: user.status,
    plano: user.plano,
    created_at: user.created_at,
    last_login_at: user.last_login_at,
  };
}

export async function listUsers(): Promise<AppUser[]> {
  const usuarios = await (await ready()).listUsers();
  return usuarios.sort((a, b) => a.created_at.localeCompare(b.created_at)).map(toPublicUser);
}

export async function findUserById(id: string): Promise<StoredUser | undefined> {
  return (await ready()).getUser(id);
}

/** Busca por nome de usuário OU e-mail, ambos sem diferenciar maiúsculas. */
export async function findUserByIdentifier(identifier: string): Promise<StoredUser | undefined> {
  const alvo = identifier.trim().toLowerCase();
  if (!alvo) return undefined;

  const store = await ready();
  return (await store.findUserByUsername(alvo)) ?? (await store.findUserByEmail(alvo));
}

export async function getSettings(): Promise<AppSettings> {
  return (await ready()).getSettings();
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const store = await ready();
  const atual = await store.getSettings();
  const novo = { ...atual, ...patch };
  await store.saveSettings(novo);
  return novo;
}

/* ---------- Autenticação ---------- */

export type AuthResult = { ok: true; user: AppUser } | { ok: false; reason: 'CREDENCIAIS' | 'SUSPENSO' };

export async function authenticate(username: string, password: string): Promise<AuthResult> {
  const store = await ready();
  const user = await store.findUserByUsername(username);

  // Compara mesmo sem usuário encontrado, mantendo o custo constante.
  const hash = user?.password_hash ?? (await hashPassword(randomId(12)));
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) return { ok: false, reason: 'CREDENCIAIS' };
  if (user.status === 'SUSPENSO') return { ok: false, reason: 'SUSPENSO' };

  await store.saveUser({ ...user, last_login_at: new Date().toISOString() });
  return { ok: true, user: toPublicUser(user) };
}

/* ---------- Escrita de usuários ---------- */

export interface CreateUserInput {
  username: string;
  nome: string;
  email: string;
  password: string;
  role?: UserRole;
  plano?: UserPlan;
}

export async function createUser(input: CreateUserInput): Promise<AppUser> {
  const store = await ready();
  const username = input.username.trim();

  // Verificação-e-gravação sem transação: em teoria dois cadastros simultâneos
  // com o mesmo usuário poderiam passar. Aceitável no volume deste sistema.
  if (await store.findUserByUsername(username)) {
    throw new Error('Este usuário já existe.');
  }

  const user: StoredUser = {
    id: randomId(8),
    username,
    nome: input.nome.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role ?? 'CLIENTE',
    status: 'ATIVO',
    plano: input.plano ?? 'FREE',
    created_at: new Date().toISOString(),
    last_login_at: null,
    password_hash: await hashPassword(input.password),
  };

  await store.saveUser(user);
  return toPublicUser(user);
}

export interface UpdateUserInput {
  nome?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  plano?: UserPlan;
  password?: string;
}

export async function updateUser(id: string, patch: UpdateUserInput): Promise<AppUser> {
  const store = await ready();
  const user = await store.getUser(id);
  if (!user) throw new Error('Usuário não encontrado.');

  const perderiaAdmin =
    user.role === 'ADMIN' &&
    ((patch.role !== undefined && patch.role !== 'ADMIN') || patch.status === 'SUSPENSO');

  if (perderiaAdmin) {
    const usuarios = await store.listUsers();
    const adminsAtivos = usuarios.filter((item) => item.role === 'ADMIN' && item.status === 'ATIVO');
    if (adminsAtivos.length <= 1) throw new Error('É necessário manter ao menos um administrador ativo.');
  }

  const atualizado: StoredUser = {
    ...user,
    nome: patch.nome !== undefined ? patch.nome.trim() : user.nome,
    email: patch.email !== undefined ? patch.email.trim().toLowerCase() : user.email,
    role: patch.role ?? user.role,
    status: patch.status ?? user.status,
    plano: patch.plano ?? user.plano,
    password_hash: patch.password ? await hashPassword(patch.password) : user.password_hash,
  };

  await store.saveUser(atualizado);
  return toPublicUser(atualizado);
}

export async function deleteUser(id: string): Promise<AppUser> {
  const store = await ready();
  const alvo = await store.getUser(id);
  if (!alvo) throw new Error('Usuário não encontrado.');

  if (alvo.role === 'ADMIN') {
    const usuarios = await store.listUsers();
    const admins = usuarios.filter((item) => item.role === 'ADMIN');
    if (admins.length <= 1) throw new Error('É necessário manter ao menos um administrador.');
  }

  await store.removeUser(id);
  return toPublicUser(alvo);
}

/* ---------- Recuperação de senha ---------- */

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Cria um pedido de redefinição e devolve o token em claro — que só viaja
 * dentro do link do e-mail. Pedidos anteriores do mesmo usuário são
 * invalidados, então o último link enviado é sempre o único válido.
 */
export async function createPasswordReset(userId: string): Promise<string> {
  const store = await ready();
  const agora = Date.now();

  for (const anterior of await store.listResetsByUser(userId)) {
    if (!anterior.used_at) {
      await store.saveReset({ ...anterior, used_at: new Date(agora).toISOString() });
    }
  }

  const token = `${randomId(24)}${randomId(8)}`;
  const reset: PasswordReset = {
    id: randomId(8),
    user_id: userId,
    token_hash: await hashToken(token),
    created_at: new Date(agora).toISOString(),
    expires_at: new Date(agora + RESET_TTL_MS).toISOString(),
    used_at: null,
  };

  await store.saveReset(reset);
  // Descarta pedidos vencidos há mais de uma hora, para não acumular lixo.
  await store.purgeResetsBefore(agora - RESET_TTL_MS);

  return token;
}

export type ResetCheck =
  | { ok: true; user: StoredUser }
  | { ok: false; reason: 'INVALIDO' | 'EXPIRADO' | 'USADO' };

/** Valida o token sem consumi-lo — usado para decidir se a tela abre. */
export async function checkPasswordReset(token: string): Promise<ResetCheck> {
  const store = await ready();
  const reset = await store.findResetByHash(await hashToken(token));

  if (!reset) return { ok: false, reason: 'INVALIDO' };
  if (reset.used_at) return { ok: false, reason: 'USADO' };
  if (Date.parse(reset.expires_at) < Date.now()) return { ok: false, reason: 'EXPIRADO' };

  const user = await store.getUser(reset.user_id);
  if (!user) return { ok: false, reason: 'INVALIDO' };

  return { ok: true, user };
}

/** Consome o token e troca a senha. O token vira inválido no mesmo passo. */
export async function consumePasswordReset(
  token: string,
  novaSenha: string,
): Promise<{ ok: true; user: AppUser } | { ok: false; reason: 'INVALIDO' | 'EXPIRADO' | 'USADO' }> {
  const store = await ready();
  const verificacao = await checkPasswordReset(token);
  if (!verificacao.ok) return verificacao;

  const hash = await hashToken(token);
  const reset = await store.findResetByHash(hash);
  if (reset) await store.saveReset({ ...reset, used_at: new Date().toISOString() });

  const atualizado: StoredUser = {
    ...verificacao.user,
    password_hash: await hashPassword(novaSenha),
  };
  await store.saveUser(atualizado);

  return { ok: true, user: toPublicUser(atualizado) };
}

/* ---------- Auditoria ---------- */

export async function recordAudit(entry: {
  action: AuditAction;
  actor: string;
  target?: string | null;
  detalhe: string;
}): Promise<void> {
  const store = await ready();
  const log: AuditLog = {
    id: randomId(8),
    action: entry.action,
    actor: entry.actor,
    target: entry.target ?? null,
    detalhe: entry.detalhe,
    created_at: new Date().toISOString(),
  };

  await store.appendAudit(log);
}

export async function listAudit(limit = 100): Promise<AuditLog[]> {
  return (await ready()).listAudit(limit);
}

/**
 * Persistência de usuários, auditoria e configurações.
 *
 * Usa um arquivo JSON em `.data/` (criado no primeiro uso). Em ambientes com
 * sistema de arquivos somente-leitura (serverless), degrada para memória — os
 * dados vivem enquanto a instância existir. Para produção multi-instância,
 * troque este módulo pela implementação Supabase (ver README).
 */
import 'server-only';

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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

const DATA_FILE = join(process.cwd(), '.data', 'store.json');

interface StoreShape {
  users: StoredUser[];
  audit: AuditLog[];
  resets: PasswordReset[];
  settings: AppSettings;
}

const defaultSettings: AppSettings = {
  nomeMarca: 'Lerich Finance',
  moeda: 'BRL',
  permitirCadastroPublico: true,
  limiteContasPorCliente: 10,
  avisoManutencao: '',
};

let cache: StoreShape | null = null;
/** mtime do arquivo já refletido em `cache`. */
let cachedMtimeMs = -1;
let persistenceAvailable = true;
let seeding: Promise<void> | null = null;

function emptyStore(): StoreShape {
  return { users: [], audit: [], resets: [], settings: { ...defaultSettings } };
}

/**
 * Lê o arquivo quando ele mudou desde a última leitura. Em desenvolvimento o
 * Next mantém instâncias separadas deste módulo por bundle; sem essa
 * revalidação por mtime, uma rota enxergaria dados escritos por outra.
 */
function load(): StoreShape {
  try {
    const { mtimeMs } = statSync(DATA_FILE);
    if (cache && mtimeMs === cachedMtimeMs) return cache;

    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Partial<StoreShape>;
    cache = {
      users: parsed.users ?? [],
      audit: parsed.audit ?? [],
      resets: parsed.resets ?? [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
    cachedMtimeMs = mtimeMs;
  } catch {
    // Arquivo ausente ou ilegível: mantém o que já estiver em memória.
    cache ??= emptyStore();
  }

  return cache;
}

function persist() {
  if (!cache || !persistenceAvailable) return;
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), 'utf8');
    cachedMtimeMs = statSync(DATA_FILE).mtimeMs;
  } catch {
    // Sistema de arquivos indisponível: seguimos apenas em memória.
    persistenceAvailable = false;
  }
}

/* ---------- Seed ---------- */
/**
 * Nenhuma credencial fica no código: o administrador inicial só é criado se
 * ADMIN_USERNAME e ADMIN_PASSWORD estiverem no ambiente (.env.local em
 * desenvolvimento, variáveis de projeto em produção). Sem elas, o sistema sobe
 * sem administrador — falha fechada, em vez de expor um acesso padrão.
 */

const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME?.trim() || 'Administrador';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || 'admin@lerichfinance.app';

/** Cliente de demonstração: criado apenas quando DEMO_PASSWORD é informada. */
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

async function seed() {
  const store = load();

  const semAdmin = !store.users.some((user) => user.role === 'ADMIN');

  if (semAdmin && ADMIN_USERNAME && ADMIN_PASSWORD) {
    store.users.push({
      id: randomId(8),
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

  if (store.users.length === 1 && DEMO_PASSWORD) {
    store.users.push({
      id: randomId(8),
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

  persist();
}

async function ready(): Promise<StoreShape> {
  seeding ??= seed();
  await seeding;
  return load();
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
  const store = await ready();
  return [...store.users].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(toPublicUser);
}

export async function findUserById(id: string): Promise<StoredUser | undefined> {
  const store = await ready();
  return store.users.find((user) => user.id === id);
}

/** Busca por nome de usuário OU e-mail, ambos sem diferenciar maiúsculas. */
export async function findUserByIdentifier(identifier: string): Promise<StoredUser | undefined> {
  const store = await ready();
  const alvo = identifier.trim().toLowerCase();
  if (!alvo) return undefined;

  return store.users.find(
    (user) => user.username.toLowerCase() === alvo || user.email.toLowerCase() === alvo,
  );
}

export async function getSettings(): Promise<AppSettings> {
  const store = await ready();
  return { ...store.settings };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const store = await ready();
  store.settings = { ...store.settings, ...patch };
  persist();
  return { ...store.settings };
}

/* ---------- Autenticação ---------- */

export type AuthResult = { ok: true; user: AppUser } | { ok: false; reason: 'CREDENCIAIS' | 'SUSPENSO' };

export async function authenticate(username: string, password: string): Promise<AuthResult> {
  const store = await ready();
  const normalized = username.trim().toLowerCase();
  const user = store.users.find((candidate) => candidate.username.toLowerCase() === normalized);

  // Compara mesmo sem usuário encontrado, mantendo o custo constante.
  const hash = user?.password_hash ?? (await hashPassword(randomId(12)));
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) return { ok: false, reason: 'CREDENCIAIS' };
  if (user.status === 'SUSPENSO') return { ok: false, reason: 'SUSPENSO' };

  user.last_login_at = new Date().toISOString();
  persist();
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

  if (store.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
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

  store.users.push(user);
  persist();
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
  const user = store.users.find((candidate) => candidate.id === id);
  if (!user) throw new Error('Usuário não encontrado.');

  const wouldDropAdmin =
    user.role === 'ADMIN' &&
    ((patch.role !== undefined && patch.role !== 'ADMIN') || patch.status === 'SUSPENSO');

  if (wouldDropAdmin) {
    const activeAdmins = store.users.filter(
      (candidate) => candidate.role === 'ADMIN' && candidate.status === 'ATIVO',
    );
    if (activeAdmins.length <= 1) throw new Error('É necessário manter ao menos um administrador ativo.');
  }

  if (patch.nome !== undefined) user.nome = patch.nome.trim();
  if (patch.email !== undefined) user.email = patch.email.trim().toLowerCase();
  if (patch.role !== undefined) user.role = patch.role;
  if (patch.status !== undefined) user.status = patch.status;
  if (patch.plano !== undefined) user.plano = patch.plano;
  if (patch.password) user.password_hash = await hashPassword(patch.password);

  persist();
  return toPublicUser(user);
}

export async function deleteUser(id: string): Promise<AppUser> {
  const store = await ready();
  const target = store.users.find((candidate) => candidate.id === id);
  if (!target) throw new Error('Usuário não encontrado.');

  if (target.role === 'ADMIN') {
    const admins = store.users.filter((candidate) => candidate.role === 'ADMIN');
    if (admins.length <= 1) throw new Error('É necessário manter ao menos um administrador.');
  }

  store.users = store.users.filter((candidate) => candidate.id !== id);
  persist();
  return toPublicUser(target);
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

  for (const reset of store.resets) {
    if (reset.user_id === userId && !reset.used_at) reset.used_at = new Date(agora).toISOString();
  }

  const token = `${randomId(24)}${randomId(8)}`;
  store.resets.push({
    id: randomId(8),
    user_id: userId,
    token_hash: await hashToken(token),
    created_at: new Date(agora).toISOString(),
    expires_at: new Date(agora + RESET_TTL_MS).toISOString(),
    used_at: null,
  });

  // Descarta pedidos velhos para o arquivo não crescer sem limite.
  store.resets = store.resets.filter((reset) => Date.parse(reset.expires_at) > agora - RESET_TTL_MS);

  persist();
  return token;
}

export type ResetCheck =
  | { ok: true; user: StoredUser }
  | { ok: false; reason: 'INVALIDO' | 'EXPIRADO' | 'USADO' };

/** Valida o token sem consumi-lo — usado para decidir se a tela abre. */
export async function checkPasswordReset(token: string): Promise<ResetCheck> {
  const store = await ready();
  const hash = await hashToken(token);
  const reset = store.resets.find((item) => item.token_hash === hash);

  if (!reset) return { ok: false, reason: 'INVALIDO' };
  if (reset.used_at) return { ok: false, reason: 'USADO' };
  if (Date.parse(reset.expires_at) < Date.now()) return { ok: false, reason: 'EXPIRADO' };

  const user = store.users.find((item) => item.id === reset.user_id);
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
  const reset = store.resets.find((item) => item.token_hash === hash);
  if (reset) reset.used_at = new Date().toISOString();

  verificacao.user.password_hash = await hashPassword(novaSenha);
  persist();

  return { ok: true, user: toPublicUser(verificacao.user) };
}

/* ---------- Auditoria ---------- */

export async function recordAudit(entry: {
  action: AuditAction;
  actor: string;
  target?: string | null;
  detalhe: string;
}): Promise<void> {
  const store = await ready();
  store.audit.unshift({
    id: randomId(8),
    action: entry.action,
    actor: entry.actor,
    target: entry.target ?? null,
    detalhe: entry.detalhe,
    created_at: new Date().toISOString(),
  });
  store.audit = store.audit.slice(0, 500);
  persist();
}

export async function listAudit(limit = 100): Promise<AuditLog[]> {
  const store = await ready();
  return store.audit.slice(0, limit);
}

export function isPersistenceAvailable(): boolean {
  return persistenceAvailable;
}

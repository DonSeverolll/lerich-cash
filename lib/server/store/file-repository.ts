import 'server-only';

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type {
  Account,
  AppSettings,
  AuditLog,
  Category,
  PasswordReset,
  StoredUser,
  Subscription,
  Transaction,
} from '@/types';

import { defaultSettings, type StoreDriver, type StoreRepository } from './repository';

/**
 * Persistência em arquivo JSON (`.data/store.json`), para desenvolvimento e
 * instância única. Em sistema de arquivos somente leitura degrada para
 * memória — os dados vivem enquanto a instância existir.
 */

const DATA_FILE = join(process.cwd(), '.data', 'store.json');

interface StoreShape {
  users: StoredUser[];
  audit: AuditLog[];
  resets: PasswordReset[];
  settings: AppSettings;
  accounts: Account[];
  categories: Category[];
  subscriptions: Subscription[];
  transactions: Transaction[];
}

let cache: StoreShape | null = null;
/** mtime do arquivo já refletido em `cache`. */
let cachedMtimeMs = -1;
let gravacaoOk = true;

function emptyStore(): StoreShape {
  return {
    users: [],
    audit: [],
    resets: [],
    settings: { ...defaultSettings },
    accounts: [],
    categories: [],
    subscriptions: [],
    transactions: [],
  };
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
      accounts: parsed.accounts ?? [],
      categories: parsed.categories ?? [],
      subscriptions: parsed.subscriptions ?? [],
      transactions: parsed.transactions ?? [],
    };
    cachedMtimeMs = mtimeMs;
  } catch {
    // Arquivo ausente ou ilegível: mantém o que já estiver em memória.
    cache ??= emptyStore();
  }

  return cache;
}

function persist() {
  if (!cache || !gravacaoOk) return;
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), 'utf8');
    cachedMtimeMs = statSync(DATA_FILE).mtimeMs;
  } catch {
    gravacaoOk = false;
  }
}

/** Cópia rasa, para que o chamador não altere o cache por referência. */
function copia<T>(valor: T): T {
  return structuredClone(valor);
}

/** Coleções financeiras: todas guardam itens com `id` e `user_id`. */
type ColecaoFinanceira = 'accounts' | 'categories' | 'subscriptions' | 'transactions';

function gravarEm<T extends { id: string }>(colecao: ColecaoFinanceira, item: T) {
  const store = load();
  const lista = store[colecao] as unknown as T[];
  const indice = lista.findIndex((atual) => atual.id === item.id);
  if (indice >= 0) lista[indice] = copia(item);
  else lista.push(copia(item));
  persist();
}

function removerDe(colecao: ColecaoFinanceira, id: string) {
  const store = load();
  const lista = store[colecao] as unknown as { id: string }[];
  const filtrada = lista.filter((item) => item.id !== id);
  (store[colecao] as unknown as { id: string }[]) = filtrada;
  persist();
}

export function createFileRepository(): StoreRepository {
  return {
    get driver(): StoreDriver {
      return gravacaoOk ? 'arquivo' : 'memoria';
    },

    async listUsers() {
      return copia(load().users);
    },

    async getUser(id) {
      const encontrado = load().users.find((user) => user.id === id);
      return encontrado ? copia(encontrado) : undefined;
    },

    async findUserByUsername(username) {
      const alvo = username.trim().toLowerCase();
      const encontrado = load().users.find((user) => user.username.toLowerCase() === alvo);
      return encontrado ? copia(encontrado) : undefined;
    },

    async findUserByEmail(email) {
      const alvo = email.trim().toLowerCase();
      const encontrado = load().users.find((user) => user.email.toLowerCase() === alvo);
      return encontrado ? copia(encontrado) : undefined;
    },

    async saveUser(user) {
      const store = load();
      const indice = store.users.findIndex((item) => item.id === user.id);
      if (indice >= 0) store.users[indice] = copia(user);
      else store.users.push(copia(user));
      persist();
    },

    async removeUser(id) {
      const store = load();
      store.users = store.users.filter((user) => user.id !== id);
      persist();
    },

    async listAudit(limit) {
      return copia(load().audit.slice(0, limit));
    },

    async appendAudit(log) {
      const store = load();
      store.audit.unshift(copia(log));
      store.audit = store.audit.slice(0, 500);
      persist();
    },

    async getSettings() {
      return { ...load().settings };
    },

    async saveSettings(settings) {
      const store = load();
      store.settings = { ...settings };
      persist();
    },

    async findResetByHash(hash) {
      const encontrado = load().resets.find((reset) => reset.token_hash === hash);
      return encontrado ? copia(encontrado) : undefined;
    },

    async listResetsByUser(userId) {
      return copia(load().resets.filter((reset) => reset.user_id === userId));
    },

    async saveReset(reset) {
      const store = load();
      const indice = store.resets.findIndex((item) => item.id === reset.id);
      if (indice >= 0) store.resets[indice] = copia(reset);
      else store.resets.push(copia(reset));
      persist();
    },

    async purgeResetsBefore(instante) {
      const store = load();
      store.resets = store.resets.filter((reset) => Date.parse(reset.expires_at) > instante);
      persist();
    },

    /* ----- Dados financeiros ----- */

    async listAccounts(userId) {
      return copia(load().accounts.filter((item) => item.user_id === userId));
    },

    async saveAccount(account) {
      gravarEm('accounts', account);
    },

    async removeAccount(id) {
      removerDe('accounts', id);
    },

    async listCategories(userId) {
      return copia(load().categories.filter((item) => item.user_id === userId));
    },

    async saveCategory(category) {
      gravarEm('categories', category);
    },

    async removeCategory(id) {
      removerDe('categories', id);
    },

    async listSubscriptions(userId) {
      return copia(load().subscriptions.filter((item) => item.user_id === userId));
    },

    async saveSubscription(subscription) {
      gravarEm('subscriptions', subscription);
    },

    async removeSubscription(id) {
      removerDe('subscriptions', id);
    },

    async listTransactions(userId) {
      return copia(load().transactions.filter((item) => item.user_id === userId));
    },

    async saveTransaction(transaction) {
      gravarEm('transactions', transaction);
    },

    async saveTransactions(transactions) {
      const store = load();
      for (const transaction of transactions) {
        const indice = store.transactions.findIndex((item) => item.id === transaction.id);
        if (indice >= 0) store.transactions[indice] = copia(transaction);
        else store.transactions.push(copia(transaction));
      }
      persist();
    },

    async removeTransaction(id) {
      removerDe('transactions', id);
    },

    async listAllAccounts() {
      return copia(load().accounts);
    },

    async listAllTransactions() {
      return copia(load().transactions);
    },

    async listAllSubscriptions() {
      return copia(load().subscriptions);
    },

    async removeFinanceDataOfUser(userId) {
      const store = load();
      store.accounts = store.accounts.filter((item) => item.user_id !== userId);
      store.categories = store.categories.filter((item) => item.user_id !== userId);
      store.subscriptions = store.subscriptions.filter((item) => item.user_id !== userId);
      store.transactions = store.transactions.filter((item) => item.user_id !== userId);
      persist();
    },

    gravacaoDisponivel() {
      return gravacaoOk;
    },
  };
}

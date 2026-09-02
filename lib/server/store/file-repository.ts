import 'server-only';

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { AppSettings, AuditLog, PasswordReset, StoredUser } from '@/types';

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
}

let cache: StoreShape | null = null;
/** mtime do arquivo já refletido em `cache`. */
let cachedMtimeMs = -1;
let gravacaoOk = true;

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

    gravacaoDisponivel() {
      return gravacaoOk;
    },
  };
}

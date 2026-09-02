import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

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

import { defaultSettings, type StoreRepository } from './repository';

/**
 * Persistência no Cloud Firestore, via Admin SDK.
 *
 * O acesso é sempre pelo servidor com credencial de service account, que passa
 * por cima das regras de segurança — por isso as regras publicadas devem negar
 * tudo para o cliente (ver `firebase/firestore.rules`).
 */

const COLECAO_USUARIOS = 'usuarios';
const COLECAO_AUDITORIA = 'auditoria';
const COLECAO_CONFIG = 'configuracoes';
const COLECAO_RESETS = 'recuperacoes';
const DOC_CONFIG = 'app';

/* Coleções financeiras — todos os documentos carregam `user_id`. */
const COLECAO_CONTAS = 'contas';
const COLECAO_CATEGORIAS = 'categorias';
const COLECAO_ASSINATURAS = 'assinaturas';
const COLECAO_TRANSACOES = 'transacoes';

/** Limite de operações por lote no Firestore. */
const TAMANHO_LOTE = 400;

/** Campos derivados que só existem no documento, para permitir busca exata. */
interface UserDoc extends StoredUser {
  username_lower: string;
  email_lower: string;
}

export interface CredenciaisFirebase {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Lê a credencial do ambiente. Aceita duas formas: as três variáveis
 * separadas, ou o JSON inteiro do service account (texto ou base64) em
 * `FIREBASE_SERVICE_ACCOUNT`.
 */
export function lerCredenciaisFirebase(): CredenciaisFirebase | null {
  const blob = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (blob) {
    try {
      const texto = blob.startsWith('{') ? blob : Buffer.from(blob, 'base64').toString('utf8');
      const json = JSON.parse(texto) as Record<string, string>;
      if (json.project_id && json.client_email && json.private_key) {
        return {
          projectId: json.project_id,
          clientEmail: json.client_email,
          privateKey: normalizarChave(json.private_key),
        };
      }
    } catch {
      console.error('[lerich-finance] FIREBASE_SERVICE_ACCOUNT não é um JSON válido.');
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) return null;

  return { projectId, clientEmail, privateKey: normalizarChave(privateKey) };
}

/**
 * Painéis de variáveis de ambiente costumam guardar a chave com `\n` literal
 * (e às vezes entre aspas). Aqui ela volta ao formato PEM de várias linhas.
 */
function normalizarChave(chave: string): string {
  return chave.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
}

let firestore: Firestore | null = null;

function conectar(credenciais: CredenciaisFirebase): Firestore {
  if (firestore) return firestore;

  // O app do Firebase é global ao processo, mas em desenvolvimento o Next
  // mantém instâncias separadas deste módulo por bundle. A segunda instância
  // reaproveita o app já criado — e, nesse caso, não pode chamar `settings()`
  // de novo, porque o Firestore só aceita essa chamada uma vez.
  const nome = 'lerich-finance';
  const existente = getApps().find((app) => app.name === nome);
  const app: App = existente ?? initializeApp({ credential: cert(credenciais) }, nome);
  const db = getFirestore(app);

  if (!existente) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Outro módulo ganhou a corrida e já configurou; o valor é o mesmo.
    }
  }

  firestore = db;
  return firestore;
}

/** Descarta os campos auxiliares de busca, devolvendo o usuário puro. */
function paraUsuario(doc: FirebaseFirestore.DocumentData): StoredUser {
  const completo = doc as UserDoc;
  return {
    id: completo.id,
    username: completo.username,
    nome: completo.nome,
    email: completo.email,
    role: completo.role,
    status: completo.status,
    plano: completo.plano,
    created_at: completo.created_at,
    last_login_at: completo.last_login_at ?? null,
    password_hash: completo.password_hash,
  };
}

function paraDocumento(user: StoredUser): UserDoc {
  return {
    ...user,
    last_login_at: user.last_login_at ?? null,
    username_lower: user.username.toLowerCase(),
    email_lower: user.email.toLowerCase(),
  };
}

export function createFirestoreRepository(credenciais: CredenciaisFirebase): StoreRepository {
  const db = conectar(credenciais);

  async function buscarUsuarioPor(campo: 'username_lower' | 'email_lower', valor: string) {
    const consulta = await db
      .collection(COLECAO_USUARIOS)
      .where(campo, '==', valor.trim().toLowerCase())
      .limit(1)
      .get();

    return consulta.empty ? undefined : paraUsuario(consulta.docs[0].data());
  }

  /* Helpers das coleções financeiras — todas seguem o mesmo formato. */

  async function porUsuario<T>(colecao: string, userId: string): Promise<T[]> {
    const consulta = await db.collection(colecao).where('user_id', '==', userId).get();
    return consulta.docs.map((doc) => doc.data() as T);
  }

  async function todos<T>(colecao: string): Promise<T[]> {
    const consulta = await db.collection(colecao).get();
    return consulta.docs.map((doc) => doc.data() as T);
  }

  async function gravar(colecao: string, item: { id: string }): Promise<void> {
    await db.collection(colecao).doc(item.id).set(item);
  }

  async function remover(colecao: string, id: string): Promise<void> {
    await db.collection(colecao).doc(id).delete();
  }

  /** Apaga em lotes, para não estourar o limite de operações por commit. */
  async function apagarPorUsuario(colecao: string, userId: string): Promise<void> {
    for (;;) {
      const consulta = await db
        .collection(colecao)
        .where('user_id', '==', userId)
        .limit(TAMANHO_LOTE)
        .get();
      if (consulta.empty) return;

      const lote = db.batch();
      for (const doc of consulta.docs) lote.delete(doc.ref);
      await lote.commit();
    }
  }

  return {
    driver: 'firestore',

    async listUsers() {
      const consulta = await db.collection(COLECAO_USUARIOS).get();
      return consulta.docs.map((doc) => paraUsuario(doc.data()));
    },

    async getUser(id) {
      const doc = await db.collection(COLECAO_USUARIOS).doc(id).get();
      return doc.exists ? paraUsuario(doc.data() as FirebaseFirestore.DocumentData) : undefined;
    },

    findUserByUsername: (username) => buscarUsuarioPor('username_lower', username),
    findUserByEmail: (email) => buscarUsuarioPor('email_lower', email),

    async saveUser(user) {
      await db.collection(COLECAO_USUARIOS).doc(user.id).set(paraDocumento(user));
    },

    async removeUser(id) {
      await db.collection(COLECAO_USUARIOS).doc(id).delete();
    },

    async listAudit(limit) {
      const consulta = await db
        .collection(COLECAO_AUDITORIA)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get();

      return consulta.docs.map((doc) => doc.data() as AuditLog);
    },

    async appendAudit(log) {
      await db.collection(COLECAO_AUDITORIA).doc(log.id).set({ ...log, target: log.target ?? null });
    },

    async getSettings() {
      const doc = await db.collection(COLECAO_CONFIG).doc(DOC_CONFIG).get();
      if (!doc.exists) return { ...defaultSettings };
      return { ...defaultSettings, ...(doc.data() as Partial<AppSettings>) };
    },

    async saveSettings(settings) {
      await db.collection(COLECAO_CONFIG).doc(DOC_CONFIG).set(settings);
    },

    async findResetByHash(hash) {
      const consulta = await db
        .collection(COLECAO_RESETS)
        .where('token_hash', '==', hash)
        .limit(1)
        .get();

      return consulta.empty ? undefined : (consulta.docs[0].data() as PasswordReset);
    },

    async listResetsByUser(userId) {
      const consulta = await db.collection(COLECAO_RESETS).where('user_id', '==', userId).get();
      return consulta.docs.map((doc) => doc.data() as PasswordReset);
    },

    async saveReset(reset) {
      await db.collection(COLECAO_RESETS).doc(reset.id).set({ ...reset, used_at: reset.used_at ?? null });
    },

    async purgeResetsBefore(instante) {
      const limite = new Date(instante).toISOString();
      const consulta = await db.collection(COLECAO_RESETS).where('expires_at', '<=', limite).limit(50).get();
      if (consulta.empty) return;

      const lote = db.batch();
      for (const doc of consulta.docs) lote.delete(doc.ref);
      await lote.commit();
    },

    /* ----- Dados financeiros ----- */

    listAccounts: (userId) => porUsuario<Account>(COLECAO_CONTAS, userId),
    saveAccount: (account) => gravar(COLECAO_CONTAS, account),
    removeAccount: (id) => remover(COLECAO_CONTAS, id),

    listCategories: (userId) => porUsuario<Category>(COLECAO_CATEGORIAS, userId),
    saveCategory: (category) => gravar(COLECAO_CATEGORIAS, category),
    removeCategory: (id) => remover(COLECAO_CATEGORIAS, id),

    listSubscriptions: (userId) => porUsuario<Subscription>(COLECAO_ASSINATURAS, userId),
    saveSubscription: (subscription) => gravar(COLECAO_ASSINATURAS, subscription),
    removeSubscription: (id) => remover(COLECAO_ASSINATURAS, id),

    listTransactions: (userId) => porUsuario<Transaction>(COLECAO_TRANSACOES, userId),
    saveTransaction: (transaction) => gravar(COLECAO_TRANSACOES, transaction),
    removeTransaction: (id) => remover(COLECAO_TRANSACOES, id),

    async saveTransactions(transactions) {
      // O Firestore aceita no máximo 500 operações por lote.
      for (let i = 0; i < transactions.length; i += TAMANHO_LOTE) {
        const lote = db.batch();
        for (const transaction of transactions.slice(i, i + TAMANHO_LOTE)) {
          lote.set(db.collection(COLECAO_TRANSACOES).doc(transaction.id), transaction);
        }
        await lote.commit();
      }
    },

    listAllAccounts: () => todos<Account>(COLECAO_CONTAS),
    listAllTransactions: () => todos<Transaction>(COLECAO_TRANSACOES),
    listAllSubscriptions: () => todos<Subscription>(COLECAO_ASSINATURAS),

    async removeFinanceDataOfUser(userId) {
      for (const colecao of [COLECAO_CONTAS, COLECAO_CATEGORIAS, COLECAO_ASSINATURAS, COLECAO_TRANSACOES]) {
        await apagarPorUsuario(colecao, userId);
      }
    },

    gravacaoDisponivel() {
      return true;
    },
  };
}

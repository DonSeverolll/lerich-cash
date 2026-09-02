/**
 * Regras de negócio dos dados financeiros de cada cliente.
 *
 * Tudo aqui recebe o `userId` da sessão e nunca confia em id vindo do cliente:
 * antes de alterar ou apagar, confere se o documento pertence a quem pediu.
 */
import 'server-only';

import type {
  Account,
  AccountType,
  Category,
  CategoryType,
  DadosFinanceiros,
  ImportPreviewItem,
  ResumoGlobal,
  Subscription,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@/types';

import { randomId } from '@/lib/auth/crypto';

import { repo } from './driver';

/** Tudo que as telas do cliente precisam, em uma única leitura. */
export type { DadosFinanceiros };

/* ---------- Categorias padrão ---------- */

const CATEGORIAS_PADRAO: Array<{ nome: string; tipo: CategoryType; cor_hex: string; icone: string }> = [
  { nome: 'Salário', tipo: 'RECEITA', cor_hex: '#d4af37', icone: 'wallet' },
  { nome: 'Freelance', tipo: 'RECEITA', cor_hex: '#e9cb6d', icone: 'briefcase' },
  { nome: 'Outras receitas', tipo: 'RECEITA', cor_hex: '#f2e0a0', icone: 'plus' },
  { nome: 'Alimentação', tipo: 'DESPESA', cor_hex: '#b8912a', icone: 'utensils' },
  { nome: 'Casa', tipo: 'DESPESA', cor_hex: '#936e23', icone: 'home' },
  { nome: 'Transporte', tipo: 'DESPESA', cor_hex: '#dcb648', icone: 'car' },
  { nome: 'Assinaturas', tipo: 'DESPESA', cor_hex: '#f2e0a0', icone: 'badge' },
  { nome: 'Educação', tipo: 'DESPESA', cor_hex: '#674b24', icone: 'book' },
  { nome: 'Saúde', tipo: 'DESPESA', cor_hex: '#a8842c', icone: 'heart' },
  { nome: 'Lazer', tipo: 'DESPESA', cor_hex: '#faf0cf', icone: 'sparkles' },
];

/**
 * Garante o conjunto inicial de categorias. Sem elas o cliente não consegue
 * lançar nada, então isso roda na primeira leitura da conta.
 */
export async function garantirCategoriasPadrao(userId: string): Promise<Category[]> {
  const store = repo();
  const existentes = await store.listCategories(userId);
  if (existentes.length) return existentes;

  const criadas: Category[] = CATEGORIAS_PADRAO.map((base) => ({
    id: randomId(8),
    user_id: userId,
    ...base,
  }));

  for (const categoria of criadas) await store.saveCategory(categoria);
  return criadas;
}

/* ---------- Leitura ---------- */

export async function carregarFinancas(userId: string): Promise<DadosFinanceiros> {
  const store = repo();

  const [contas, assinaturas, transacoes] = await Promise.all([
    store.listAccounts(userId),
    store.listSubscriptions(userId),
    store.listTransactions(userId),
  ]);

  const categorias = await garantirCategoriasPadrao(userId);

  return {
    contas: contas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    categorias: categorias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    assinaturas: assinaturas.sort((a, b) => a.dia_vencimento - b.dia_vencimento),
    transacoes: transacoes.sort((a, b) => b.data_transacao.localeCompare(a.data_transacao)),
  };
}

/* ---------- Contas ---------- */

export interface ContaInput {
  nome: string;
  tipo: AccountType;
  saldo_inicial: number;
  cor_hex: string;
}

export async function criarConta(userId: string, input: ContaInput): Promise<Account> {
  const conta: Account = {
    id: randomId(8),
    user_id: userId,
    nome: input.nome.trim(),
    tipo: input.tipo,
    saldo_inicial: input.saldo_inicial,
    cor_hex: input.cor_hex,
    created_at: new Date().toISOString(),
  };

  await repo().saveAccount(conta);
  return conta;
}

export async function atualizarConta(
  userId: string,
  id: string,
  patch: Partial<ContaInput>,
): Promise<Account> {
  const store = repo();
  const atual = (await store.listAccounts(userId)).find((item) => item.id === id);
  if (!atual) throw new Error('Conta não encontrada.');

  const atualizada: Account = {
    ...atual,
    nome: patch.nome !== undefined ? patch.nome.trim() : atual.nome,
    tipo: patch.tipo ?? atual.tipo,
    saldo_inicial: patch.saldo_inicial ?? atual.saldo_inicial,
    cor_hex: patch.cor_hex ?? atual.cor_hex,
  };

  await store.saveAccount(atualizada);
  return atualizada;
}

export async function removerConta(userId: string, id: string): Promise<void> {
  const store = repo();
  const conta = (await store.listAccounts(userId)).find((item) => item.id === id);
  if (!conta) throw new Error('Conta não encontrada.');

  // Apagar a conta deixaria transações órfãs, com saldo impossível de recompor.
  const transacoes = await store.listTransactions(userId);
  const vinculadas = transacoes.filter((item) => item.conta_id === id).length;
  if (vinculadas) {
    throw new Error(
      `Esta conta tem ${vinculadas} transação(ões). Remova ou transfira os lançamentos antes de excluí-la.`,
    );
  }

  const assinaturas = await store.listSubscriptions(userId);
  if (assinaturas.some((item) => item.conta_id === id)) {
    throw new Error('Esta conta está ligada a uma assinatura. Ajuste a assinatura antes de excluí-la.');
  }

  await store.removeAccount(id);
}

/* ---------- Categorias ---------- */

export interface CategoriaInput {
  nome: string;
  tipo: CategoryType;
  cor_hex: string;
  icone?: string;
}

export async function criarCategoria(userId: string, input: CategoriaInput): Promise<Category> {
  const categoria: Category = {
    id: randomId(8),
    user_id: userId,
    nome: input.nome.trim(),
    tipo: input.tipo,
    cor_hex: input.cor_hex,
    icone: input.icone ?? 'circle',
  };

  await repo().saveCategory(categoria);
  return categoria;
}

export async function removerCategoria(userId: string, id: string): Promise<void> {
  const store = repo();
  const categoria = (await store.listCategories(userId)).find((item) => item.id === id);
  if (!categoria) throw new Error('Categoria não encontrada.');

  const transacoes = await store.listTransactions(userId);
  const emUso = transacoes.filter((item) => item.categoria_id === id).length;
  if (emUso) {
    throw new Error(`Esta categoria está em ${emUso} transação(ões) e não pode ser removida.`);
  }

  await store.removeCategory(id);
}

/* ---------- Assinaturas ---------- */

export interface AssinaturaInput {
  conta_id: string;
  categoria_id: string;
  nome_servico: string;
  valor: number;
  dia_vencimento: number;
  ativo?: boolean;
}

async function conferirVinculos(userId: string, contaId: string, categoriaId: string) {
  const store = repo();
  const [contas, categorias] = await Promise.all([
    store.listAccounts(userId),
    store.listCategories(userId),
  ]);

  if (!contas.some((item) => item.id === contaId)) throw new Error('Conta inválida.');
  if (!categorias.some((item) => item.id === categoriaId)) throw new Error('Categoria inválida.');
}

export async function criarAssinatura(userId: string, input: AssinaturaInput): Promise<Subscription> {
  await conferirVinculos(userId, input.conta_id, input.categoria_id);

  const assinatura: Subscription = {
    id: randomId(8),
    user_id: userId,
    conta_id: input.conta_id,
    categoria_id: input.categoria_id,
    nome_servico: input.nome_servico.trim(),
    valor: input.valor,
    dia_vencimento: input.dia_vencimento,
    ativo: input.ativo ?? true,
    created_at: new Date().toISOString(),
  };

  await repo().saveSubscription(assinatura);
  return assinatura;
}

export async function atualizarAssinatura(
  userId: string,
  id: string,
  patch: Partial<AssinaturaInput>,
): Promise<Subscription> {
  const store = repo();
  const atual = (await store.listSubscriptions(userId)).find((item) => item.id === id);
  if (!atual) throw new Error('Assinatura não encontrada.');

  const conta_id = patch.conta_id ?? atual.conta_id;
  const categoria_id = patch.categoria_id ?? atual.categoria_id;
  await conferirVinculos(userId, conta_id, categoria_id);

  const atualizada: Subscription = {
    ...atual,
    conta_id,
    categoria_id,
    nome_servico: patch.nome_servico !== undefined ? patch.nome_servico.trim() : atual.nome_servico,
    valor: patch.valor ?? atual.valor,
    dia_vencimento: patch.dia_vencimento ?? atual.dia_vencimento,
    ativo: patch.ativo ?? atual.ativo,
  };

  await store.saveSubscription(atualizada);
  return atualizada;
}

export async function removerAssinatura(userId: string, id: string): Promise<void> {
  const store = repo();
  const assinatura = (await store.listSubscriptions(userId)).find((item) => item.id === id);
  if (!assinatura) throw new Error('Assinatura não encontrada.');

  await store.removeSubscription(id);
}

/** Lança a assinatura como transação do mês corrente, sem duplicar. */
export async function lancarAssinatura(userId: string, id: string): Promise<Transaction> {
  const store = repo();
  const assinatura = (await store.listSubscriptions(userId)).find((item) => item.id === id);
  if (!assinatura) throw new Error('Assinatura não encontrada.');
  if (!assinatura.ativo) throw new Error('Esta assinatura está pausada.');

  const hoje = new Date();
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const dia = Math.min(assinatura.dia_vencimento, ultimoDia);
  const data = new Date(hoje.getFullYear(), hoje.getMonth(), dia, 12, 0, 0);
  const competencia = data.toISOString().slice(0, 7);

  const transacoes = await store.listTransactions(userId);
  const jaLancada = transacoes.some(
    (item) => item.assinatura_id === id && item.data_transacao.startsWith(competencia),
  );
  if (jaLancada) throw new Error('Esta assinatura já foi lançada neste mês.');

  return criarTransacao(userId, {
    conta_id: assinatura.conta_id,
    categoria_id: assinatura.categoria_id,
    descricao: assinatura.nome_servico,
    valor: assinatura.valor,
    tipo: 'DESPESA',
    data_transacao: data.toISOString(),
    status: 'PENDENTE',
    assinatura_id: id,
  });
}

/* ---------- Transações ---------- */

export interface TransacaoInput {
  conta_id: string;
  categoria_id: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  data_transacao: string;
  status: TransactionStatus;
  assinatura_id?: string | null;
}

export async function criarTransacao(userId: string, input: TransacaoInput): Promise<Transaction> {
  await conferirVinculos(userId, input.conta_id, input.categoria_id);

  const transacao: Transaction = {
    id: randomId(8),
    user_id: userId,
    conta_id: input.conta_id,
    categoria_id: input.categoria_id,
    assinatura_id: input.assinatura_id ?? null,
    descricao: input.descricao.trim(),
    valor: Math.abs(input.valor),
    tipo: input.tipo,
    data_transacao: input.data_transacao,
    status: input.status,
    created_at: new Date().toISOString(),
  };

  await repo().saveTransaction(transacao);
  return transacao;
}

export async function atualizarTransacao(
  userId: string,
  id: string,
  patch: Partial<TransacaoInput>,
): Promise<Transaction> {
  const store = repo();
  const atual = (await store.listTransactions(userId)).find((item) => item.id === id);
  if (!atual) throw new Error('Transação não encontrada.');

  const conta_id = patch.conta_id ?? atual.conta_id;
  const categoria_id = patch.categoria_id ?? atual.categoria_id;
  await conferirVinculos(userId, conta_id, categoria_id);

  const atualizada: Transaction = {
    ...atual,
    conta_id,
    categoria_id,
    descricao: patch.descricao !== undefined ? patch.descricao.trim() : atual.descricao,
    valor: patch.valor !== undefined ? Math.abs(patch.valor) : atual.valor,
    tipo: patch.tipo ?? atual.tipo,
    data_transacao: patch.data_transacao ?? atual.data_transacao,
    status: patch.status ?? atual.status,
  };

  await store.saveTransaction(atualizada);
  return atualizada;
}

export async function removerTransacao(userId: string, id: string): Promise<void> {
  const store = repo();
  const transacao = (await store.listTransactions(userId)).find((item) => item.id === id);
  if (!transacao) throw new Error('Transação não encontrada.');

  await store.removeTransaction(id);
}

/** Grava em lote os lançamentos conferidos na tela de importação. */
export async function importarTransacoes(
  userId: string,
  itens: Array<ImportPreviewItem & { conta_id: string; categoria_id: string }>,
): Promise<number> {
  const store = repo();
  const [contas, categorias] = await Promise.all([
    store.listAccounts(userId),
    store.listCategories(userId),
  ]);

  const agora = new Date().toISOString();
  const transacoes: Transaction[] = itens.map((item) => {
    if (!contas.some((conta) => conta.id === item.conta_id)) throw new Error('Conta inválida.');
    if (!categorias.some((categoria) => categoria.id === item.categoria_id)) {
      throw new Error('Categoria inválida.');
    }

    return {
      id: randomId(8),
      user_id: userId,
      conta_id: item.conta_id,
      categoria_id: item.categoria_id,
      assinatura_id: null,
      descricao: item.descricao.trim(),
      valor: Math.abs(item.valor),
      tipo: item.tipo,
      data_transacao: item.data_transacao,
      status: item.status,
      created_at: agora,
    };
  });

  await store.saveTransactions(transacoes);
  return transacoes.length;
}

/* ---------- Agregados do administrador ---------- */

export type { ResumoGlobal };

export async function resumoGlobal(): Promise<ResumoGlobal> {
  const store = repo();
  const [contas, transacoes, assinaturas] = await Promise.all([
    store.listAllAccounts(),
    store.listAllTransactions(),
    store.listAllSubscriptions(),
  ]);

  const saldoPorConta = new Map<string, number>();
  for (const conta of contas) saldoPorConta.set(conta.id, conta.saldo_inicial);

  for (const transacao of transacoes) {
    const saldo = saldoPorConta.get(transacao.conta_id);
    if (saldo === undefined) continue;
    saldoPorConta.set(
      transacao.conta_id,
      saldo + (transacao.tipo === 'RECEITA' ? transacao.valor : -transacao.valor),
    );
  }

  return {
    custodia: [...saldoPorConta.values()].reduce((soma, valor) => soma + valor, 0),
    volumeTransacionado: transacoes.reduce((soma, item) => soma + item.valor, 0),
    recorrenteMensal: assinaturas
      .filter((item) => item.ativo)
      .reduce((soma, item) => soma + item.valor, 0),
    totalTransacoes: transacoes.length,
  };
}

/** Remove todos os dados financeiros de um cliente. */
export async function apagarFinancasDoUsuario(userId: string): Promise<void> {
  await repo().removeFinanceDataOfUser(userId);
}

/* ---------- Dados de exemplo ---------- */

/**
 * Popula a conta com contas, assinaturas e ~6 meses de lançamentos, para quem
 * quer ver o painel funcionando antes de cadastrar os próprios dados.
 * Só roda em conta vazia, para não misturar exemplo com dado real.
 */
export async function popularDadosDeExemplo(userId: string): Promise<number> {
  const store = repo();

  const jaTem = await store.listTransactions(userId);
  if (jaTem.length) throw new Error('Esta conta já tem lançamentos. O exemplo só entra em conta vazia.');

  const categorias = await garantirCategoriasPadrao(userId);
  const porNome = (nome: string) => categorias.find((item) => item.nome === nome);

  const modelosDeConta: Array<{ nome: string; tipo: AccountType; saldo: number; cor: string }> = [
    { nome: 'Conta corrente', tipo: 'CORRENTE', saldo: 4200, cor: '#d4af37' },
    { nome: 'Poupança', tipo: 'POUPANCA', saldo: 18000, cor: '#e9cb6d' },
    { nome: 'Investimentos', tipo: 'INVESTIMENTO', saldo: 54000, cor: '#b8912a' },
    { nome: 'Carteira', tipo: 'CARTEIRA', saldo: 980, cor: '#f2e0a0' },
  ];

  const contas: Account[] = [];
  for (const modelo of modelosDeConta) {
    const conta = await criarConta(userId, {
      nome: modelo.nome,
      tipo: modelo.tipo,
      saldo_inicial: modelo.saldo,
      cor_hex: modelo.cor,
    });
    contas.push(conta);
  }

  const [corrente, poupanca] = contas;

  const modelosDeAssinatura = [
    { nome: 'Netflix', valor: 39.9, dia: 10, conta: corrente, categoria: 'Assinaturas' },
    { nome: 'Spotify', valor: 24.9, dia: 12, conta: corrente, categoria: 'Assinaturas' },
    { nome: 'Internet', valor: 129.9, dia: 15, conta: corrente, categoria: 'Casa' },
    { nome: 'Faculdade', valor: 850, dia: 5, conta: poupanca, categoria: 'Educação' },
  ];

  for (const modelo of modelosDeAssinatura) {
    const categoria = porNome(modelo.categoria);
    if (!categoria) continue;
    await criarAssinatura(userId, {
      conta_id: modelo.conta.id,
      categoria_id: categoria.id,
      nome_servico: modelo.nome,
      valor: modelo.valor,
      dia_vencimento: modelo.dia,
    });
  }

  /* Gerador determinístico: mesmo dia, mesmo resultado. */
  let semente = 20260101;
  const sorteio = () => {
    semente = (semente * 16807) % 2147483647;
    return (semente - 1) / 2147483646;
  };

  const modelosDeLancamento: Array<{
    descricao: string;
    base: number;
    variacao: number;
    dia: number;
    tipo: TransactionType;
    categoria: string;
    conta: Account;
  }> = [
    { descricao: 'Salário mensal', base: 6800, variacao: 0, dia: 1, tipo: 'RECEITA', categoria: 'Salário', conta: corrente },
    { descricao: 'Projeto freelance', base: 1250, variacao: 900, dia: 17, tipo: 'RECEITA', categoria: 'Freelance', conta: poupanca },
    { descricao: 'Aluguel', base: 2200, variacao: 0, dia: 5, tipo: 'DESPESA', categoria: 'Casa', conta: corrente },
    { descricao: 'Supermercado', base: 780, variacao: 260, dia: 8, tipo: 'DESPESA', categoria: 'Alimentação', conta: corrente },
    { descricao: 'Restaurantes', base: 320, variacao: 180, dia: 22, tipo: 'DESPESA', categoria: 'Alimentação', conta: contas[3] },
    { descricao: 'Combustível', base: 210, variacao: 120, dia: 7, tipo: 'DESPESA', categoria: 'Transporte', conta: poupanca },
    { descricao: 'Cinema e jantar', base: 180, variacao: 140, dia: 14, tipo: 'DESPESA', categoria: 'Lazer', conta: corrente },
  ];

  const hoje = new Date();
  const agora = new Date().toISOString();
  const lancamentos: Transaction[] = [];

  for (let recuo = 5; recuo >= 0; recuo -= 1) {
    const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - recuo, 1);
    const ultimoDia = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0).getDate();

    for (const modelo of modelosDeLancamento) {
      const categoria = porNome(modelo.categoria);
      if (!categoria) continue;

      const dia = Math.min(modelo.dia, ultimoDia);
      const data = new Date(referencia.getFullYear(), referencia.getMonth(), dia, 12, 0, 0);
      if (data > hoje) continue;

      const ruido = modelo.variacao ? Math.round((sorteio() - 0.5) * modelo.variacao) : 0;

      lancamentos.push({
        id: randomId(8),
        user_id: userId,
        conta_id: modelo.conta.id,
        categoria_id: categoria.id,
        assinatura_id: null,
        descricao: modelo.descricao,
        valor: Math.max(10, Number((modelo.base + ruido).toFixed(2))),
        tipo: modelo.tipo,
        data_transacao: data.toISOString(),
        status: recuo === 0 && sorteio() > 0.6 ? 'PENDENTE' : 'EFETIVADA',
        created_at: agora,
      });
    }
  }

  await store.saveTransactions(lancamentos);
  return lancamentos.length;
}

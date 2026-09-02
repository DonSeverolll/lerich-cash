import 'server-only';

import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

import type { SessionUser } from '@/types';

import { getSession } from '@/lib/auth/server';

/**
 * Utilitários comuns às rotas de API: sessão, validação e erro.
 * Toda rota financeira usa o id da sessão — nunca um id vindo do cliente.
 */

export type ResultadoSessao = { sessao: SessionUser } | { erro: NextResponse };

export async function exigirSessao(): Promise<ResultadoSessao> {
  const sessao = await getSession();
  if (!sessao) return { erro: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  return { sessao };
}

export async function exigirAdmin(): Promise<ResultadoSessao> {
  const resultado = await exigirSessao();
  if ('erro' in resultado) return resultado;
  if (resultado.sessao.role !== 'ADMIN') {
    return { erro: NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 }) };
  }
  return resultado;
}

export function erroDeValidacao(error: ZodError): NextResponse {
  return NextResponse.json({ error: error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
}

/** Converte exceção da camada de negócio em resposta legível. */
export function erroDeNegocio(causa: unknown): NextResponse {
  const mensagem = causa instanceof Error ? causa.message : 'Não foi possível concluir a operação.';
  return NextResponse.json({ error: mensagem }, { status: 400 });
}

export async function corpoJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

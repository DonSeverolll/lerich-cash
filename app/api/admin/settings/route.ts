import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth/server';
import { getSettings, updateSettings } from '@/lib/server/store';

const schema = z.object({
  nomeMarca: z.string().min(2).max(60).optional(),
  moeda: z.enum(['BRL', 'USD', 'EUR']).optional(),
  permitirCadastroPublico: z.boolean().optional(),
  limiteContasPorCliente: z.number().int().min(1).max(100).optional(),
  avisoManutencao: z.string().max(240).optional(),
});

async function guard() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  return NextResponse.json({ settings: await getSettings() });
}

export async function PATCH(request: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  return NextResponse.json({ settings: await updateSettings(parsed.data) });
}

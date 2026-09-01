import { NextResponse } from 'next/server';

import { SESSION_COOKIE, getSession } from '@/lib/auth/server';
import { recordAudit } from '@/lib/server/store';

export async function POST() {
  const session = await getSession();

  if (session) {
    await recordAudit({
      action: 'LOGOUT',
      actor: session.username,
      target: session.id,
      detalhe: 'Sessão encerrada',
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0 });
  return response;
}

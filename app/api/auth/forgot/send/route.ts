import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { TICKET_PURPOSE } from '@/lib/auth/reset-ticket';
import { verifyShortToken } from '@/lib/auth/token';
import { baseUrl, emailRecuperacao, enviarEmail, mailerConfigurado } from '@/lib/server/mailer';
import { createPasswordReset, findUserById, recordAudit } from '@/lib/server/store';

/**
 * Etapa 2: o usuário confirmou que o e-mail mascarado é dele. Geramos o token
 * de uso único e enviamos o link. A resposta é sempre a mesma quando o ticket
 * é válido — falha de entrega não vira sinal para quem está do outro lado.
 */

const schema = z.object({
  ticket: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  }

  const dados = await verifyShortToken<{ id: string }>(TICKET_PURPOSE, parsed.data.ticket);
  if (!dados) {
    return NextResponse.json(
      { error: 'A confirmação expirou. Recomece a recuperação.' },
      { status: 400 },
    );
  }

  const user = await findUserById(dados.id);
  if (!user || user.status === 'SUSPENSO') {
    return NextResponse.json({ error: 'Conta indisponível.' }, { status: 400 });
  }

  const token = await createPasswordReset(user.id);
  const link = `${baseUrl(request)}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const { assunto, html, texto } = emailRecuperacao({ nome: user.nome, link });

  const envio = await enviarEmail({ para: user.email, assunto, html, texto });

  await recordAudit({
    action: 'RESET_SOLICITADO',
    actor: user.username,
    target: user.id,
    detalhe: envio.entregue
      ? `Link de recuperação enviado para ${user.email}`
      : `Link gerado, mas o e-mail não saiu (${envio.motivo})`,
  });

  return NextResponse.json({
    ok: true,
    // Sinaliza a ausência de provedor só para orientar quem está desenvolvendo.
    provedorConfigurado: mailerConfigurado(),
  });
}

import 'server-only';

/**
 * Envio de e-mail transacional.
 *
 * Usa a API HTTP do Resend (sem SDK, só `fetch` — funciona em serverless).
 * Sem `RESEND_API_KEY` configurada nada é enviado: o link é escrito no log do
 * servidor para que o fluxo continue testável em desenvolvimento. A função
 * informa qual dos dois caminhos ocorreu, e quem chama nunca revela isso ao
 * usuário final.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type MailResult =
  | { entregue: true }
  | { entregue: false; motivo: 'SEM_PROVEDOR' | 'FALHA'; detalhe?: string };

interface MailInput {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}

export function mailerConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Remetente em uso, já com o padrão aplicado. */
export const REMETENTE_PADRAO = 'Lerich Finance <onboarding@resend.dev>';

export interface StatusEmail {
  configurado: boolean;
  remetente: string;
  /**
   * `onboarding@resend.dev` é o remetente compartilhado do Resend: ele só
   * entrega para o e-mail dono da conta. O painel precisa dizer isso, senão a
   * recuperação de senha parece funcionar e nenhum cliente recebe nada.
   */
  remetenteRestrito: boolean;
  /** Base dos links quando não há requisição para inspecionar. */
  baseDosLinks: string | null;
}

export function statusDoEmail(): StatusEmail {
  const remetente = process.env.MAIL_FROM?.trim() || REMETENTE_PADRAO;
  const configurada = process.env.APP_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  return {
    configurado: mailerConfigurado(),
    remetente,
    remetenteRestrito: /@resend\.dev>?$/i.test(remetente),
    baseDosLinks: configurada?.replace(/\/$/, '') ?? (vercel ? `https://${vercel}` : null),
  };
}

export async function enviarEmail({ para, assunto, html, texto }: MailInput): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.MAIL_FROM?.trim() || REMETENTE_PADRAO;

  if (!apiKey) {
    console.warn(
      `[lerich-finance] RESEND_API_KEY ausente — e-mail para ${para} não foi enviado.\n` +
        `Assunto: ${assunto}\n${texto}`,
    );
    return { entregue: false, motivo: 'SEM_PROVEDOR' };
  }

  try {
    const resposta = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: remetente, to: [para], subject: assunto, html, text: texto }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      console.error(`[lerich-finance] Resend recusou o envio (${resposta.status}): ${detalhe}`);
      return { entregue: false, motivo: 'FALHA', detalhe: `HTTP ${resposta.status}` };
    }

    return { entregue: true };
  } catch (causa) {
    console.error('[lerich-finance] Falha de rede ao enviar e-mail:', causa);
    return { entregue: false, motivo: 'FALHA' };
  }
}

/** URL pública da aplicação, para montar links absolutos no e-mail. */
export function baseUrl(request: Request): string {
  const configurada = process.env.APP_URL?.trim();
  if (configurada) return configurada.replace(/\/$/, '');

  // Na Vercel a variável do sistema traz o domínio do deploy.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  const cabecalho = request.headers;
  const host = cabecalho.get('x-forwarded-host') ?? cabecalho.get('host') ?? 'localhost:3000';
  const protocolo = cabecalho.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocolo}://${host}`;
}

/* ---------- Modelo do e-mail de recuperação ---------- */

export function emailRecuperacao({ nome, link }: { nome: string; link: string }): {
  assunto: string;
  html: string;
  texto: string;
} {
  const assunto = 'Redefinição de senha · Lerich Finance';

  const texto = [
    `Olá, ${nome}.`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta no Lerich Finance.',
    'Abra o link abaixo para escolher uma nova senha. Ele vale por 1 hora e só pode ser usado uma vez.',
    '',
    link,
    '',
    'Se não foi você quem pediu, ignore esta mensagem — sua senha atual continua valendo.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:32px 16px;background:#050505;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#f6f1e4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:linear-gradient(160deg,#1a1814,#09080600);border:1px solid rgba(212,175,55,0.25);border-radius:16px;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(212,175,55,0.8);">Lerich Finance</p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#f6f1e4;">Redefinição de senha</h1>

          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d1d1d1;">Olá, ${escapeHtml(nome)}.</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d1d1d1;">
            Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha.
          </p>

          <p style="margin:28px 0;">
            <a href="${link}" style="display:inline-block;padding:13px 26px;border-radius:12px;background:linear-gradient(180deg,#e9cb6d,#b8912a);color:#050505;font-weight:600;font-size:15px;text-decoration:none;">
              Criar nova senha
            </a>
          </p>

          <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#888;">
            O link vale por <strong style="color:#d4af37;">1 hora</strong> e só pode ser usado uma vez.
          </p>
          <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#888;">
            Se o botão não funcionar, copie e cole este endereço no navegador:<br />
            <span style="color:#b0b0b0;word-break:break-all;">${link}</span>
          </p>

          <hr style="border:0;border-top:1px solid rgba(212,175,55,0.18);margin:24px 0;" />
          <p style="margin:0;font-size:12px;line-height:1.6;color:#6d6d6d;">
            Se não foi você quem pediu, ignore esta mensagem — sua senha atual continua valendo.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { assunto, html, texto };
}

function escapeHtml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Diagnóstico do e-mail transacional (recuperação de senha).
 *
 *   npm run mail:check
 *   npm run mail:check -- voce@seudominio.com   (envia um e-mail de verdade)
 *
 * Confere RESEND_API_KEY, MAIL_FROM e APP_URL, valida se o domínio do
 * remetente está verificado no Resend e, se você passar um destinatário,
 * dispara o próprio e-mail de recuperação para ver como ele chega.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const cores = {
  ok: (t) => `\u001b[32m${t}\u001b[0m`,
  erro: (t) => `\u001b[31m${t}\u001b[0m`,
  aviso: (t) => `\u001b[33m${t}\u001b[0m`,
  fraco: (t) => `\u001b[90m${t}\u001b[0m`,
};

/** Carrega .env.local sem dependências, sem sobrescrever o que já existe. */
function carregarEnv(arquivo) {
  try {
    const conteudo = readFileSync(join(process.cwd(), arquivo), 'utf8');
    for (const linha of conteudo.split(/\r?\n/)) {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith('#')) continue;

      const separador = limpa.indexOf('=');
      if (separador < 0) continue;

      const chave = limpa.slice(0, separador).trim();
      let valor = limpa.slice(separador + 1).trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      if (!(chave in process.env)) process.env[chave] = valor;
    }
    return true;
  } catch {
    return false;
  }
}

/** "Nome <caixa@dominio>" ou "caixa@dominio" → partes. */
function lerRemetente(valor) {
  const bruto = (valor ?? '').trim();
  if (!bruto) return null;

  const comNome = bruto.match(/^(.*)<\s*([^>]+)\s*>$/);
  const endereco = (comNome ? comNome[2] : bruto).trim();
  const nome = comNome ? comNome[1].trim().replace(/^["']|["']$/g, '') : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) return { endereco, dominio: null, nome, valido: false };
  return { endereco, dominio: endereco.split('@')[1].toLowerCase(), nome, valido: true };
}

async function main() {
  console.log('\nVerificação do e-mail transacional — Lerich Finance\n');

  const carregou = carregarEnv('.env.local');
  console.log(
    carregou
      ? cores.fraco('· .env.local carregado')
      : cores.aviso('· .env.local não encontrado; usando o ambiente'),
  );

  let problemas = 0;

  /* ---------- APP_URL ---------- */
  const appUrl = process.env.APP_URL?.trim();
  const urlVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  if (appUrl) {
    try {
      const url = new URL(appUrl);
      const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      console.log(cores.fraco(`· APP_URL:  ${appUrl}`));
      if (url.protocol !== 'https:' && !local) {
        console.log(cores.aviso('  ! Em produção use https — o link do e-mail carrega um token de sessão.'));
        problemas++;
      }
      if (local) {
        console.log(
          cores.fraco('    (endereço local: correto para desenvolvimento; na Vercel use o domínio público)'),
        );
      }
      if (appUrl.endsWith('/')) {
        console.log(cores.fraco('    (a barra final é removida automaticamente)'));
      }
    } catch {
      console.log(cores.erro(`\n✗ APP_URL não é uma URL válida: ${appUrl}`));
      console.log(cores.fraco('  Formato esperado: https://seu-projeto.vercel.app\n'));
      problemas++;
    }
  } else if (urlVercel) {
    console.log(cores.fraco(`· APP_URL:  não definida — a Vercel informa ${urlVercel}`));
  } else {
    console.log(cores.aviso('· APP_URL:  não definida'));
    console.log(
      cores.fraco('    Fora da Vercel o link cai no cabeçalho Host da requisição, que pode não ser público.'),
    );
    problemas++;
  }

  /* ---------- MAIL_FROM ---------- */
  const remetente = lerRemetente(process.env.MAIL_FROM);
  if (!remetente) {
    console.log(cores.aviso('· MAIL_FROM: não definida'));
    console.log(
      cores.fraco('    O padrão é "Lerich Finance <onboarding@resend.dev>", que só entrega\n' +
        '    para o e-mail dono da conta Resend — não serve para clientes.'),
    );
    problemas++;
  } else if (!remetente.valido) {
    console.log(cores.erro(`\n✗ MAIL_FROM não tem um endereço válido: ${process.env.MAIL_FROM}`));
    console.log(cores.fraco('  Formato esperado: Lerich Finance <nao-responda@seudominio.com>\n'));
    problemas++;
  } else {
    console.log(cores.fraco(`· MAIL_FROM: ${remetente.nome || '(sem nome)'} <${remetente.endereco}>`));
    if (!remetente.nome) {
      console.log(cores.fraco('    (um nome antes do endereço melhora a aparência na caixa de entrada)'));
    }
  }

  /* ---------- RESEND_API_KEY ---------- */
  const chave = process.env.RESEND_API_KEY?.trim();
  if (!chave) {
    console.log(cores.aviso('· RESEND_API_KEY: não definida'));
    console.log(
      cores.fraco(
        '\n  Sem ela nenhum e-mail sai: o link de recuperação é escrito no log do servidor.\n' +
          '  Isso mantém o fluxo testável, mas em produção o cliente nunca recebe o e-mail.\n' +
          '  Crie a chave em https://resend.com/api-keys\n',
      ),
    );
    process.exit(problemas ? 1 : 0);
  }

  if (!chave.startsWith('re_')) {
    console.log(cores.aviso('· RESEND_API_KEY: definida, mas não começa com "re_" — confira se é do Resend.'));
    problemas++;
  } else {
    console.log(cores.fraco(`· RESEND_API_KEY: definida (${chave.slice(0, 6)}…)`));
  }

  /* ---------- Domínios verificados no Resend ---------- */
  let dominios = null;
  try {
    const resposta = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${chave}` },
    });

    if (resposta.status === 401 || resposta.status === 403) {
      console.log(cores.erro('\n✗ O Resend recusou a chave (não autorizada).'));
      console.log(cores.fraco('  Gere outra em https://resend.com/api-keys e atualize .env.local e a Vercel.\n'));
      process.exit(1);
    }
    if (!resposta.ok) {
      console.log(cores.aviso(`\n! Não deu para listar os domínios (HTTP ${resposta.status}).`));
    } else {
      const dados = await resposta.json();
      dominios = Array.isArray(dados?.data) ? dados.data : [];
      console.log(cores.ok('\n✓ Chave aceita pelo Resend.'));

      if (!dominios.length) {
        console.log(cores.aviso('\n! Nenhum domínio cadastrado na conta.'));
        console.log(
          cores.fraco(
            '  Só dá para enviar de "onboarding@resend.dev", e apenas para o e-mail dono da conta.\n' +
              '  Para enviar aos clientes, cadastre um domínio em https://resend.com/domains\n',
          ),
        );
        problemas++;
      } else {
        console.log('\n  Domínios na conta:');
        for (const d of dominios) {
          const verificado = d.status === 'verified';
          const marca = verificado ? cores.ok('✓') : cores.aviso('•');
          console.log(`   ${marca} ${d.name} ${cores.fraco(`(${d.status}${d.region ? `, ${d.region}` : ''})`)}`);
        }

        if (remetente?.dominio) {
          const usado = dominios.find((d) => d.name?.toLowerCase() === remetente.dominio);
          if (remetente.dominio === 'resend.dev') {
            console.log(
              cores.aviso(
                `\n! MAIL_FROM usa @resend.dev: o Resend só entrega para o e-mail dono da conta.`,
              ),
            );
            problemas++;
          } else if (!usado) {
            console.log(
              cores.erro(`\n✗ O domínio "${remetente.dominio}" do MAIL_FROM não está cadastrado na conta.`),
            );
            console.log(cores.fraco('  O envio será recusado com 403. Cadastre-o em https://resend.com/domains\n'));
            problemas++;
          } else if (usado.status !== 'verified') {
            console.log(
              cores.aviso(`\n! O domínio "${remetente.dominio}" está como "${usado.status}", não "verified".`),
            );
            console.log(cores.fraco('  Publique os registros DNS que o Resend indica e clique em Verify.\n'));
            problemas++;
          } else {
            console.log(cores.ok(`\n✓ O domínio do remetente está verificado.`));
          }
        }
      }
    }
  } catch (causa) {
    console.log(cores.aviso(`\n! Falha de rede ao consultar o Resend: ${causa.message}`));
  }

  /* ---------- Envio de teste ---------- */
  const destino = process.argv[2]?.trim();
  if (!destino) {
    console.log(
      cores.fraco(
        '\n  Para enviar um e-mail de verdade e ver como ele chega:\n' +
          '    npm run mail:check -- voce@seudominio.com\n',
      ),
    );
  } else {
    console.log(`\nEnviando um e-mail de teste para ${destino}…`);

    const base = appUrl?.replace(/\/$/, '') ?? (urlVercel ? `https://${urlVercel}` : 'http://localhost:3000');
    const link = `${base}/redefinir-senha?token=EXEMPLO-SEM-VALOR`;

    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM?.trim() || 'Lerich Finance <onboarding@resend.dev>',
        to: [destino],
        subject: 'Teste de configuração · Lerich Finance',
        text:
          'Este é um teste de configuração do Lerich Finance.\n\n' +
          `Os links do sistema vão apontar para: ${base}\n` +
          `Exemplo de link de recuperação: ${link}\n\n` +
          'O token acima é fictício — a página vai recusá-lo, e é isso mesmo que deve acontecer.',
      }),
    });

    if (resposta.ok) {
      const { id } = await resposta.json().catch(() => ({}));
      console.log(cores.ok(`\n✓ E-mail aceito pelo Resend${id ? ` (id ${id})` : ''}.`));
      console.log(cores.fraco('  Confira a caixa de entrada e o spam. O painel do Resend mostra a entrega.\n'));
    } else {
      const detalhe = await resposta.text().catch(() => '');
      console.log(cores.erro(`\n✗ O Resend recusou o envio (HTTP ${resposta.status}).`));
      console.log(cores.fraco(`  ${detalhe}\n`));
      problemas++;
    }
  }

  if (problemas) {
    console.log(cores.aviso(`Pendências encontradas: ${problemas}.\n`));
    process.exit(1);
  }

  console.log(
    cores.fraco('  As mesmas variáveis precisam estar na Vercel (Production e Preview).\n'),
  );
}

main().catch((causa) => {
  console.log(cores.erro(`\n✗ Erro inesperado: ${causa.message}\n`));
  process.exit(1);
});

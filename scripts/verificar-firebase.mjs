/**
 * Diagnóstico da conexão com o Firestore.
 *
 *   npm run firebase:check
 *
 * Lê as variáveis de `.env.local` (ou do ambiente), conecta, grava um
 * documento de teste, lê de volta e apaga. Serve para confirmar que a
 * credencial está correta antes de subir para a Vercel.
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

function normalizarChave(chave) {
  return chave.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
}

function lerCredenciais() {
  const blob = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (blob) {
    const texto = blob.startsWith('{') ? blob : Buffer.from(blob, 'base64').toString('utf8');
    const json = JSON.parse(texto);
    return {
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: normalizarChave(json.private_key ?? ''),
      origem: 'FIREBASE_SERVICE_ACCOUNT',
    };
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
    privateKey: normalizarChave(process.env.FIREBASE_PRIVATE_KEY ?? ''),
    origem: 'FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY',
  };
}

async function main() {
  console.log('\nVerificação do Firebase — Lerich Finance\n');

  const carregou = carregarEnv('.env.local');
  console.log(carregou ? cores.fraco('· .env.local carregado') : cores.aviso('· .env.local não encontrado; usando o ambiente'));

  let credenciais;
  try {
    credenciais = lerCredenciais();
  } catch (causa) {
    console.log(cores.erro('\n✗ FIREBASE_SERVICE_ACCOUNT não é um JSON válido.'));
    console.log(cores.fraco(`  ${causa.message}`));
    process.exit(1);
  }

  const faltando = ['projectId', 'clientEmail', 'privateKey'].filter((campo) => !credenciais[campo]);
  if (faltando.length) {
    console.log(cores.erro('\n✗ Credencial incompleta.'));
    console.log(`  Origem esperada: ${credenciais.origem}`);
    console.log(`  Faltando: ${faltando.join(', ')}`);
    console.log(cores.fraco('\n  Veja a seção "Firebase" do README para o passo a passo.\n'));
    process.exit(1);
  }

  console.log(cores.fraco(`· projeto:  ${credenciais.projectId}`));
  console.log(cores.fraco(`· conta:    ${credenciais.clientEmail}`));

  if (!credenciais.privateKey.includes('BEGIN PRIVATE KEY')) {
    console.log(
      cores.erro('\n✗ A chave privada não parece estar no formato PEM (falta "BEGIN PRIVATE KEY").'),
    );
    console.log(cores.fraco('  Copie o valor inteiro de "private_key", incluindo os \\n.\n'));
    process.exit(1);
  }
  console.log(cores.fraco('· chave:    formato PEM reconhecido'));

  const { cert, initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  let db;
  try {
    const app = initializeApp({ credential: cert(credenciais) }, `check-${Date.now()}`);
    db = getFirestore(app);
  } catch (causa) {
    console.log(cores.erro('\n✗ Não foi possível inicializar o Admin SDK.'));
    console.log(cores.fraco(`  ${causa.message}\n`));
    process.exit(1);
  }

  const ref = db.collection('_diagnostico').doc('conexao');

  try {
    const carimbo = new Date().toISOString();
    await ref.set({ verificado_em: carimbo, origem: 'npm run firebase:check' });
    const lido = await ref.get();

    if (lido.data()?.verificado_em !== carimbo) {
      throw new Error('o documento lido não confere com o que foi gravado');
    }

    await ref.delete();
    console.log(cores.ok('\n✓ Conexão com o Firestore funcionando (gravou, leu e apagou um documento de teste).'));
  } catch (causa) {
    console.log(cores.erro('\n✗ Conectou, mas a operação no banco falhou.'));
    console.log(cores.fraco(`  ${causa.message}`));

    const texto = String(causa.message ?? '');
    if (texto.includes('NOT_FOUND') || texto.includes('does not exist')) {
      console.log(cores.aviso('\n  Provável causa: o banco Firestore ainda não foi criado no projeto.'));
      console.log(cores.fraco('  No console: Firestore Database → Criar banco de dados → modo produção.\n'));
    } else if (texto.includes('UNAUTHENTICATED') || texto.includes('invalid_grant')) {
      console.log(cores.aviso('\n  Provável causa: a credencial não é válida para este projeto.'));
      console.log(
        cores.fraco(
          '  Gere uma nova chave em Configurações do projeto → Contas de serviço → Gerar nova chave privada.\n' +
            '  Confira também se o project_id do arquivo é o mesmo do projeto que você abriu.\n',
        ),
      );
    } else if (texto.includes('PERMISSION_DENIED')) {
      console.log(cores.aviso('\n  Provável causa: a service account não tem permissão de escrita no Firestore.'));
      console.log(cores.fraco('  Confira o papel da conta em IAM (precisa de "Cloud Datastore User" ou superior).\n'));
    } else {
      console.log('');
    }
    process.exit(1);
  }

  console.log(
    cores.fraco('\n  As mesmas variáveis precisam ser cadastradas na Vercel (Production e Preview).\n'),
  );
}

main().catch((causa) => {
  console.log(cores.erro(`\n✗ Erro inesperado: ${causa.message}\n`));
  process.exit(1);
});

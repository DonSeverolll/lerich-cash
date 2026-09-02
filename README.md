# Lerich Finance

Gestão financeira com dois painéis — **administrador** e **cliente** — em identidade visual preta e dourada, com modo claro em prateado.

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS · Recharts.

---

## Como rodar

```bash
npm install
```

```bash
npm run dev
```

A aplicação sobe em `http://localhost:3000` e redireciona para `/login`.

Scripts disponíveis:

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |

## Acessos

**Não existe usuário padrão embutido no código.** O administrador é criado no primeiro boot a partir do ambiente:

```bash
cp .env.example .env.local
```

Preencha `AUTH_SECRET`, `ADMIN_USERNAME` e `ADMIN_PASSWORD` — só então o administrador é criado e gravado em `.data/store.json` (com a senha em hash; o texto puro nunca é persistido). Sem essas variáveis o sistema sobe sem administrador e registra um aviso no log.

`DEMO_PASSWORD` é opcional e cria o cliente `cliente.demo` para testar o painel do cliente. Deixe em branco em produção.

| Variável | Obrigatória | Função |
| --- | --- | --- |
| `AUTH_SECRET` | sim | Assina o cookie de sessão (32+ caracteres) |
| `ADMIN_USERNAME` | sim | Usuário do administrador inicial |
| `ADMIN_PASSWORD` | sim | Senha do administrador inicial |
| `ADMIN_NAME` / `ADMIN_EMAIL` | não | Exibição e contato do administrador |
| `DEMO_PASSWORD` | não | Cria o cliente de demonstração |

> Em produção a aplicação **recusa subir sem `AUTH_SECRET`**. Depois do primeiro acesso, troque a senha pelo painel (`Meu perfil → Alterar senha`) — a partir daí o hash gravado é a fonte da verdade e `ADMIN_PASSWORD` deixa de ser usada.

## Telas públicas

| Rota | O que faz |
| --- | --- |
| `/login` | Acesso com usuário e senha, com atalhos para cadastro e recuperação |
| `/cadastro` | Abertura de conta pelo próprio cliente (papel CLIENTE, plano FREE) |
| `/recuperar-senha` | Recuperação em 3 etapas: identificar → confirmar e-mail mascarado → enviar link |
| `/redefinir-senha?token=…` | Define a nova senha; valida o token antes de mostrar o formulário |

O cadastro público respeita a chave **Permitir cadastro público** das configurações do administrador — desligada, a tela explica que o acesso é criado pelo admin.

### Recuperação de senha

Na etapa de confirmação o endereço aparece parcialmente mascarado — `ma••••••••@ex•••••.com.br` — o bastante para o dono reconhecer sem expor o e-mail a quem apenas digitou o nome de usuário.

| Proteção | Como funciona |
| --- | --- |
| Token | 32 bytes aleatórios; o banco guarda apenas o SHA-256 |
| Validade | 1 hora, uso único; pedir um novo link invalida o anterior |
| Ticket entre etapas | Assinado com HMAC e válido por 10 min, para que o envio não possa ser disparado para uma conta arbitrária |
| Limite | Consultas e cadastros limitados por IP |
| Depois da troca | A senha antiga deixa de valer e não há login automático |

> A etapa de confirmação revela que a conta existe — é inerente a este desenho. O limite por IP é o que impede varredura. Para eliminar por completo, troque a tela de confirmação por uma resposta genérica ("se a conta existir, enviamos o link").

## Os dois painéis

### Painel do administrador (`/admin`)

- **Visão geral** — usuários, clientes ativos, planos pagos, volume em custódia, crescimento da base e eventos recentes.
- **Usuários** — criar, editar (nome, e-mail, perfil, plano, status), redefinir senha, suspender/reativar e remover. Busca e filtros por perfil e status.
- **Auditoria** — trilha de login, criação/alteração/remoção de usuários e troca de senha, com filtros e exportação em CSV.
- **Configurações** — marca, moeda, limite de contas por cliente, cadastro público e aviso de manutenção (exibido no topo do painel dos clientes).

### Painel do cliente (`/dashboard`)

- **Dashboard** — seletor de mês, saldo consolidado, receitas/despesas, resultado e taxa de poupança, fluxo mensal, distribuição por categoria, evolução do resultado e alerta de pendências.
- **Transações** — criar, editar, excluir e alternar status; busca, filtros, ordenação, paginação e exportação CSV.
- **Assinaturas** — cadastrar, editar, pausar, remover e lançar no mês (sem duplicar); comprometimento mensal e vencimentos próximos.
- **Saldo geral & Carteira** — cadastrar, editar e remover contas; saldo calculado do saldo inicial mais os lançamentos, com participação de cada uma.
- **Importar extrato** — leitura de OFX e CSV, conciliação lançamento a lançamento e gravação em lote.
- **Meu perfil** — dados da conta e troca de senha.

## Segurança

| Camada | Implementação |
| --- | --- |
| Senhas | PBKDF2-SHA256, 210.000 iterações, salt aleatório por usuário (`lib/auth/crypto.ts`) |
| Sessão | Cookie `httpOnly` + `sameSite=lax`, assinado com HMAC-SHA256, validade de 8h (`lib/auth/token.ts`) |
| Rotas | `proxy.ts` valida a sessão antes de renderizar e separa `/admin` de `/dashboard` por papel |
| APIs | Cada handler revalida sessão e papel; nunca confia no cliente |
| Login | Limite de 5 tentativas por usuário/IP, com bloqueio de 5 minutos (`lib/server/rate-limit.ts`) |
| Auditoria | Login, falha de login, logout e toda alteração de usuário ficam registrados |
| Proteções | Comparação em tempo constante, custo constante para usuário inexistente, redirect pós-login restrito a caminhos internos |

Regras de integridade: o sistema não deixa remover, rebaixar ou suspender o último administrador ativo, e ninguém remove a própria conta.

## E-mail transacional

O envio usa a API HTTP do Resend (sem SDK — só `fetch`, o que funciona em serverless).

| Variável | Função |
| --- | --- |
| `RESEND_API_KEY` | Chave do provedor. **Sem ela nenhum e-mail é enviado** |
| `MAIL_FROM` | Remetente verificado no provedor |
| `APP_URL` | Base dos links do e-mail; na Vercel é detectada automaticamente |

Sem a chave, o link de recuperação é gravado no log do servidor e a própria tela avisa disso — o fluxo continua testável em desenvolvimento sem configurar nada.

Para trocar de provedor, reescreva `enviarEmail` em `lib/server/mailer.ts`; o resto do fluxo não muda.

## Estrutura

```
app/
  (admin)/admin/...      Painel administrativo (layout com requireAdmin)
  (dashboard)/...        Painel do cliente (layout com requireSession)
  api/auth/...           Login, logout, cadastro e recuperação de senha
  api/admin/...          Usuários e configurações (somente ADMIN)
  api/account/password   Troca de senha do próprio usuário
  api/financas/...       CRUD financeiro do cliente da sessão
  login/                 Tela de acesso
  cadastro/              Abertura de conta pelo cliente
  recuperar-senha/       Recuperação em 3 etapas
  redefinir-senha/       Nova senha a partir do link do e-mail
components/
  admin/                 Views do painel administrativo
  shell/                 Shell compartilhado (sidebar, drawer, menu do usuário)
  theme/                 Provider e botão de alternância de tema
  ui/                    Primitivos (button, card, input, select, dialog, badge…)
lib/
  auth/                  Criptografia, token de sessão e helpers de servidor
  server/
    store/               Store: regras de negócio + drivers (Firestore, arquivo)
      financas.ts        Contas, categorias, assinaturas e transações
    mailer.ts            Envio de e-mail transacional
    rate-limit.ts        Limite de tentativas
  api-client.ts          Chamadas às rotas de API, com erro traduzido
  ofx-parser.ts          Leitura de OFX e CSV
proxy.ts                 Proteção de rotas (antigo middleware.ts do Next 15)
firebase/                Regras do Firestore e notas de configuração
scripts/                 Diagnóstico do Firebase (npm run firebase:check)
supabase/schema.sql      Esquema Postgres, caso um dia volte para SQL
```

## Temas

O site abre no **modo noturno** (preto e dourado) e tem um botão de acessibilidade no cabeçalho — e no canto das telas públicas — que alterna para o **modo claro**, onde o dourado vira um prateado escuro. A escolha fica no `localStorage`; sem escolha, o site segue a preferência do sistema.

A paleta inteira vive em variáveis CSS que guardam só os canais RGB, o que permite ao Tailwind continuar aplicando opacidade (`border-gold-500/20`). A escala clara é a escura **invertida**: `text-onyx-50` continua significando "texto de maior contraste" e `bg-onyx-950` continua significando "fundo", então nenhum componente precisou de variante por tema.

| Peça | Como acompanha o tema |
| --- | --- |
| Cores da interface | Variáveis em `app/globals.css`, sob `[data-tema='claro']` |
| Gráficos | `lib/chart-theme.ts` devolve a paleta pelo tema atual |
| Logotipo | Duas artes em `public/`; o CSS mostra a certa por `data-tema` |
| Transição | Cortina metálica varrendo da direita para a esquerda (`.cortina-tema`) |

O tema é aplicado por um script inline no `<head>`, antes da primeira pintura — sem ele, quem escolheu o claro veria um piscar escuro a cada carregamento.

## Marca

Os arquivos ficam em `public/` e são servidos com fundo transparente, prontos para o tema escuro:

| Arquivo | Uso |
| --- | --- |
| `logo-lerich-finance.png` | Lockup completo (dragão + nome) — modo noturno |
| `logo-lerich-finance-claro.png` | O mesmo lockup em prateado — modo claro |
| `mark-lerich-finance.png` | Só o símbolo — sidebar, drawer e avatares |
| `mark-lerich-finance-claro.png` | O símbolo em prateado — modo claro |
| `icon.png` | Favicon e ícone de app |

As versões claras foram derivadas das douradas invertendo a luminância: no modo claro o dourado desbota sobre o branco, e a palavra "LERICH", que é branca na arte original, desapareceria.

Os três são consumidos por `components/brand/logo.tsx` (`BrandLockup`, `BrandMark`, `BrandWordmark`). Para trocar a marca, substitua os PNGs mantendo os nomes.

## Persistência

O store escolhe onde gravar sozinho, a partir do ambiente:

| Driver | Quando é usado | Persiste na Vercel? |
| --- | --- | --- |
| **Cloud Firestore** | Quando as variáveis do Firebase estão preenchidas | Sim |
| **Arquivo** (`.data/store.json`) | Padrão, sem configuração | Não |
| **Memória** | Quando nem o arquivo pode ser gravado | Não |

O painel administrativo mostra o driver ativo na visão geral e em Configurações, com aviso quando não há persistência real. O código fica em `lib/server/store/`: `index.ts` tem as regras de negócio e cada driver implementa a interface de `repository.ts` — trocar de banco não mexe em nada acima do store.

## Firebase — passo a passo

Nunca usou o Firebase? Este roteiro cobre do zero até o site no ar.

### 1. Criar o projeto

1. Abra [console.firebase.google.com](https://console.firebase.google.com) e clique em **Criar um projeto**.
2. Dê um nome (ex.: `lerich-finance`). O Google Analytics é opcional — pode desativar.

### 2. Criar o banco Firestore

1. No menu lateral: **Criar** → **Firestore Database** → **Criar banco de dados**.
2. Escolha **Modo de produção** (o acesso é só pelo servidor; regras abertas seriam um vazamento).
3. Escolha a região — `southamerica-east1` (São Paulo) tem a menor latência para o Brasil. **A região não pode ser alterada depois.**

### 3. Gerar a credencial de servidor

1. Engrenagem ⚙ ao lado de *Visão geral do projeto* → **Configurações do projeto**.
2. Aba **Contas de serviço** → **Gerar nova chave privada** → confirme.
3. Um arquivo `.json` é baixado. Ele é **um segredo**: dá acesso total ao banco. Não coloque no Git, não mande por e-mail nem cole em chat.

### 4. Configurar o projeto local

Copie três campos do JSON para o `.env.local`:

```bash
cp .env.example .env.local
```

| Campo do JSON | Variável |
| --- | --- |
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

A chave privada vai **entre aspas e em uma linha só**, mantendo os `\n` como estão no arquivo:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

Se o painel onde você vai colar não aceitar bem quebras de linha, use a alternativa: jogue o **JSON inteiro** em `FIREBASE_SERVICE_ACCOUNT` (texto puro ou base64).

### 5. Conferir a conexão

```bash
npm run firebase:check
```

O script grava, lê e apaga um documento de teste, e explica o que fazer em cada erro comum (banco ainda não criado, credencial de outro projeto, permissão insuficiente). Passando aqui, `npm run dev` já sobe usando o Firestore — a visão geral do admin mostra **Cloud Firestore** no lugar do aviso amarelo.

### 6. Publicar as regras de segurança

O aplicativo acessa o Firestore **somente pelo servidor**, com o Admin SDK — que ignora as regras. Por isso as regras publicadas devem negar tudo do lado do cliente, senão hashes de senha e a auditoria ficam expostos a qualquer visitante.

Cole o conteúdo de `firebase/firestore.rules` em **Firestore Database → Regras** e publique.

### Coleções criadas

`usuarios`, `auditoria`, `configuracoes` e `recuperacoes` — criadas sozinhas no primeiro uso. Nenhum índice composto é necessário.

### Custo

O plano gratuito (Spark) cobre com folga o uso deste sistema: as leituras acontecem por requisição autenticada, não por visita. Se um dia migrar para o plano Blaze, vale configurar um alerta de orçamento.

## Deploy na Vercel

1. Importe o repositório na Vercel (o framework Next.js é detectado automaticamente).
2. Em *Settings → Environment Variables*, defina para **Production** e **Preview**:

| Variável | Observação |
| --- | --- |
| `AUTH_SECRET` | 32+ caracteres, diferente da usada em desenvolvimento |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Administrador inicial |
| `ADMIN_NAME`, `ADMIN_EMAIL` | Opcionais |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Persistência — **sem estas, os cadastros não sobrevivem ao próximo deploy** |
| `RESEND_API_KEY`, `MAIL_FROM`, `APP_URL` | Para o e-mail de recuperação sair de verdade |
| `DEMO_PASSWORD` | Deixe **em branco** em produção |

Gere o segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

3. Faça o deploy, entre no painel e **troque a senha do administrador** no primeiro acesso. A partir daí o hash gravado é a fonte da verdade e `ADMIN_PASSWORD` deixa de ser usada.
4. Confirme na visão geral do admin que o driver é **Cloud Firestore**.

Ao colar a chave privada na Vercel, mantenha as aspas e os `\n` — o campo aceita o valor em uma linha só.

Os dados financeiros ficam no mesmo store: contas, categorias, assinaturas e transações são gravadas por cliente, e cada consulta filtra por `user_id`. Uma conta nova recebe um conjunto inicial de categorias, e o painel oferece popular com dados de exemplo — só em conta vazia, para não misturar exemplo com dado real.

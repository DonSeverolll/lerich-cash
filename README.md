# Lerich Finance

Gestão financeira com dois painéis — **administrador** e **cliente** — em identidade visual preta e dourada.

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

- **Dashboard** — seletor de mês, saldo consolidado, receitas/despesas, resultado e taxa de poupança, fluxo mensal, distribuição por categoria, evolução do resultado e alerta de lançamentos pendentes.
- **Transações** — busca, filtros (tipo, conta, status), ordenação, paginação e exportação CSV.
- **Assinaturas** — comprometimento mensal, vencimentos dos próximos 7 dias, impacto de cada serviço e pausar/reativar.
- **Contas** — patrimônio consolidado, entradas/saídas e participação de cada conta.
- **Importar extrato** — leitura de OFX e CSV com pré-visualização, escolha de conta/categoria por lançamento e conciliação antes de confirmar.
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
  login/                 Tela de acesso
  cadastro/              Abertura de conta pelo cliente
  recuperar-senha/       Recuperação em 3 etapas
  redefinir-senha/       Nova senha a partir do link do e-mail
components/
  admin/                 Views do painel administrativo
  shell/                 Shell compartilhado (sidebar, drawer, menu do usuário)
  ui/                    Primitivos (button, card, input, select, dialog, badge…)
lib/
  auth/                  Criptografia, token de sessão e helpers de servidor
  server/                Store, envio de e-mail e rate limit
  mock-data.ts           Dados de demonstração gerados a partir do mês atual
  ofx-parser.ts          Leitura de OFX e CSV
proxy.ts                 Proteção de rotas (antigo middleware.ts do Next 15)
supabase/schema.sql      Esquema Postgres: finanças, perfis, auditoria e RLS
```

## Marca

Os arquivos ficam em `public/` e são servidos com fundo transparente, prontos para o tema escuro:

| Arquivo | Uso |
| --- | --- |
| `logo-lerich-finance.png` | Lockup completo (dragão + nome) — tela de login |
| `mark-lerich-finance.png` | Só o símbolo — sidebar, drawer e avatares |
| `icon.png` | Favicon e ícone de app |

Os três são consumidos por `components/brand/logo.tsx` (`BrandLockup`, `BrandMark`, `BrandWordmark`). Para trocar a marca, substitua os PNGs mantendo os nomes.

## Persistência

Por padrão os dados de acesso ficam em `.data/store.json` (ignorado pelo Git). O arquivo é revalidado por `mtime`, então rotas diferentes sempre leem a versão mais recente. Em ambientes com sistema de arquivos somente leitura a aplicação degrada para memória e o painel administrativo avisa na visão geral.

## Deploy na Vercel

> ⚠️ **Leia antes de publicar.** O store em arquivo **não persiste na Vercel**: o sistema de arquivos é efêmero e cada instância serverless é isolada. Na prática, usuários criados pelo painel somem no próximo deploy ou na próxima instância fria, e o administrador é re-semeado a partir das variáveis de ambiente a cada boot. O painel avisa isso na visão geral.
>
> Para uma operação real, migre o store para o Supabase antes (veja abaixo). Enquanto isso não acontece, o deploy funciona para demonstração — login, papéis e todas as telas — mas **não** como cadastro definitivo de usuários.

1. Importe o repositório na Vercel (framework Next.js detectado automaticamente).
2. Em *Settings → Environment Variables*, defina para **Production** e **Preview**:
   - `AUTH_SECRET` — chave de 32+ caracteres, diferente da usada em desenvolvimento
   - `ADMIN_USERNAME` e `ADMIN_PASSWORD`
   - `ADMIN_NAME`, `ADMIN_EMAIL` (opcionais)
   - `RESEND_API_KEY`, `MAIL_FROM` e `APP_URL` para o e-mail de recuperação sair de verdade
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` quando for usar o Supabase
   - deixe `DEMO_PASSWORD` **em branco** em produção
3. Faça o deploy e troque a senha do administrador pelo painel no primeiro acesso.

### Migrando o store para o Supabase

Preencher as chaves do Supabase **não é suficiente por si só**: hoje `lib/server/store.ts` grava em arquivo e é ele quem precisa passar a falar com o banco. O caminho:

1. Aplique `supabase/schema.sql` no projeto Supabase — ele já cria `perfis`, `auditoria`, `configuracoes`, as policies de RLS e a função `public.is_admin()`.
2. Reescreva as funções exportadas de `lib/server/store.ts` (`listUsers`, `createUser`, `updateUser`, `deleteUser`, `authenticate`, `recordAudit`, `listAudit`, `getSettings`, `updateSettings`) usando o cliente do Supabase. A assinatura de cada uma já é assíncrona, então nada acima delas muda.
3. Use a *service role key* (variável **sem** o prefixo `NEXT_PUBLIC_`) apenas no servidor, para as operações administrativas.

Os dados financeiros exibidos hoje são de demonstração (`lib/mock-data.ts`), gerados a partir do mês corrente para que o painel nunca apareça vazio.

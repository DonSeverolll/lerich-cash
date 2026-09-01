create extension if not exists pgcrypto;

create type public.account_type as enum ('CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CARTEIRA');
create type public.category_type as enum ('RECEITA', 'DESPESA');
create type public.transaction_type as enum ('RECEITA', 'DESPESA');
create type public.transaction_status as enum ('PENDENTE', 'EFETIVADA');

create table public.contas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo public.account_type not null default 'CORRENTE',
  saldo_inicial numeric(12,2) not null default 0,
  cor_hex text not null default '#10b981',
  created_at timestamptz not null default now()
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo public.category_type not null,
  cor_hex text not null default '#10b981',
  icone text not null default 'circle'
);

create table public.assinaturas_planos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conta_id uuid not null references public.contas(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  nome_servico text not null,
  valor numeric(12,2) not null check (valor >= 0),
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conta_id uuid not null references public.contas(id) on delete restrict,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  assinatura_id uuid null references public.assinaturas_planos(id) on delete set null,
  descricao text not null,
  valor numeric(12,2) not null,
  tipo public.transaction_type not null,
  data_transacao date not null,
  status public.transaction_status not null default 'PENDENTE',
  created_at timestamptz not null default now()
);

alter table public.contas enable row level security;
alter table public.categorias enable row level security;
alter table public.assinaturas_planos enable row level security;
alter table public.transacoes enable row level security;

create policy "Users can view their own accounts" on public.contas for select using (auth.uid() = user_id);
create policy "Users can insert their own accounts" on public.contas for insert with check (auth.uid() = user_id);
create policy "Users can update their own accounts" on public.contas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own accounts" on public.contas for delete using (auth.uid() = user_id);

create policy "Users can view their own categories" on public.categorias for select using (auth.uid() = user_id);
create policy "Users can insert their own categories" on public.categorias for insert with check (auth.uid() = user_id);
create policy "Users can update their own categories" on public.categorias for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own categories" on public.categorias for delete using (auth.uid() = user_id);

create policy "Users can view their own subscriptions" on public.assinaturas_planos for select using (auth.uid() = user_id);
create policy "Users can insert their own subscriptions" on public.assinaturas_planos for insert with check (auth.uid() = user_id);
create policy "Users can update their own subscriptions" on public.assinaturas_planos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own subscriptions" on public.assinaturas_planos for delete using (auth.uid() = user_id);

create policy "Users can view their own transactions" on public.transacoes for select using (auth.uid() = user_id);
create policy "Users can insert their own transactions" on public.transacoes for insert with check (auth.uid() = user_id);
create policy "Users can update their own transactions" on public.transacoes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own transactions" on public.transacoes for delete using (auth.uid() = user_id);

create index if not exists idx_contas_user_id on public.contas(user_id);
create index if not exists idx_categorias_user_id on public.categorias(user_id);
create index if not exists idx_assinaturas_user_id on public.assinaturas_planos(user_id);
create index if not exists idx_transacoes_user_id on public.transacoes(user_id);
create index if not exists idx_transacoes_data on public.transacoes(data_transacao desc);

-- ============================================================================
-- Perfis, papéis e auditoria
-- ----------------------------------------------------------------------------
-- Usado quando a autenticação migrar do arquivo local (.data/store.json) para
-- o Supabase. O papel fica em `perfis.role` e é lido pelas policies abaixo.
-- ============================================================================

create type public.user_role as enum ('ADMIN', 'CLIENTE');
create type public.user_status as enum ('ATIVO', 'SUSPENSO');
create type public.user_plan as enum ('FREE', 'PRO', 'PREMIUM');

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  nome text not null,
  email text not null,
  role public.user_role not null default 'CLIENTE',
  status public.user_status not null default 'ATIVO',
  plano public.user_plan not null default 'FREE',
  created_at timestamptz not null default now(),
  last_login_at timestamptz null
);

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor text not null,
  target uuid null,
  detalhe text not null,
  created_at timestamptz not null default now()
);

create table public.configuracoes (
  id boolean primary key default true check (id),
  nome_marca text not null default 'Lerich Cash',
  moeda text not null default 'BRL',
  permitir_cadastro_publico boolean not null default false,
  limite_contas_por_cliente integer not null default 10 check (limite_contas_por_cliente between 1 and 100),
  aviso_manutencao text not null default ''
);

insert into public.configuracoes (id) values (true) on conflict do nothing;

alter table public.perfis enable row level security;
alter table public.auditoria enable row level security;
alter table public.configuracoes enable row level security;

-- `security definer` evita recursão de policy ao consultar a própria tabela.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and role = 'ADMIN' and status = 'ATIVO'
  );
$$;

create policy "Perfil próprio visível" on public.perfis for select using (auth.uid() = id or public.is_admin());
create policy "Perfil próprio editável" on public.perfis for update using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());
create policy "Admin cria perfis" on public.perfis for insert with check (public.is_admin());
create policy "Admin remove perfis" on public.perfis for delete using (public.is_admin());

create policy "Auditoria só para admin" on public.auditoria for select using (public.is_admin());
create policy "Auditoria inserida pelo sistema" on public.auditoria for insert with check (auth.uid() is not null);

create policy "Configurações visíveis a autenticados" on public.configuracoes for select using (auth.uid() is not null);
create policy "Configurações editáveis por admin" on public.configuracoes for update using (public.is_admin()) with check (public.is_admin());

-- Admins também enxergam os dados financeiros de qualquer cliente.
create policy "Admin vê todas as contas" on public.contas for select using (public.is_admin());
create policy "Admin vê todas as transações" on public.transacoes for select using (public.is_admin());
create policy "Admin vê todas as assinaturas" on public.assinaturas_planos for select using (public.is_admin());

create index if not exists idx_perfis_role on public.perfis(role);
create index if not exists idx_auditoria_created_at on public.auditoria(created_at desc);

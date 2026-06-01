-- ============================================================================
-- Finance Pro — Schema completo com Row Level Security (RLS)
-- ============================================================================
-- Cole este arquivo inteiro no Supabase Dashboard → SQL Editor → New Query → Run
-- Idempotente: pode rodar novamente sem quebrar (usa IF NOT EXISTS / OR REPLACE).
--
-- REGRA DE OURO: toda tabela tem RLS ATIVADO e policy auth.uid() = user_id.
-- Assim cada usuário só enxerga e altera os próprios dados.
-- ============================================================================

-- Extensão para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1) PROFILES (espelha auth.users com dados públicos do usuário)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  email       text,
  avatar_url  text,
  data        jsonb not null default '{}'::jsonb,  -- snapshot completo do app (fonte da verdade na nuvem)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Se a tabela já existia sem a coluna `data`, adiciona agora (idempotente)
alter table public.profiles add column if not exists data jsonb not null default '{}'::jsonb;

-- Realtime para o profiles (sincronização PC ↔ celular do snapshot)
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when others then null;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Trigger: cria profile automaticamente ao registrar usuário (fallback)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Helper: macro para criar tabela de dados com RLS padronizada
-- Cada tabela abaixo segue o mesmo padrão:
--   user_id uuid not null references auth.users(id)
--   data jsonb  (payload do registro vindo do app)
--   + colunas indexáveis quando úteis
-- Mantemos um modelo híbrido: colunas-chave + jsonb `data` para flexibilidade.
-- ----------------------------------------------------------------------------

-- 2) EMPRESAS
create table if not exists public.empresas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null default '',
  setor       text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3) CONTAS BANCÁRIAS
create table if not exists public.contas_bancarias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  nome        text not null default '',
  tipo        text,
  banco       text,
  saldo_inicial numeric not null default 0,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 4) TRANSACOES
create table if not exists public.transacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  conta_id    uuid references public.contas_bancarias(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  tipo        text,
  valor       numeric not null default 0,
  categoria   text,
  descricao   text,
  data_mov    date,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 5) TRANSFERENCIAS
create table if not exists public.transferencias (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  empresa_id      uuid references public.empresas(id) on delete cascade,
  conta_origem_id uuid references public.contas_bancarias(id) on delete set null,
  conta_destino_id uuid references public.contas_bancarias(id) on delete set null,
  valor           numeric not null default 0,
  data            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 6) RECEITAS
create table if not exists public.receitas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 7) DESPESAS
create table if not exists public.despesas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 8) ORCAMENTOS
create table if not exists public.orcamentos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 9) SIMULACOES
create table if not exists public.simulacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 10) PROJETOS
create table if not exists public.projetos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 11) METAS
create table if not exists public.metas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 12) DRE_PERIODOS
create table if not exists public.dre_periodos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  mes         int,
  ano         int,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 13) CONTAS_PAGAR
create table if not exists public.contas_pagar (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 14) CONTAS_RECEBER
create table if not exists public.contas_receber (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 15) FUNCIONARIOS
create table if not exists public.funcionarios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 16) INSUMOS
create table if not exists public.insumos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- RLS — ativa e cria policies (select/insert/update/delete) para TODAS as
-- tabelas de dados de uma vez via DO block.
-- ============================================================================
do $$
declare
  t text;
  tabelas text[] := array[
    'empresas','contas_bancarias','transacoes','transferencias',
    'receitas','despesas','orcamentos','simulacoes','projetos','metas',
    'dre_periodos','contas_pagar','contas_receber','funcionarios','insumos'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "%s_select_own" on public.%I;', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I;', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I;', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I;', t, t);

    execute format(
      'create policy "%s_select_own" on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format(
      'create policy "%s_insert_own" on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format(
      'create policy "%s_update_own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t, t);
    execute format(
      'create policy "%s_delete_own" on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- ============================================================================
-- Índices por user_id (performance) + updated_at (sync incremental)
-- ============================================================================
do $$
declare
  t text;
  tabelas text[] := array[
    'empresas','contas_bancarias','transacoes','transferencias',
    'receitas','despesas','orcamentos','simulacoes','projetos','metas',
    'dre_periodos','contas_pagar','contas_receber','funcionarios','insumos'
  ];
begin
  foreach t in array tabelas loop
    execute format('create index if not exists idx_%s_user on public.%I(user_id);', t, t);
    execute format('create index if not exists idx_%s_updated on public.%I(updated_at);', t, t);
  end loop;
end $$;

-- ============================================================================
-- Trigger updated_at automático em todas as tabelas
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tabelas text[] := array[
    'profiles','empresas','contas_bancarias','transacoes','transferencias',
    'receitas','despesas','orcamentos','simulacoes','projetos','metas',
    'dre_periodos','contas_pagar','contas_receber','funcionarios','insumos'
  ];
begin
  foreach t in array tabelas loop
    execute format('drop trigger if exists trg_%s_updated on public.%I;', t, t);
    execute format(
      'create trigger trg_%s_updated before update on public.%I for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ============================================================================
-- Realtime — publica as tabelas para sincronização em tempo real
-- (PC ↔ celular). Ignora erro se já estiverem na publicação.
-- ============================================================================
do $$
declare
  t text;
  tabelas text[] := array[
    'empresas','contas_bancarias','transacoes','transferencias',
    'receitas','despesas','orcamentos','simulacoes','projetos','metas',
    'dre_periodos','contas_pagar','contas_receber','funcionarios','insumos'
  ];
begin
  foreach t in array tabelas loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when others then
      -- já está na publicação; segue em frente
      null;
    end;
  end loop;
end $$;

-- ============================================================================
-- FIM. Verifique em Database → Tables que RLS está "Enabled" em todas.
-- ============================================================================

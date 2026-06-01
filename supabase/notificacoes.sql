-- ============================================================================
-- Finance Pro — Notificações por e-mail (tabelas + RLS + cron)
-- Cole no Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

-- 1) Preferências de notificação por usuário
create table if not exists public.preferencias_notificacao (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  email         text,
  ativo         boolean not null default true,
  antecedencias int[]  not null default '{7,3,1,0}',
  horario       text   not null default '08:00',
  tipos         jsonb  not null default '{"contasEmpresa":true,"despesasPessoais":true,"aportes":false,"impostos":false}'::jsonb,
  updated_at    timestamptz not null default now()
);

alter table public.preferencias_notificacao enable row level security;
drop policy if exists "pref_notif_own" on public.preferencias_notificacao;
create policy "pref_notif_own" on public.preferencias_notificacao
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Registro de notificações enviadas (evita duplicar)
create table if not exists public.registro_notificacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  conta_id    text not null,        -- id da conta (dentro do snapshot)
  nivel_aviso int  not null,        -- dias de antecedência do aviso enviado
  enviado_em  timestamptz not null default now()
);

alter table public.registro_notificacoes enable row level security;
drop policy if exists "reg_notif_own" on public.registro_notificacoes;
create policy "reg_notif_own" on public.registro_notificacoes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create unique index if not exists idx_reg_notif_unico
  on public.registro_notificacoes(user_id, conta_id, nivel_aviso);

-- ============================================================================
-- 3) CRON diário — chama a Edge Function `enviar-lembretes`
-- Requer extensões pg_cron e pg_net (ative em Database → Extensions).
-- ============================================================================
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;

-- Substitua SEU-PROJETO e a SERVICE_ROLE_KEY (use um secret/vault em produção).
-- Roda todo dia às 11:00 UTC = 08:00 em Brasília (UTC-3).
--
-- select cron.schedule(
--   'enviar-lembretes-diario',
--   '0 11 * * *',
--   $$
--   select net.http_post(
--     url := 'https://SEU-PROJETO.supabase.co/functions/v1/enviar-lembretes',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY'
--     ),
--     body := jsonb_build_object('cron', true)
--   );
--   $$
-- );
--
-- Para remover: select cron.unschedule('enviar-lembretes-diario');

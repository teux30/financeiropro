-- ============================================================================
-- Finance Pro — Agendamento DIÁRIO dos lembretes por e-mail
-- Chama a Edge Function "clever-task" todo dia, de forma segura (chave no Vault).
-- Cole no Supabase → SQL Editor e rode os blocos na ordem. Idempotente.
-- ============================================================================

-- 1) Extensões necessárias --------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Guardar segredos no Vault (rode UMA vez; troque pelos seus valores) -----
--    • project_url        = https://SEU-PROJECT-REF.supabase.co
--    • service_role_key    = a Service Role Key (Settings → API). NUNCA vai no frontend.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'project_url') then
    perform vault.create_secret('https://SEU-PROJECT-REF.supabase.co', 'project_url');
  end if;
  if not exists (select 1 from vault.secrets where name = 'service_role_key') then
    perform vault.create_secret('COLE_AQUI_SUA_SERVICE_ROLE_KEY', 'service_role_key');
  end if;
end $$;

-- Para ATUALIZAR um segredo já existente (se digitou errado):
-- select vault.update_secret(
--   (select id from vault.secrets where name = 'service_role_key'),
--   'NOVA_SERVICE_ROLE_KEY'
-- );

-- 3) Agendar o envio diário --------------------------------------------------
--    08:00 em Brasília (UTC-3) = 11:00 UTC. Ajuste o horário se quiser.
--    Remove um agendamento anterior de mesmo nome antes de recriar.
select cron.unschedule('lembretes-diario')
where exists (select 1 from cron.job where jobname = 'lembretes-diario');

select cron.schedule(
  'lembretes-diario',
  '0 11 * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/clever-task',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := jsonb_build_object('cron', true)
  );
  $cron$
);

-- ============================================================================
-- Úteis
-- ============================================================================
-- Ver agendamentos:        select jobid, jobname, schedule, active from cron.job;
-- Ver últimas execuções:   select * from cron.job_run_details order by start_time desc limit 10;
-- Cancelar:                select cron.unschedule('lembretes-diario');

-- Disparar AGORA para testar (não espera o horário):
-- select net.http_post(
--   url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
--          || '/functions/v1/clever-task',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--   ),
--   body := jsonb_build_object('cron', true)
-- );

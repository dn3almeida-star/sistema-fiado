-- Agenda o push diário (Edge Function push-diario) às 11:00 UTC = 08:00 BRT,
-- mesmo horário do lembrete. Reusa o segredo compartilhado do app_config
-- (criado na migração do lembrete). Rodar no SQL Editor com os valores reais.
-- Spec: docs/superpowers/specs/2026-07-11-push-notificacao-design.md

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('push-diario')
where exists (select 1 from cron.job where jobname = 'push-diario');

select cron.schedule(
  'push-diario',
  '0 11 * * *',
  $cron$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/push-diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_PUBLISHABLE_KEY>',
      'x-cron-secret', (select valor from public.app_config where chave = 'lembrete_cron_secret')
    )
  );
  $cron$
);

-- Lembrete diário: agenda a Edge Function lembrete-diario às 11:00 UTC (08:00 BRT).
-- Rodar no SQL Editor do Supabase (ou via db push). Requer projeto Pro? Não —
-- pg_cron e pg_net estão disponíveis no plano free do Supabase.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reagendar é seguro: remove o job anterior se já existir.
select cron.unschedule('lembrete-diario')
where exists (select 1 from cron.job where jobname = 'lembrete-diario');

select cron.schedule(
  'lembrete-diario',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/lembrete-diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_ANON_KEY>'
    )
  );
  $$
);

-- Segurança: autentica o cron ao chamar a Edge Function lembrete-diario.
-- Antes, qualquer um com a publishable key (pública, vai no bundle do front) e a
-- URL da função podia dispará-la — spam no WhatsApp do dono + consumo da cota do
-- CallMeBot. Agora só quem apresentar um segredo compartilhado (que vive em
-- public.app_config, tabela inacessível via API) consegue; a função devolve 401
-- para o resto. Rodar no SQL Editor do Supabase (valores reais preenchidos ao vivo).

-- 1) Config privada: RLS ligado, SEM políticas → nenhum acesso via API. Só o
--    service role (bypassa RLS, usado pela função) e o postgres (cron) leem.
create table if not exists public.app_config (
  chave text primary key,
  valor text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- 2) Segredo aleatório gerado no próprio banco (2x UUID sem hífens = 64 hex).
--    on conflict do nothing: não sobrescreve se já existir.
insert into public.app_config (chave, valor)
values (
  'lembrete_cron_secret',
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
)
on conflict (chave) do nothing;

-- 3) Reagenda o cron enviando o segredo no header x-cron-secret (lido do
--    app_config em tempo de execução; nunca materializado no texto do job).
select cron.unschedule('lembrete-diario')
where exists (select 1 from cron.job where jobname = 'lembrete-diario');

select cron.schedule(
  'lembrete-diario',
  '0 11 * * *',
  $cron$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/lembrete-diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_PUBLISHABLE_KEY>',
      'x-cron-secret', (select valor from public.app_config where chave = 'lembrete_cron_secret')
    )
  );
  $cron$
);

-- Cadastro self-service + teste grátis de 30 dias.
--
-- Contexto: até aqui os lojistas eram criados na mão no Supabase (não havia
-- signup na interface). Com a página de cadastro, o profile precisa nascer
-- junto com a conta — inclusive quando a confirmação de email está LIGADA
-- (nesse caso o cliente não tem sessão após o signUp, então não conseguiria
-- inserir o próprio profile via API por causa da RLS). A solução padrão do
-- Supabase é um trigger security definer no insert de auth.users.
--
-- O que muda:
--   1) profiles ganha `plano` ('teste' por padrão) e `teste_termina_em`
--      (data local de São Paulo + 30 dias). Linhas existentes recebem o
--      default de plano e ficam com teste_termina_em NULL (contas antigas,
--      criadas na mão — o enforcement de paywall é escopo futuro e decidirá
--      o que fazer com NULL; nada quebra hoje).
--   2) Trigger cria o profile do usuário novo com o nome_loja vindo dos
--      metadados do signUp (raw_user_meta_data), plano 'teste' e o fim do
--      teste. `on conflict do nothing` preserva qualquer profile já existente
--      (ex.: usuário antigo recriado) e torna a migração idempotente.
--
-- RLS: inalterada. O trigger roda como security definer (dono da função),
-- padrão recomendado pelo Supabase para esse caso; a API continua só
-- enxergando/alterando o próprio profile (policy id = auth.uid()).

-- 1) Colunas novas
alter table public.profiles
  add column if not exists plano text not null default 'teste',
  add column if not exists teste_termina_em date;

-- 2) Função do trigger
create or replace function public.criar_profile_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome_loja, plano, teste_termina_em)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'nome_loja', '')), ''),
    'teste',
    (now() at time zone 'America/Sao_Paulo')::date + 30
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3) Trigger no auth.users (recriado de forma idempotente)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_profile_novo_usuario();

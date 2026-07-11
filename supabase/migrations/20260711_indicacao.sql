-- Programa de indicação (gtm §4): quem indica ganha 1 mês quando o indicado
-- assina. Guarda quem indicou cada lojista e se a recompensa já foi creditada.
-- Spec: docs/superpowers/specs/2026-07-11-crescimento-design.md

alter table public.profiles
  add column if not exists indicado_por uuid,
  add column if not exists indicacao_creditada boolean not null default false;

-- Trigger de criação do profile: agora também grava indicado_por vindo dos
-- metadados do signUp. Cast seguro — valor malformado vira NULL (não quebra).
create or replace function public.criar_profile_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_texto text := new.raw_user_meta_data->>'indicado_por';
  ref_uuid  uuid := case
    when ref_texto ~ '^[0-9a-fA-F-]{36}$' then ref_texto::uuid
    else null
  end;
begin
  insert into public.profiles (id, nome_loja, plano, teste_termina_em, indicado_por)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'nome_loja', '')), ''),
    'teste',
    (now() at time zone 'America/Sao_Paulo')::date + 30,
    case when ref_uuid = new.id then null else ref_uuid end  -- ignora auto-indicação
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_profile_novo_usuario();

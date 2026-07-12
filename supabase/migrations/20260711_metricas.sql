-- Painel de métricas do funil (gtm §9), só pro fundador. A RLS impede um usuário
-- de ler dados dos outros; esta função security definer agrega tudo, mas checa
-- auth.uid() e só responde pra conta do dono do negócio.
-- Spec: docs/superpowers/specs/2026-07-11-metricas-design.md

create or replace function public.metricas_funil()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trava dura: só o fundador (dn3almeida). Qualquer outro recebe erro.
  if auth.uid() <> 'c69e3937-9855-4b67-ae51-868e3676fdb2'::uuid then
    raise exception 'nao autorizado';
  end if;

  return json_build_object(
    'cadastros', (select count(*) from profiles),
    'ativados', (
      select count(distinct v.user_id) from vendas v
      where exists (
        select 1 from jsonb_array_elements(coalesce(v.parcelas, '[]'::jsonb)) p
        where p->>'ultimaCobrancaEm' is not null
      )
    ),
    'pagantes', (select count(*) from profiles where plano = 'pago'),
    'emTeste', (select count(*) from profiles where plano = 'teste'),
    'gratis',  (select count(*) from profiles where plano = 'gratis'),
    'indicacoes', (select count(*) from profiles where indicado_por is not null),
    'indicacoesConvertidas', (
      select count(*) from profiles where indicado_por is not null and plano = 'pago'
    )
  );
end;
$$;

revoke all on function public.metricas_funil() from public, anon;
grant execute on function public.metricas_funil() to authenticated;

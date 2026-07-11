-- Pagamento da assinatura via Pix (Mercado Pago). Adiciona validade ao plano
-- pago e uma tabela de log/idempotência dos pagamentos.
-- Rodar via db push ou SQL Editor. Spec: docs/superpowers/specs/2026-07-11-pagamento-pix.

-- Validade da assinatura paga. NULL = permanente (contas do pai/fundador);
-- com data = assinatura Pix avulsa (vence em 30 dias).
alter table public.profiles
  add column if not exists plano_expira_em date;

-- Log dos pagamentos do Mercado Pago. A PK é o id do pagamento no MP, o que
-- torna o webhook idempotente (upsert por id não duplica).
create table if not exists public.pagamentos (
  id           text primary key,               -- payment_id do Mercado Pago
  user_id      uuid not null references auth.users(id) on delete cascade,
  valor        numeric(10,2) not null,
  status       text not null,                  -- approved, pending, rejected, ...
  criado_em    timestamptz not null default now()
);

create index if not exists pagamentos_user_id_idx on public.pagamentos (user_id);

-- RLS: ninguém escreve pela API pública. Só as Edge Functions (service role,
-- que ignora RLS) inserem/atualizam. O dono pode ler os próprios pagamentos.
alter table public.pagamentos enable row level security;

drop policy if exists "dono le seus pagamentos" on public.pagamentos;
create policy "dono le seus pagamentos"
  on public.pagamentos for select
  using (auth.uid() = user_id);

-- Sem políticas de insert/update/delete → bloqueado para anon/authenticated.
revoke insert, update, delete on public.pagamentos from anon, authenticated;

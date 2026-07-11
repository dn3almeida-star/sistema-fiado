-- Notificação push (PWA): inscrições Web Push por lojista.
-- Spec: docs/superpowers/specs/2026-07-11-push-notificacao-design.md

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,          -- URL única da inscrição no navegador
  p256dh     text not null,                 -- chave pública do cliente (payload encryption)
  auth       text not null,                 -- segredo de autenticação do cliente
  criado_em  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- RLS: cada lojista gerencia só as próprias inscrições. O cron (service role)
-- ignora RLS pra ler todas na hora de enviar.
alter table public.push_subscriptions enable row level security;

drop policy if exists "dono gerencia suas inscricoes" on public.push_subscriptions;
create policy "dono gerencia suas inscricoes"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

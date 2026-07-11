# Spec — Notificação push (PWA) — o lembrete que escala

## Contexto
O lembrete diário hoje usa CallMeBot e **só funciona pro dono cadastrado (o pai
do fundador)** — não escala pra vários lojistas (gtm §apêndice). O substituto que
escala é a **notificação push do PWA**: avisa qualquer lojista no celular ("você
tem N cobranças hoje"), sem depender de número/serviço externo por usuário. É a
maior peça que falta no produto.

Infra atual: PWA com service worker manual (`public/sw.js`, só cache; registrado
em `main.jsx`), manifest + ícones prontos. Não há push handler nem VAPID.

## Objetivo
Todo lojista pode **ativar avisos no celular**. Uma vez por dia, quem tem parcela
vencida/vencendo hoje recebe um push ("Você tem N cobranças hoje — R$ X"); tocar
abre o app na tela de Cobranças.

## Como funciona (Web Push + VAPID)
1. **Chaves VAPID** (par ECDSA P-256): pública vai no front; privada é secret da
   Edge Function. Geradas uma vez.
2. **Front** pede permissão de notificação e faz `PushManager.subscribe(
   applicationServerKey = VAPID pública)`. A inscrição (endpoint + chaves p256dh/
   auth) é salva em `push_subscriptions` (por user_id).
3. **Service worker** ganha handlers `push` (mostra a notificação) e
   `notificationclick` (foca/abre o app em /cobrancas).
4. **Cron diário** (Edge Function `push-diario`, agendada como o lembrete): para
   cada usuário com inscrição, calcula o resumo do dia (mesma lógica de fila de
   cobrança) e, se houver cobranças, envia Web Push (VAPID + payload criptografado)
   para as inscrições dele. Inscrição inválida (410/404) é removida.

## Decisões
- **Convive com o CallMeBot** (não mexo no lembrete-diario). O pai pode receber os
  dois por ora; CallMeBot pode ser aposentado depois.
- **Opt-in explícito** por lojista (permissão do navegador + toggle no app).
  Nada de push sem o usuário ativar.
- **Horário:** mesmo do lembrete (08:00 America/Sao_Paulo = 11:00 UTC).
- **iOS:** push em PWA só funciona com o app instalado na tela inicial (iOS
  16.4+). Documentar; não bloqueia Android/desktop (maioria do público).
- **Biblioteca de envio:** Web Push encryption é complexo; usar lib Deno-friendly
  (`jsr:@negrel/webpush` ou `npm:web-push`) — validar no momento da implementação.

## Design por componente
- **Migração `20260711_push_subscriptions.sql`:** tabela `push_subscriptions`
  (id uuid pk default gen_random_uuid, user_id uuid fk auth.users on delete
  cascade, endpoint text unique, p256dh text, auth text, criado_em timestamptz).
  RLS: dono gerencia as suas (select/insert/delete `auth.uid() = user_id`).
- **`public/sw.js`:** + listener `push` → `showNotification(title, { body, icon,
  badge, data:{ url } })`; + `notificationclick` → `clients.openWindow(url)` /
  focar aba existente. Bump do `CACHE_NAME` (v4) pra forçar atualização do SW.
- **Função pura `src/utils/push.js` (TDD):**
  - `montarResumoPush(vendas, clientes, hojeISO) → { titulo, corpo, total, qtd }
    | null` (null quando não há cobrança). Reusa a regra de vencida/vencendo hoje
    (padrão `filaCobranca`/`resumoDia`). Testes com TZ fixo.
- **`src/hooks/usePush.js`:** estado (`suportado`, `permissao`, `inscrito`);
  `ativar()` (pede permissão → subscribe → salva no banco), `desativar()` (remove
  inscrição local + banco). Lê a VAPID pública de `import.meta.env.VITE_VAPID_PUBLIC_KEY`.
- **UI:** um cartão "Avisos no celular" no `PerfilLoja` (Ativar/Desativar), com
  aviso quando não suportado ou permissão negada.
- **Edge Function `push-diario/`:** pura `montarResumoPush` reusada via `_shared`
  ou cópia; percorre usuários com inscrição, monta resumo por usuário (lê
  vendas/clientes com service role), envia Web Push com a VAPID privada; limpa
  inscrições mortas. Segredo compartilhado no header (padrão do lembrete-diario,
  `x-cron-secret` em app_config) pra não ser disparável por qualquer um.
- **Migração cron `20260711_push_cron.sql`:** agenda `push-diario` às 11:00 UTC
  (pg_cron + pg_net), enviando o x-cron-secret — mesmo padrão do lembrete.

## Não-objetivos
- Push por evento em tempo real (ex: na hora que vence). Só o resumo diário.
- Configurar horário por usuário, silenciar dias, segmentar mensagem.
- Web Push para navegadores sem suporte (degrada com aviso).
- Mexer no lembrete-diario/CallMeBot.

## Critérios de aceite
1. `montarResumoPush` coberto por testes (com/sem cobrança, atrasada+hoje,
   ignora pago/futuro/sem cliente); suíte inteira verde.
2. Ativar no app: permissão concedida → inscrição salva no banco; desativar
   remove.
3. SW mostra a notificação ao receber push; toque abre /cobrancas.
4. Cron dispara e entrega para um usuário de teste com cobrança pendente;
   inscrição inválida é limpa.
5. Segredo do cron + VAPID privada só no servidor; nada sensível no bundle além
   da VAPID pública (que é pública por design).
6. `npm run build` limpo; deploy quando o usuário pedir (SW novo, migrações,
   function, secrets VAPID + cron, env VITE_VAPID_PUBLIC_KEY na Vercel).

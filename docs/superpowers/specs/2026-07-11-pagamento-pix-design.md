# Spec — Pagamento da assinatura via Pix (Mercado Pago)

## Contexto
O paywall (spec 2026-07-11-paywall) já trava as features pagas e mostra o
`ModalUpgrade`, mas o botão "Assinar" é placeholder. Falta o meio de pagamento.
Decisão do usuário: **gateway Mercado Pago, Pix avulso mensal** (sem expor Pix
pessoal, sem recorrência automática por ora). Taxa confirmada: Pix 0,99%, sem
mensalidade — custo ~R$0,20 por assinante de R$19,90.

## Modelo do fluxo (Pix avulso)
1. Lojista toca "Assinar R$19,90" no `ModalUpgrade`.
2. Front chama Edge Function `criar-pagamento-pix` (o access token do MP é
   secreto, tem que ser server-side).
3. A função cria um pagamento Pix no Mercado Pago (valor 19,90,
   `external_reference = user_id`) e devolve `qr_code` (copia-e-cola),
   `qr_code_base64` (imagem) e `payment_id`.
4. Front mostra a tela de Pix (`TelaPagamentoPix`): QR + copia-e-cola + status.
5. Lojista paga no app do banco.
6. Mercado Pago chama o webhook `webhook-mercadopago`; a função confere o
   pagamento na API do MP e, se `approved`, faz
   `update profiles set plano='pago', plano_expira_em = hoje_SP + 30` para o
   `external_reference`, e registra em `pagamentos` (idempotente).
7. Front detecta a liberação (poll no status do pagamento OU recarga do profile)
   e desbloqueia; some o banner.

## Decisões travadas
- **Pix avulso, não recorrente.** Cada pagamento vale 30 dias. Ao expirar, volta
  a Grátis; banner/rota de "renovar". Recorrência por cartão = spec futura.
- **`pago` permanente vs. com validade:** contas do pai e do fundador ficam
  `plano='pago'` com `plano_expira_em = null` (nunca expira). Pagantes reais
  ganham `plano_expira_em` a cada Pix aprovado. A função pura distingue os dois.
- **Sem expor segredo:** `MP_ACCESS_TOKEN` só nas Edge Functions (secret do
  Supabase). Front nunca vê. Webhook valida consultando a API do MP pelo id
  (não confia no corpo da notificação).

## Pré-requisito do usuário (guiado, fora do código)
Criar conta no **Mercado Pago**, ir em *Seu negócio → Configurações →
Credenciais* e pegar o **Access Token de produção**. É o análogo da ativação do
CallMeBot — passo manual que eu conduzo quando chegar a hora.

## Objetivos / Design por componente
- **Migração `20260711_pagamento_pix.sql`:**
  - `profiles += plano_expira_em date` (null = permanente).
  - Tabela `pagamentos` (id text PK = payment_id do MP, user_id uuid, valor
    numeric, status text, criado_em timestamptz default now()). RLS on; sem
    políticas de escrita pública (só a Edge Function via service role escreve);
    select próprio opcional. Serve de log + idempotência.
- **Função pura `src/utils/planos.js` (ajuste, TDD):**
  - `statusPlano` passa a receber `plano_expira_em` (via profile
    `planoExpiraEm`). Regra nova: `plano==='pago'` **e** (`planoExpiraEm` nulo
    **ou** `hoje <= planoExpiraEm`) → `pago`; `plano==='pago'` **e**
    `planoExpiraEm` **e** `hoje > planoExpiraEm` → `gratis` (expirou).
  - Novo campo no retorno: `diasRestantesPago` (int|null) e/ou
    `precisaRenovar` (bool) pra alimentar o banner de renovação.
  - Testes cobrindo: pago permanente (null), pago vigente, pago expirado→grátis,
    dia-limite inclusivo.
- **Edge Function `supabase/functions/criar-pagamento-pix/` (Deno):**
  - Autentica o chamador (JWT do Supabase → user id) — não confia em id vindo do
    corpo. Cria pagamento Pix no MP (`POST /v1/payments`, idempotency key),
    `external_reference = user.id`, `transaction_amount = 19.90`,
    `payment_method_id='pix'`, description. Devolve qr_code, qr_code_base64,
    payment_id. Função pura testável à parte: montar o corpo do pagamento.
- **Edge Function `supabase/functions/webhook-mercadopago/` (Deno):**
  - Recebe a notificação (topic=payment, id). Busca o pagamento na API do MP com
    o access token. Se `status==='approved'` e ainda não processado: upsert em
    `pagamentos` (idempotência por payment_id) e `update profiles set
    plano='pago', plano_expira_em = (data SP + 30) where id = external_reference`.
    Responde 200 rápido. `verify_jwt=false` (MP não manda JWT) — segurança vem de
    reconsultar o MP pelo id + validar valor/reference.
- **Front:**
  - `useAssinatura.js` (hook) — chama `criar-pagamento-pix` (supabase.functions
    .invoke), guarda qr/payment_id, faz poll do status (via função `status-
    pagamento` ou re-fetch do profile) até liberar.
  - `TelaPagamentoPix.jsx` — QR (base64), botão copiar copia-e-cola, estado
    "aguardando pagamento / aprovado", instrução. Aberta pelo `onAssinar` do
    `ModalUpgrade`.
  - `useProfile` passa a trazer `planoExpiraEm:plano_expira_em`.
  - `BannerPlano` ganha o estado "pago expirando/renovar".

## Não-objetivos
- Recorrência automática (cartão/Pix Automático). Spec futura.
- Reembolso/cancelamento in-app, notas fiscais, dunning elaborado.
- Antecipação de recebíveis, split, marketplace.

## Critérios de aceite
1. `statusPlano` com `plano_expira_em` coberto por testes; suíte inteira verde.
2. Pagamento Pix criado ponta-a-ponta em sandbox do MP: QR aparece, pagamento
   de teste aprovado → webhook marca `plano='pago'` + expira em 30d → app
   desbloqueia.
3. Segredo do MP só nas Edge Functions; webhook valida reconsultando o MP.
4. Contas do pai/fundador seguem `pago` permanente (expira null).
5. Idempotência: webhook chamado 2x pro mesmo pagamento não duplica nem quebra.
6. `npm run build` limpo; deploy quando o usuário pedir (front + functions +
   migração + secret MP).

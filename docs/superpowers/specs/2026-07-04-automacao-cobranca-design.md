# Automação de Cobrança — Design

Data: 2026-07-04
Branch: `feat/saas-multi-vendedor`
Stack: React 18 + Vite + Tailwind + Supabase (PostgreSQL, Edge Functions, pg_cron).

## Contexto

O app hoje cobra assim: na tela de Cobranças, o lojista toca "WhatsApp" em cada
parcela, edita a mensagem e envia via link `wa.me` (ele mesmo toca em enviar). Não
há envio automático nem servidor de mensagens. Cobrar várias pessoas é um vai-e-vem
cansativo, e não há nada que **lembre** o lojista de cobrar.

Depois de avaliar custo e risco, a automação **evita de propósito** o envio
automático em massa pros clientes (exige WhatsApp Business API paga + número
dedicado + risco de ban). Em vez disso, entrega quase todo o valor com **custo R$0
e risco zero**, dividida em dois componentes independentes:

- **A) Modo Cobrança** — o app organiza e o lojista dispara cada cobrança num toque.
- **B) Lembrete diário** — o Supabase manda todo dia um resumo no WhatsApp do lojista.

## Objetivos

- Reduzir o atrito de cobrar várias pessoas (de "vai-e-vem na lista" para "fila guiada").
- Cutucar o lojista todo dia com quem cobrar, sem ele precisar abrir o app.
- Custo R$0, sem servidor novo pra manter, usando o número normal do lojista.

## Não-objetivos (fora de escopo)

- Envio automático de mensagens **pros clientes** (WhatsApp Business API / Evolution).
- Múltiplos destinatários do lembrete (multi-loja) — anotado como futuro.
- Push nativo do PWA.

---

## Componente A — Modo Cobrança (frontend)

Tela nova que transforma a cobrança do dia numa "fila guiada", pessoa por pessoa.

### Ponto de entrada
Botão em Cobranças (e/ou Dashboard): **"Iniciar cobrança do dia (N)"**, onde `N` é
o tamanho da fila. Some quando `N = 0`.

### Construção da fila (função pura, testável)
`construirFilaCobranca(vendas, clientes, hojeISO, agoraISO) → ItemFila[]`
- **Entram:** parcelas não pagas cujo vencimento é **hoje ou anterior** (atrasadas +
  vencendo hoje).
- **Ordem:** mais atrasada primeiro (maior nº de dias de atraso); vencendo hoje vem
  depois das atrasadas; desempate por "há mais tempo sem cobrar" (usa
  `ultimaCobrancaEm`, mais antigo primeiro; nunca cobrado conta como mais antigo).
- **Já cobrado hoje:** vai pro **fim** da fila, marcado (reusa a comparação de dia de
  `rotuloUltimaCobranca`). Continua na fila (dá pra reenviar), mas deprioritizado.
- Cada `ItemFila` = `{ cliente, parcela, venda, diasAtraso, jaCobradoHoje }`.

### Tela por item
- Nome do cliente, valor da parcela, "Parcela {numero}/{total}", status
  ("5 dias atrasada" / "vence hoje"), selo "Cobrado hoje" quando aplicável.
- Barra de progresso **"{i+1}/{N}"**.
- **Mensagem pronta e editável** (textarea), pré-preenchida por
  `gerarMensagemCobranca(parcela, cliente, venda)`.
- Botões: **Enviar no WhatsApp** e **Pular**.

### Fluxo
1. **Enviar:** `await registrarCobranca(...)` (grava `ultimaCobrancaEm`) → em sucesso:
   `window.open(linkWhatsApp(telefone, mensagemEditada), '_blank', 'noopener')` e
   **avança** para o próximo (`indice+1`). Em erro (rede): toast de erro e **não
   avança** (não perde a cobrança).
2. **Pular:** avança sem registrar.
3. **Fim** (`indice >= N`): tela "Pronto! Você cobrou {enviados} de {N} hoje." com
   botão de voltar.

A fila é um **snapshot** montado na entrada; o contador de enviados é local.

### Reuso (nada reinventado)
`gerarMensagemCobranca`, `linkWhatsApp` (`mensagensCobranca.js`); `registrarCobranca`
(`useVendas.js`); `statusParcela`, `diasAteVencimento` (`formatadores.js`);
`rotuloUltimaCobranca` (`cobrancaSelo.js`). O novo é a fila e a tela.

### Arquivos (frontend)
- Criar: `src/utils/filaCobranca.js` + `src/utils/filaCobranca.test.js` (função pura).
- Criar: `src/pages/ModoCobranca.jsx` (a tela guiada).
- Modificar: roteamento (`App.jsx`) + botão de entrada em `CobrancasHoje.jsx`
  (e/ou `Dashboard.jsx`).

---

## Componente B — Lembrete diário no WhatsApp (serverless)

Todo dia às **08:00 (America/Sao_Paulo)**, o Supabase monta um resumo e manda no
WhatsApp do lojista via **CallMeBot** (serviço grátis de terceiros; não-oficial —
aceito como "gambiarra" pra um lembrete pessoal, sem risco de ban por ser 1
destinatário, mas pode ficar instável).

### Agendamento
`pg_cron` roda em UTC → 08:00 America/Sao_Paulo = **11:00 UTC** → expressão
`0 11 * * *`. O job chama a Edge Function via `pg_net` (`net.http_post`).
Entregue como migração SQL (`cron.schedule(...)`).

### Edge Function `lembrete-diario` (Deno/TypeScript)
- Usa a **service role** pra ler as parcelas do dono (contorna RLS server-side),
  filtrando pelo `user_id` do lojista (secret `OWNER_USER_ID`).
- Calcula os cobráveis do dia (não pagas, vencimento ≤ hoje): quantas atrasadas,
  quantas vencendo hoje, total a cobrar, e os 2–3 mais urgentes.
- Monta a mensagem, ex.:
  > ☀️ Bom dia! Hoje: 3 atrasadas + 2 vencendo. A cobrar: R$ 465,00. Mais urgentes:
  > Carlos R$200 (9d), Maria R$120 (5d). Abra o app pra cobrar.
- Chama o CallMeBot:
  `GET https://api.callmebot.com/whatsapp.php?phone={PHONE}&text={urlencoded}&apikey={KEY}`.
- Se a fila do dia for vazia, **não** manda nada (evita ruído).
- Erro do CallMeBot: loga e retorna 200 (não quebra nada; app não depende disso).

A lógica de "cobráveis do dia" **espelha** a regra de atraso do app; manter numa
função pura testável (idealmente um módulo compartilhado; se o atrito Deno×app for
alto, uma cópia pequena e testada na função é aceitável).

### Config (uma vez, guiada)
Secrets no Supabase (Edge Function env), **não** no código:
- `CALLMEBOT_PHONE` — número do lojista (com DDI).
- `CALLMEBOT_APIKEY` — chave obtida na autorização do CallMeBot (passo manual único).
- `OWNER_USER_ID` — `auth.uid()` do lojista (de quem resumir os dados).

### Arquivos (serverless)
- Criar: `supabase/functions/lembrete-diario/index.ts`.
- Criar: `supabase/functions/lembrete-diario/resumoDia.ts` + teste (função pura do resumo).
- Criar: migração SQL do `cron.schedule` (ex.: `supabase/migrations/xxxx_lembrete_cron.sql`).

---

## Decomposição em planos

Dois componentes independentes → **dois planos de implementação** (cada um entrega
software funcionando sozinho):

1. **Plano A — Modo Cobrança** (frontend puro; testável com Vitest; deploy Vercel).
2. **Plano B — Lembrete diário** (Supabase Edge Function + pg_cron + CallMeBot;
   inclui os passos manuais de config/secrets guiados).

Ordem sugerida: **A primeiro** (valor imediato, sem depender de config externa),
depois **B**.

## Tratamento de erro
- **A:** falha de `registrarCobranca` → toast e não avança (não perde cobrança). Fila
  e mensagem são puras (sem I/O), cobertas por testes.
- **B:** falha do CallMeBot → log + 200. Fila vazia → não envia. Resumo é função pura testável.

## Testes
- `filaCobranca.test.js`: ordenação (atraso desc, vencendo-hoje depois, desempate por
  `ultimaCobrancaEm`), já-cobrado-hoje no fim, fila vazia, TZ fixado
  (`process.env.TZ='America/Sao_Paulo'`, convenção do projeto).
- `resumoDia` (componente B): contagens, total, top-N, caso vazio.
- Verificação manual A: rodar a fila ponta a ponta (enviar/pular/fim) no app.
- Verificação manual B: invocar a função manualmente e confirmar a mensagem no WhatsApp.

## Riscos & notas
- **CallMeBot** é não-oficial: pode ficar instável. Aceito para lembrete pessoal;
  se cair, trocar por Telegram é um ajuste pequeno (mesma Edge Function, outro endpoint).
- **Multi-loja:** hoje 1 destinatário (secrets únicos). Multi-tenant exigiria
  guardar número/chave por `user_id` — futuro, fora de escopo.
- `pg_net`/`pg_cron` precisam estar habilitados no projeto Supabase (extensões).

---
name: sistema-fiado
description: >
  Manual de convenções e runbook de deploy do projeto sistema-fiado (Caderno
  Digital) — um PWA de controle de fiado em React 18 + Vite + Tailwind +
  Supabase. Leia ANTES de mexer em qualquer código, escrever teste, ou fazer
  deploy neste projeto. Cobre: fluxo SDD (spec → plano → ledger), o padrão
  função-pura-primeiro, a regra obrigatória de timezone nos testes, naming em
  PT-BR, mapeamento camelCase↔snake_case do Supabase, RLS multi-loja, e os
  runbooks de deploy (Vercel --prod, Supabase CLI, Edge Functions, pg_cron,
  lembrete diário via CallMeBot).
---

# sistema-fiado — Convenções & Deploy

App de **fiado** ("caderno digital") para pequenos lojistas: cadastram clientes,
registram vendas parceladas e cobram por WhatsApp. Multi-loja (cada usuário =
uma loja, dados isolados por RLS).

**Stack:** React 18 + Vite 6 + Tailwind 3 + framer-motion + lucide-react + jsPDF
no front; Supabase (PostgreSQL, Auth, Edge Functions/Deno, pg_cron, pg_net) no
back. Testes com Vitest. Deploy do front na Vercel, back no Supabase.

**Repo:** `github.com/dn3almeida-star/sistema-fiado`. Branch de trabalho:
`feat/saas-multi-vendedor` (é a default/main também). Projeto Supabase ref:
`sactjyyildfmycndujoz`.

---

## Regras não-negociáveis (as que quebram se ignoradas)

1. **Timezone nos testes.** A primeira linha de TODO arquivo `*.test.js` é:
   ```js
   process.env.TZ = 'America/Sao_Paulo'
   ```
   Datas de fiado são sensíveis a fuso; sem isso os testes passam na sua máquina
   e quebram em CI/fuso à frente do BR. É a causa nº1 de bug histórico aqui.

2. **Nunca use `.toISOString()` para derivar uma data de calendário local.**
   Ele converte pra UTC e escorrega o dia pra trás em fusos negativos. Para montar
   `'YYYY-MM-DD'` local, formate os componentes à mão ou use
   `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`. Ver
   `src/utils/calcularParcelas.js` e `dataSaoPaulo` em `resumoDia.ts`.

3. **Lógica de negócio mora em função pura.** Coloque a regra em
   `src/utils/<nome>.js` como função que **recebe** `hojeISO`/`agoraISO` (nunca lê
   `new Date()` internamente), sem I/O, sem React. A UI é só casca. Isso é o que
   torna tudo testável. Exemplo canônico: `src/utils/filaCobranca.js`.

4. **Ledger é obrigatório.** Toda feature/task concluída é registrada em
   `.superpowers/sdd/progress.md` (uma entrada por task, com commit hash, o que
   mudou, resultado do review, contagem de testes). É a memória do projeto entre
   sessões — mantenha atualizado e commite.

5. **Tudo em português.** Nomes de função, variável, arquivo, componente, commit,
   comentário — PT-BR. `construirFilaCobranca`, `NovaVenda.jsx`, `useVendas`.

---

## Fluxo de trabalho (SDD — Spec-Driven Development)

Toda feature segue este ciclo (via skills `superpowers`):

1. **Brainstorm** → decisão de escopo.
2. **Spec** em `docs/superpowers/specs/AAAA-MM-DD-<nome>-design.md` — contexto,
   objetivos, não-objetivos, design por componente.
3. **Plano** em `docs/superpowers/plans/AAAA-MM-DD-<nome>.md` — tasks numeradas,
   cada uma com arquivos, interfaces, e steps de TDD (teste que falha → implementa
   → passa → suíte inteira → commit).
4. **Implementação task-by-task**, cada task revisada por subagente antes do commit.
5. **Revisão final de branch** (Opus) antes de considerar "ready to merge".
6. **Deploy** (ver runbooks abaixo).
7. **Entrada no ledger** `.superpowers/sdd/progress.md`.

Ao começar uma sessão neste projeto: **leia o topo do `.superpowers/sdd/progress.md`**
— o bloco mais recente é o estado atual.

---

## Arquitetura & organização

```
src/
  pages/       telas (Dashboard, NovaVenda, Clientes, PerfilCliente,
               CobrancasHoje, ModoCobranca, Relatorio, Login, PerfilLoja...)
  components/  UI reutilizável (modais, gráficos, nav, toast, skeleton...)
  hooks/       useAuth, useVendas, useClientes, useProfile, useTheme
  utils/       FUNÇÕES PURAS + seus .test.js (a lógica testável vive aqui)
  lib/         supabase.js (client único)
supabase/
  functions/   Edge Functions Deno (ex.: lembrete-diario)
  migrations/  SQL (pg_cron, etc.)
docs/superpowers/  specs/ e plans/
.superpowers/sdd/progress.md   o ledger
```

**Roteamento:** manual via estado em `App.jsx` (sem react-router). Rotas pesadas
são `lazy`. Navegação por `BottomNav`.

**Estilo:** Tailwind com tokens de tema em CSS vars (`--ground`, `--surface`,
`--ink`, `--brand-bright`...) para dark mode via `class`. **Não hardcode cores de
marca** — use os tokens (`rgb(var(--brand-bright))`), especialmente em gráficos,
senão quebra a legibilidade no dark. Fontes: Inter (sans), Space Grotesk
(display), IBM Plex Mono (números/mono). Alvos de toque mínimos `44px`
(`min-h-touch`/`min-w-touch`).

---

## Supabase: dados & convenções

- **Client único** em `src/lib/supabase.js`, lê `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY` do `.env` (não versionado; ver `.env.example`).
- **Colunas são snake_case no banco, camelCase no app.** O mapeamento é feito no
  `select` com alias. Ex. em `useVendas.js`:
  ```js
  const SELECT = 'id, clienteId:cliente_id, itens, valorTotal:valor_total, entrada, parcelas, criadaEm:criada_em'
  ```
  Ao inserir/atualizar, converta de volta pra snake_case no objeto.
- **Parcelas são JSONB** dentro da venda (array de `{numero, vencimento, valor,
  pago, pagoEm, ultimaCobrancaEm}`), não tabela separada.
- **RLS multi-loja:** `clientes` e `vendas` têm `user_id`, com policies `*_all_own`
  (cmd ALL, `qual: user_id = auth.uid()`). O isolamento por loja é imposto pelo
  banco — não confie só no filtro do app. Já auditado e correto.
- **API keys do dashboard atual:** o Supabase migrou de `anon`/`service_role` para
  `sb_publishable_...` (pública, = anon) e `sb_secret_...`. A publishable key pode
  ir em SQL/frontend; a secret nunca.

---

## Testes

- `npm test` (= `vitest run`). Suíte inteira antes de qualquer commit de feature.
- Arquivo de teste ao lado do fonte: `src/utils/foo.js` → `src/utils/foo.test.js`.
- **1ª linha sempre** `process.env.TZ = 'America/Sao_Paulo'` (ver regra 1).
- Padrão dos testes de fila/data: definir `const HOJE = 'YYYY-MM-DD'` e passar
  como argumento (nunca depender do relógio real). Ver `filaCobranca.test.js`.
- Edge Functions Deno: a **função pura** (`.ts`) é testada com Vitest via `.test.js`
  (import com extensão `.ts` explícita); a casca de I/O (`index.ts`) é verificada
  no deploy, não em unit test.

---

## Commits

Conventional commits com escopo e descrição em PT:
```
feat(cobrancas): tela Modo Cobrança guiado + entrada em Cobranças
fix(vendas): vencimento não escorrega em meses curtos e usa data local
docs: sdd ledger — Plano B completo e deploy feito
test(cobrancas): fixar TZ America/Sao_Paulo em cobrancaSelo
```
Identidade git do projeto: `Jose Iran <dn3almeida@gmail.com>`. Só commite/push
quando o usuário pedir.

---

## Runbook: deploy do frontend (Vercel)

O front é publicado em `https://sistema-fiado.vercel.app` via Vercel `--prod`.

1. `npm test` verde + `npm run build` limpo **antes** do deploy.
2. Deploy de produção:
   ```bash
   npx vercel --prod
   ```
   (as env vars `VITE_SUPABASE_*` já estão configuradas no projeto Vercel).
3. Confirmar `readyState: READY` e que o alias `sistema-fiado.vercel.app` aponta
   pro novo deploy.
4. Registrar no ledger (dpl id, data, contagem de testes).

---

## Runbook: Edge Function + cron (Supabase)

Usado pelo **lembrete diário** (`supabase/functions/lembrete-diario/`), mas serve
de template para qualquer function agendada.

**Pré-requisitos de máquina (Windows):**
- Node.js: `winget install OpenJS.NodeJS.LTS` (feche e reabra o terminal depois).
- Liberar scripts pro `npx`: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**Deploy:**
```bash
npx supabase@latest login
npx supabase@latest link --project-ref sactjyyildfmycndujoz
# secrets da function (nunca no código):
npx supabase@latest secrets set CHAVE1=valor CHAVE2=valor
npx supabase@latest secrets list          # confere os nomes
npx supabase@latest functions deploy <nome-da-function>
```

**Teste manual antes de agendar** (usa a publishable/anon key como Bearer):
```bash
curl -i -X POST "https://sactjyyildfmycndujoz.functions.supabase.co/<nome>" \
  -H "Authorization: Bearer sb_publishable_..."
```

**Agendar com pg_cron** (rodar no SQL Editor; horário em **UTC** —
08:00 America/Sao_Paulo = 11:00 UTC):
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('<job>') where exists (select 1 from cron.job where jobname='<job>');
select cron.schedule('<job>', '0 11 * * *', $$
  select net.http_post(
    url := 'https://sactjyyildfmycndujoz.functions.supabase.co/<nome>',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer sb_publishable_...')
  );
$$);
-- conferir:
select jobname, schedule, active from cron.job where jobname='<job>';
-- histórico de execução:
select status, return_message, start_time from cron.job_run_details
  where jobid=(select jobid from cron.job where jobname='<job>')
  order by start_time desc limit 5;
```

---

## Lembrete diário (CallMeBot) — específico

Manda um resumo de cobranças no WhatsApp do lojista, custo R$0, sem servidor novo.

- **Secrets da function:** `OWNER_USER_ID` (uid da conta cujos dados são resumidos),
  `CALLMEBOT_PHONE` (DDI+DDD, só dígitos), `CALLMEBOT_APIKEY`.
- **Regra de envio:** parcela **não paga** com **vencimento ≤ hoje**. Fila vazia →
  **não envia nada** (silêncio é correto, não é bug).
- **CallMeBot** roda numa **rotação de números** (o WhatsApp bane os bots). Se o
  número do plano não aceitar WhatsApp, pegue o atual em
  callmebot.com/blog/free-api-whatsapp-messages. Ativação: mandar
  `I allow callmebot to send me messages` do WhatsApp do **destinatário** (a key
  fica vinculada a quem envia). É a API de mensagens — não confunda com a frase de
  ligação (`...to call me`).
- **Descobrir o `OWNER_USER_ID`** no SQL Editor:
  ```sql
  select id, email from auth.users where email = '<email-da-conta>';
  ```
- Em app multi-loja, o dono dos dados (OWNER_USER_ID) e o destinatário do WhatsApp
  podem ser contas/pessoas diferentes.

---

## Armadilhas conhecidas

- **Fuso.** Ver regras 1 e 2. Todo bug de "a data está 1 dia errada" é isso.
- **Cor hardcoded em gráfico** vira ilegível no dark — use token de tema.
- **`node`/`npm`/`npx` fora do PATH** em terminal recém-instalado: reabra o
  terminal (ou faça logoff) depois de instalar o Node.
- **PowerShell bloqueando `npx.ps1`**: `Set-ExecutionPolicy -Scope CurrentUser
  RemoteSigned`.
- **Escopo de commit:** cuidado com arquivos soltos no working dir (`.agents`,
  `skills-lock.json`, `sharp`) que não fazem parte da feature — já estão no
  `.gitignore`, mas confira o diffstat antes de commitar.

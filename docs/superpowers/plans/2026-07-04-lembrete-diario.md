# Lembrete Diário no WhatsApp — Implementation Plan (Plano B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo dia às 08:00 (America/Sao_Paulo) o Supabase manda no WhatsApp do lojista um resumo dos cobráveis do dia, via CallMeBot, com custo R$0 e sem servidor novo.

**Architecture:** Uma função pura (`resumoDia`) calcula o resumo a partir das vendas/clientes e da data; uma Edge Function Deno (`index.ts`) é a casca de I/O que lê os dados com service role, monta a mensagem e chama o CallMeBot; o `pg_cron` dispara a função diariamente via `pg_net`. Só a função pura é testável com Vitest; o resto é código de deploy verificado manualmente.

**Tech Stack:** Supabase (Edge Functions/Deno, pg_cron, pg_net), TypeScript (função Deno), Vitest (teste da função pura), CallMeBot (envio WhatsApp de terceiros, grátis).

## Global Constraints

- Horário do lembrete: **08:00 America/Sao_Paulo** = **11:00 UTC** → cron `0 11 * * *`.
- Envio **só para o lojista** (1 destinatário). Nada é enviado aos clientes.
- Fila do dia vazia → **não envia nada** (evita ruído).
- Erro do CallMeBot ou da query → **logar e retornar 200** (o app não depende disso).
- Regra de cobrável espelha o app: parcela **não paga** com **vencimento ≤ hoje** (atrasadas + vencendo hoje).
- Segredos ficam em **Edge Function secrets**, nunca no código: `OWNER_USER_ID`, `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY`. (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados pelo Supabase.)
- Convenção de teste do projeto: primeira linha do arquivo de teste é `process.env.TZ = 'America/Sao_Paulo'`.
- Mensagem exata do lembrete (formato-alvo do spec):
  `☀️ Bom dia! Hoje: 3 atrasadas + 2 vencendo. A cobrar: R$ 465,00. Mais urgentes: Carlos R$200 (9d), Maria R$120 (5d). Abra o app pra cobrar.`

---

## File Structure

- `supabase/functions/lembrete-diario/resumoDia.ts` — **função pura**: `dataSaoPaulo`, `resumoDia`, `montarMensagem`. Sem I/O, sem APIs do Deno. Importável por Vitest e por Deno (extensão `.ts` explícita).
- `supabase/functions/lembrete-diario/resumoDia.test.js` — testes Vitest da função pura (convenção `.test.js`, TZ fixado).
- `supabase/functions/lembrete-diario/index.ts` — **casca Deno**: lê secrets, cria client service-role, consulta vendas/clientes do dono, chama `resumoDia`/`montarMensagem`, dispara CallMeBot. Verificação manual (deploy).
- `supabase/migrations/20260704_lembrete_cron.sql` — habilita `pg_cron`/`pg_net` e agenda o job. Verificação manual (rodado no SQL Editor).

---

### Task 1: Função pura do resumo (`resumoDia.ts`) — TDD

**Files:**
- Create: `supabase/functions/lembrete-diario/resumoDia.ts`
- Test: `supabase/functions/lembrete-diario/resumoDia.test.js`

**Interfaces:**
- Consumes: nada (função pura, sem dependências do projeto).
- Produces (consumido pela Task 2 `index.ts`):
  - `dataSaoPaulo(date: Date): string` — retorna `'YYYY-MM-DD'` no fuso America/Sao_Paulo.
  - `resumoDia(vendas, clientes, hojeISO: string): Resumo` — onde
    `Resumo = { vazio: boolean, atrasadas: number, vencendoHoje: number, totalCobrar: number, topUrgentes: Urgente[] }`
    e `Urgente = { nome: string, valor: number, diasAtraso: number }`.
    Entrada: `vendas: { clienteId: string, parcelas: { vencimento: string, valor: number, pago: boolean }[] }[]`,
    `clientes: { id: string, nome: string, telefone?: string }[]`.
  - `montarMensagem(r: Resumo): string` — a mensagem final do WhatsApp.

- [ ] **Step 1: Escrever o teste que falha**

Criar `supabase/functions/lembrete-diario/resumoDia.test.js`:

```js
process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { resumoDia, montarMensagem, dataSaoPaulo } from './resumoDia.ts'

const HOJE = '2026-07-10'

const clientes = [
  { id: 'c1', nome: 'Carlos', telefone: '11999999999' },
  { id: 'c2', nome: 'Maria', telefone: '11888888888' },
  { id: 'c3', nome: 'Ana', telefone: '' }, // sem telefone
]

function parcela(vencimento, valor, extra = {}) {
  return { vencimento, valor, pago: false, ...extra }
}

describe('resumoDia', () => {
  it('conta atrasadas e vencendo hoje, soma o total e lista os mais urgentes', () => {
    const vendas = [
      { clienteId: 'c1', parcelas: [parcela('2026-07-01', 200)] }, // 9d
      { clienteId: 'c2', parcelas: [parcela('2026-07-05', 120)] }, // 5d
      { clienteId: 'c3', parcelas: [parcela('2026-07-10', 145)] }, // hoje
    ]
    const r = resumoDia(vendas, clientes, HOJE)
    expect(r.vazio).toBe(false)
    expect(r.atrasadas).toBe(2)
    expect(r.vencendoHoje).toBe(1)
    expect(r.totalCobrar).toBe(465)
    expect(r.topUrgentes).toEqual([
      { nome: 'Carlos', valor: 200, diasAtraso: 9 },
      { nome: 'Maria', valor: 120, diasAtraso: 5 },
      { nome: 'Ana', valor: 145, diasAtraso: 0 },
    ])
  })

  it('limita topUrgentes a 3, ordenando por atraso desc e valor desc no empate', () => {
    const cs = [
      { id: 'a', nome: 'A' }, { id: 'b', nome: 'B' },
      { id: 'c', nome: 'C' }, { id: 'd', nome: 'D' },
    ]
    const vendas = [
      { clienteId: 'a', parcelas: [parcela('2026-07-08', 50)] },  // 2d
      { clienteId: 'b', parcelas: [parcela('2026-07-01', 10)] },  // 9d
      { clienteId: 'c', parcelas: [parcela('2026-07-01', 90)] },  // 9d, valor maior
      { clienteId: 'd', parcelas: [parcela('2026-07-09', 30)] },  // 1d
    ]
    const r = resumoDia(vendas, cs, HOJE)
    expect(r.topUrgentes.map(u => u.nome)).toEqual(['C', 'B', 'A'])
  })

  it('ignora parcelas pagas e futuras', () => {
    const vendas = [
      { clienteId: 'c1', parcelas: [
        parcela('2026-07-01', 100, { pago: true }),
        parcela('2026-08-01', 100),
      ] },
    ]
    expect(resumoDia(vendas, clientes, HOJE).vazio).toBe(true)
  })

  it('inclui cliente sem telefone (o lembrete é para o lojista, não para o cliente)', () => {
    const vendas = [{ clienteId: 'c3', parcelas: [parcela('2026-07-02', 80)] }]
    const r = resumoDia(vendas, clientes, HOJE)
    expect(r.atrasadas).toBe(1)
    expect(r.topUrgentes[0].nome).toBe('Ana')
  })

  it('ignora venda de cliente inexistente', () => {
    const vendas = [{ clienteId: 'zzz', parcelas: [parcela('2026-07-01', 100)] }]
    expect(resumoDia(vendas, clientes, HOJE).vazio).toBe(true)
  })

  it('fila vazia retorna resumo zerado', () => {
    const r = resumoDia([], clientes, HOJE)
    expect(r).toEqual({ vazio: true, atrasadas: 0, vencendoHoje: 0, totalCobrar: 0, topUrgentes: [] })
  })
})

describe('montarMensagem', () => {
  it('formata exatamente o resumo do dia', () => {
    const r = {
      vazio: false, atrasadas: 3, vencendoHoje: 2, totalCobrar: 465,
      topUrgentes: [
        { nome: 'Carlos', valor: 200, diasAtraso: 9 },
        { nome: 'Maria', valor: 120, diasAtraso: 5 },
      ],
    }
    expect(montarMensagem(r)).toBe(
      '☀️ Bom dia! Hoje: 3 atrasadas + 2 vencendo. A cobrar: R$ 465,00. ' +
      'Mais urgentes: Carlos R$200 (9d), Maria R$120 (5d). Abra o app pra cobrar.'
    )
  })
})

describe('dataSaoPaulo', () => {
  it('11:00 UTC cai no mesmo dia em São Paulo (08:00)', () => {
    expect(dataSaoPaulo(new Date('2026-07-04T11:00:00Z'))).toBe('2026-07-04')
  })
  it('madrugada UTC cai no dia anterior em São Paulo', () => {
    expect(dataSaoPaulo(new Date('2026-07-04T02:30:00Z'))).toBe('2026-07-03')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- --run resumoDia`
Expected: FAIL — `Failed to resolve import "./resumoDia.ts"` (o módulo ainda não existe).

- [ ] **Step 3: Implementar a função pura**

Criar `supabase/functions/lembrete-diario/resumoDia.ts`:

```ts
// Resumo dos cobráveis do dia para o lembrete diário. Funções puras (recebem
// a data), sem I/O e sem APIs do Deno — testáveis com Vitest, importáveis pela
// Edge Function. Espelha a regra de atraso do app (não paga, vencimento <= hoje).

export interface ParcelaLembrete {
  vencimento: string // 'YYYY-MM-DD'
  valor: number
  pago: boolean
}
export interface VendaLembrete {
  clienteId: string
  parcelas: ParcelaLembrete[]
}
export interface ClienteLembrete {
  id: string
  nome: string
  telefone?: string
}
export interface Urgente {
  nome: string
  valor: number
  diasAtraso: number
}
export interface Resumo {
  vazio: boolean
  atrasadas: number
  vencendoHoje: number
  totalCobrar: number
  topUrgentes: Urgente[]
}

export function resumoDia(
  vendas: VendaLembrete[],
  clientes: ClienteLembrete[],
  hojeISO: string,
): Resumo {
  const itens: Urgente[] = []
  for (const venda of vendas) {
    const cliente = clientes.find((c) => c.id === venda.clienteId)
    if (!cliente) continue
    for (const parcela of venda.parcelas) {
      if (parcela.pago) continue
      if (parcela.vencimento > hojeISO) continue
      itens.push({
        nome: cliente.nome,
        valor: parcela.valor,
        diasAtraso: diasEntre(parcela.vencimento, hojeISO),
      })
    }
  }

  const atrasadas = itens.filter((i) => i.diasAtraso > 0).length
  const vencendoHoje = itens.filter((i) => i.diasAtraso === 0).length
  const totalCobrar = arredondar2(itens.reduce((s, i) => s + i.valor, 0))
  const topUrgentes = [...itens]
    .sort((a, b) =>
      b.diasAtraso - a.diasAtraso ||
      b.valor - a.valor ||
      a.nome.localeCompare(b.nome),
    )
    .slice(0, 3)

  return { vazio: itens.length === 0, atrasadas, vencendoHoje, totalCobrar, topUrgentes }
}

export function montarMensagem(r: Resumo): string {
  const total = 'R$ ' + r.totalCobrar.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const lista = r.topUrgentes
    .map((u) => `${u.nome} R$${Math.round(u.valor).toLocaleString('pt-BR')} (${u.diasAtraso}d)`)
    .join(', ')
  return `☀️ Bom dia! Hoje: ${r.atrasadas} atrasadas + ${r.vencendoHoje} vencendo. ` +
    `A cobrar: ${total}. Mais urgentes: ${lista}. Abra o app pra cobrar.`
}

export function dataSaoPaulo(date: Date): string {
  // 'en-CA' formata como 'YYYY-MM-DD'; timeZone garante o dia correto em SP.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)
}

function diasEntre(vencimentoISO: string, hojeISO: string): number {
  const v = new Date(vencimentoISO + 'T00:00:00')
  const h = new Date(hojeISO + 'T00:00:00')
  return Math.round((h.getTime() - v.getTime()) / 86400000)
}

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- --run resumoDia`
Expected: PASS — todos os testes de `resumoDia`, `montarMensagem` e `dataSaoPaulo` verdes.

- [ ] **Step 5: Rodar a suíte inteira (sem regressões)**

Run: `npm test -- --run`
Expected: PASS — total anterior (105) + os novos testes deste arquivo.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/lembrete-diario/resumoDia.ts supabase/functions/lembrete-diario/resumoDia.test.js
git commit -m "feat(lembrete): função pura do resumo diário de cobrança"
```

---

### Task 2: Casca da Edge Function + migração do cron

**Files:**
- Create: `supabase/functions/lembrete-diario/index.ts`
- Create: `supabase/migrations/20260704_lembrete_cron.sql`

**Interfaces:**
- Consumes (da Task 1): `resumoDia`, `montarMensagem`, `dataSaoPaulo` de `./resumoDia.ts`.
- Produces: endpoint HTTP `POST /lembrete-diario` (verificado no deploy da Task 3) e o job `cron.schedule('lembrete-diario', ...)`.

> Estes arquivos não têm teste unitário (I/O + SQL). A verificação real acontece no deploy (Task 3). O objetivo aqui é escrever os dois arquivos corretos.

- [ ] **Step 1: Escrever a Edge Function**

Criar `supabase/functions/lembrete-diario/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { resumoDia, montarMensagem, dataSaoPaulo } from './resumoDia.ts'

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ownerId = Deno.env.get('OWNER_USER_ID')!
  const phone = Deno.env.get('CALLMEBOT_PHONE')!
  const apikey = Deno.env.get('CALLMEBOT_APIKEY')!

  const supabase = createClient(supabaseUrl, serviceKey)
  const hojeISO = dataSaoPaulo(new Date())

  const [vendasRes, clientesRes] = await Promise.all([
    supabase.from('vendas').select('clienteId:cliente_id, parcelas').eq('user_id', ownerId),
    supabase.from('clientes').select('id, nome, telefone').eq('user_id', ownerId),
  ])

  if (vendasRes.error || clientesRes.error) {
    console.error('Erro ao ler dados:', vendasRes.error ?? clientesRes.error)
    return json({ ok: false, erro: 'query' })
  }

  const resumo = resumoDia(vendasRes.data ?? [], clientesRes.data ?? [], hojeISO)
  if (resumo.vazio) {
    return json({ ok: true, enviado: false, motivo: 'fila vazia' })
  }

  const mensagem = montarMensagem(resumo)
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(apikey)}`
  try {
    const r = await fetch(url)
    console.log('CallMeBot status', r.status, (await r.text()).slice(0, 200))
  } catch (err) {
    console.error('CallMeBot falhou:', err)
  }
  return json({ ok: true, enviado: true })
})

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Escrever a migração do cron**

Criar `supabase/migrations/20260704_lembrete_cron.sql`:

```sql
-- Lembrete diário: agenda a Edge Function lembrete-diario às 11:00 UTC (08:00 BRT).
-- Rodar no SQL Editor do Supabase (ou via db push). Requer projeto Pro? Não —
-- pg_cron e pg_net estão disponíveis no plano free do Supabase.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reagendar é seguro: remove o job anterior se já existir.
select cron.unschedule('lembrete-diario')
where exists (select 1 from cron.job where jobname = 'lembrete-diario');

select cron.schedule(
  'lembrete-diario',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/lembrete-diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_ANON_KEY>'
    )
  );
  $$
);
```

> Os dois placeholders `<PROJECT_REF>` e `<SUPABASE_ANON_KEY>` são preenchidos na Task 3 (valores do projeto do lojista). Ficam no SQL porque a anon key já é pública no bundle do frontend — não é um segredo novo.

- [ ] **Step 3: (Opcional) Checar o TypeScript da função**

Se o Deno estiver instalado:
Run: `deno check supabase/functions/lembrete-diario/index.ts`
Expected: sem erros de tipo. (Se o Deno não estiver instalado, pular — o deploy da Task 3 valida.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/lembrete-diario/index.ts supabase/migrations/20260704_lembrete_cron.sql
git commit -m "feat(lembrete): edge function e agendamento pg_cron do lembrete diário"
```

---

### Task 3: Deploy e configuração (guiada, interativa com o lojista)

**Files:** nenhuma alteração de código. Passos de configuração no CallMeBot, na Supabase CLI e no SQL Editor.

> Esta task **não é automatizável por subagente**: exige o celular do lojista (CallMeBot), login no Supabase e o painel. Fazer junto com o usuário, um passo de cada vez, confirmando cada saída.

- [ ] **Step 1: Ativar o CallMeBot (uma vez)**

No WhatsApp do lojista, enviar a mensagem exata `I allow callmebot to send me messages` para o número **+34 644 84 71 89**. O CallMeBot responde com a **API key** pessoal.
Anotar: `CALLMEBOT_APIKEY` = (a chave recebida), `CALLMEBOT_PHONE` = número do lojista com DDI e DDD, só dígitos (ex.: `5599XXXXXXXXX`).

- [ ] **Step 2: Descobrir o OWNER_USER_ID**

No **SQL Editor** do Supabase, rodar:

```sql
select id, email from auth.users where email = 'dn3almeida@gmail.com';
```

Anotar o `id` retornado → `OWNER_USER_ID`.

- [ ] **Step 3: Login e link da Supabase CLI**

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <PROJECT_REF>
```

O `<PROJECT_REF>` está na URL do dashboard (`https://supabase.com/dashboard/project/<PROJECT_REF>`) ou via `npx supabase@latest projects list`. Anotar o `<PROJECT_REF>`.

- [ ] **Step 4: Definir os secrets da função**

```bash
npx supabase@latest secrets set OWNER_USER_ID=<uid> CALLMEBOT_PHONE=<telefone> CALLMEBOT_APIKEY=<chave>
```

Confirmar: `npx supabase@latest secrets list` mostra os três nomes (valores ficam ocultos).

- [ ] **Step 5: Deploy da Edge Function**

```bash
npx supabase@latest functions deploy lembrete-diario
```

Expected: `Deployed Function lembrete-diario`. A função fica em `https://<PROJECT_REF>.functions.supabase.co/lembrete-diario`.

- [ ] **Step 6: Testar a função manualmente (antes de agendar)**

Pegar a **anon key** em `src/lib/supabase.js` (ou no dashboard → Settings → API) e rodar:

```bash
curl -i -X POST 'https://<PROJECT_REF>.functions.supabase.co/lembrete-diario' \
  -H 'Authorization: Bearer <SUPABASE_ANON_KEY>'
```

Expected: `HTTP/2 200` e corpo `{"ok":true,"enviado":true}` (há cobráveis hoje). **O lembrete deve chegar no WhatsApp do lojista.**
Se vier `{"ok":true,"enviado":false,"motivo":"fila vazia"}`, não há cobráveis hoje — criar/atrasar uma parcela de teste e repetir. Se vier `{"ok":false,"erro":"query"}`, revisar `OWNER_USER_ID` e as policies (Fase 0).

- [ ] **Step 7: Agendar o cron**

Preencher `<PROJECT_REF>` e `<SUPABASE_ANON_KEY>` no SQL da Task 2 e rodar o conteúdo de `supabase/migrations/20260704_lembrete_cron.sql` no **SQL Editor**.
Confirmar o agendamento:

```sql
select jobname, schedule, active from cron.job where jobname = 'lembrete-diario';
```

Expected: uma linha com `schedule = '0 11 * * *'` e `active = true`.

- [ ] **Step 8: Verificar a execução agendada**

Após a próxima 11:00 UTC (ou forçando um teste com um horário próximo temporário), conferir o histórico:

```sql
select status, return_message, start_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'lembrete-diario')
order by start_time desc limit 5;
```

Expected: execução com `status = 'succeeded'`. Confirmar que o WhatsApp chegou.

> Se você mudou o horário temporariamente para testar, reponha `'0 11 * * *'` rodando o SQL da Task 2 de novo (ele reagenda com segurança).

---

## Fora de escopo (deferido)
- Multi-loja (vários destinatários) — hoje 1 destinatário via secrets únicos.
- Troca do CallMeBot por Telegram — só se o CallMeBot cair (mesma função, outro endpoint).
- Push nativo do PWA.

## Verificação (todo o Plano B)
- `npm test -- --run` verde, incluindo o novo `resumoDia.test.js`.
- Função responde 200 e o lembrete chega no WhatsApp (Task 3, Step 6).
- Job `lembrete-diario` ativo em `cron.job` com `0 11 * * *` (Step 7) e execução `succeeded` (Step 8).

## Riscos & notas
- **CallMeBot** é não-oficial: pode ficar instável. Aceito para lembrete pessoal (1 destinatário). Se cair, migrar para Telegram é um ajuste pequeno na mesma Edge Function.
- `pg_cron`/`pg_net` precisam estar habilitados (o SQL da Task 2 faz `create extension if not exists`).
- A anon key no SQL do cron não é segredo novo (já pública no frontend); para endurecer, dá para guardar no Supabase Vault — fora de escopo.

## Ordem de execução
1. **Task 1** (função pura, TDD) — automatizável por subagente.
2. **Task 2** (Edge Function + SQL) — código, revisável; verificação real no deploy.
3. **Task 3** (deploy + config guiada) — interativa, feita junto com o lojista.

# Modo Cobrança — Implementation Plan (Plano A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma tela de "Modo Cobrança" que leva o lojista pessoa por pessoa pela fila de cobranças do dia — mostra cliente + mensagem pronta, dispara o WhatsApp num toque e avança sozinho.

**Architecture:** Uma função pura (`construirFilaCobranca`) monta e ordena a fila (testável); uma tela nova (`ModoCobranca.jsx`) consome a fila e costura peças que já existem (`gerarMensagemCobranca`, `linkWhatsApp`, `registrarCobranca`). Roteamento é um switch de string em `App.jsx`; entrada por um botão em `CobrancasHoje`.

**Tech Stack:** React 18, Vite, Tailwind 3, Framer Motion, lucide-react, Vitest.

## Global Constraints

- **Fila:** parcelas **não pagas**, com `vencimento <= hoje` (atrasadas + vencendo hoje), cujo **cliente tem telefone** (sem telefone não há como mandar WhatsApp — mesma lógica do `BotaoCobranca`, que desabilita sem telefone).
- **Ordem:** (1) quem **já foi cobrado hoje** vai pro fim; (2) mais atrasada primeiro (maior `diasAtraso`); (3) desempate por "há mais tempo sem cobrar" (`ultimaCobrancaEm` mais antigo primeiro; **nunca cobrado conta como mais antigo**); (4) nome do cliente.
- **"Já cobrado hoje":** comparação por **dia de calendário local**.
- **Envio:** `await registrarCobranca(venda.id, parcela.numero)` → `window.open(linkWhatsApp(telefone, mensagemEditada), '_blank', 'noopener,noreferrer')` → avança. Em erro: toast e **não avança** (não perde a cobrança).
- **Snapshot:** a fila é montada **uma vez** na entrada da tela; o contador de enviados é local.
- **Datas em teste:** primeira linha `process.env.TZ = 'America/Sao_Paulo'` (convenção do projeto).
- **Reuso (não reinventar):** `gerarMensagemCobranca`, `linkWhatsApp` (`mensagensCobranca.js`); `registrarCobranca(venda.id, parcela.numero)` (via props, async); `statusParcela`, `hoje` (`formatadores.js`); `rotuloUltimaCobranca` (`cobrancaSelo.js`).
- **Rota:** nova página `'modo-cobranca'` no switch de `App.jsx`; **sem** nova aba no `BottomNav`.
- **Git:** commitar só os arquivos de cada task; **nunca** `git add .` / `git add -A` (há arquivos soltos não relacionados no repo).
- Vitest sempre com `--run` (passe único, sem watch).

---

## Task 1: `construirFilaCobranca` (função pura, TDD)

**Files:**
- Create: `src/utils/filaCobranca.js`
- Create: `src/utils/filaCobranca.test.js`

**Interfaces:**
- Produces: `construirFilaCobranca(vendas, clientes, hojeISO, agoraISO) => ItemFila[]`, onde
  `ItemFila = { cliente, parcela, venda, diasAtraso: number, jaCobradoHoje: boolean }`.
  `hojeISO` é `'YYYY-MM-DD'`; `agoraISO` é um timestamp ISO (para decidir "cobrado hoje").

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/utils/filaCobranca.test.js`:

```js
process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { construirFilaCobranca } from './filaCobranca.js'

const HOJE = '2026-07-10'
const AGORA = '2026-07-10T15:00:00.000Z' // 12:00 em America/Sao_Paulo

const clientes = [
  { id: 'c1', nome: 'Carlos', telefone: '11999999999' },
  { id: 'c2', nome: 'Maria', telefone: '11888888888' },
  { id: 'c3', nome: 'Ana', telefone: '11777777777' },
  { id: 'c4', nome: 'SemFone', telefone: '' },
]

function parcela(numero, vencimento, extra = {}) {
  return { numero, vencimento, valor: 100, pago: false, pagoEm: null, ultimaCobrancaEm: null, ...extra }
}

describe('construirFilaCobranca', () => {
  it('inclui atrasadas + vencendo hoje; exclui pagas, futuras e sem telefone', () => {
    const vendas = [
      { id: 'v1', clienteId: 'c1', parcelas: [
        parcela(1, '2026-07-01'),                 // 9d atraso — entra
        parcela(2, '2026-08-01'),                 // futura — fora
        parcela(3, '2026-06-20', { pago: true, pagoEm: '2026-06-20' }), // paga — fora
      ] },
      { id: 'v2', clienteId: 'c2', parcelas: [ parcela(1, '2026-07-05') ] }, // 5d — entra
      { id: 'v3', clienteId: 'c3', parcelas: [ parcela(1, '2026-07-10') ] }, // hoje — entra
      { id: 'v4', clienteId: 'c4', parcelas: [ parcela(1, '2026-07-02') ] }, // sem telefone — fora
    ]
    const fila = construirFilaCobranca(vendas, clientes, HOJE, AGORA)
    expect(fila.map(i => i.cliente.nome)).toEqual(['Carlos', 'Maria', 'Ana'])
    expect(fila.map(i => i.diasAtraso)).toEqual([9, 5, 0])
    expect(fila.every(i => i.jaCobradoHoje === false)).toBe(true)
  })

  it('quem já foi cobrado hoje vai para o fim, mesmo mais atrasado', () => {
    const vendas = [
      { id: 'v1', clienteId: 'c1', parcelas: [ parcela(1, '2026-06-30', { ultimaCobrancaEm: '2026-07-10T14:00:00.000Z' }) ] }, // 10d, cobrado hoje
      { id: 'v2', clienteId: 'c2', parcelas: [ parcela(1, '2026-07-07') ] }, // 3d, nunca
    ]
    const fila = construirFilaCobranca(vendas, clientes, HOJE, AGORA)
    expect(fila.map(i => i.cliente.nome)).toEqual(['Maria', 'Carlos'])
    expect(fila.map(i => i.jaCobradoHoje)).toEqual([false, true])
  })

  it('desempate: nunca cobrado vem antes de quem já foi cobrado antes (mais antigo primeiro)', () => {
    const vendas = [
      { id: 'v1', clienteId: 'c1', parcelas: [ parcela(1, '2026-07-05', { ultimaCobrancaEm: '2026-07-08T14:00:00.000Z' }) ] }, // 5d, cobrado há 2 dias
      { id: 'v2', clienteId: 'c2', parcelas: [ parcela(1, '2026-07-05') ] }, // 5d, nunca
    ]
    const fila = construirFilaCobranca(vendas, clientes, HOJE, AGORA)
    expect(fila.map(i => i.cliente.nome)).toEqual(['Maria', 'Carlos'])
  })

  it('retorna vazio quando tudo está pago ou no futuro', () => {
    const vendas = [
      { id: 'v1', clienteId: 'c1', parcelas: [ parcela(1, '2026-08-01') ] },
      { id: 'v2', clienteId: 'c2', parcelas: [ parcela(1, '2026-07-01', { pago: true, pagoEm: '2026-07-01' }) ] },
    ]
    expect(construirFilaCobranca(vendas, clientes, HOJE, AGORA)).toEqual([])
  })

  it('ignora venda de cliente inexistente', () => {
    const vendas = [ { id: 'v1', clienteId: 'zzz', parcelas: [ parcela(1, '2026-07-01') ] } ]
    expect(construirFilaCobranca(vendas, clientes, HOJE, AGORA)).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- --run filaCobranca`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `src/utils/filaCobranca.js`:

```js
// Monta a fila de cobrança do dia: parcelas não pagas, vencidas ou vencendo hoje,
// de clientes com telefone. Ordena por urgência. Função pura (recebe hoje/agora).
export function construirFilaCobranca(vendas, clientes, hojeISO, agoraISO) {
  const itens = []
  vendas.forEach(venda => {
    venda.parcelas.forEach(parcela => {
      if (parcela.pago) return
      if (parcela.vencimento > hojeISO) return // só atrasadas + vencendo hoje
      const cliente = clientes.find(c => c.id === venda.clienteId)
      if (!cliente || !cliente.telefone) return // sem telefone não dá pra cobrar
      itens.push({
        cliente,
        parcela,
        venda,
        diasAtraso: diasEntre(parcela.vencimento, hojeISO),
        jaCobradoHoje: cobradoNoDia(parcela.ultimaCobrancaEm, agoraISO),
      })
    })
  })
  return itens.sort(ordenar)
}

function ordenar(a, b) {
  if (a.jaCobradoHoje !== b.jaCobradoHoje) return a.jaCobradoHoje ? 1 : -1
  if (b.diasAtraso !== a.diasAtraso) return b.diasAtraso - a.diasAtraso
  const ta = a.parcela.ultimaCobrancaEm ? Date.parse(a.parcela.ultimaCobrancaEm) : 0
  const tb = b.parcela.ultimaCobrancaEm ? Date.parse(b.parcela.ultimaCobrancaEm) : 0
  if (ta !== tb) return ta - tb
  return a.cliente.nome.localeCompare(b.cliente.nome)
}

function diasEntre(vencimentoISO, hojeISO) {
  const v = new Date(vencimentoISO + 'T00:00:00')
  const h = new Date(hojeISO + 'T00:00:00')
  return Math.round((h - v) / 86400000)
}

function cobradoNoDia(ultimaCobrancaEm, agoraISO) {
  if (!ultimaCobrancaEm) return false
  const c = new Date(ultimaCobrancaEm)
  const a = new Date(agoraISO)
  return c.getFullYear() === a.getFullYear() && c.getMonth() === a.getMonth() && c.getDate() === a.getDate()
}
```

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npm test -- --run filaCobranca`
Expected: PASS (5 testes).

- [ ] **Step 5: Suíte inteira**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/filaCobranca.js src/utils/filaCobranca.test.js
git commit -m "feat(cobrancas): função pura da fila de cobrança do dia"
```

---

## Task 2: Tela Modo Cobrança + rota + botão de entrada

**Files:**
- Create: `src/pages/ModoCobranca.jsx`
- Modify: `src/App.jsx` (import lazy + rota `'modo-cobranca'`)
- Modify: `src/pages/CobrancasHoje.jsx` (botão "Iniciar cobrança do dia (N)")

**Interfaces:**
- Consumes: `construirFilaCobranca` (Task 1); props espalhadas por `App.jsx`
  (`clientes`, `vendas`, `navegar`, `registrarCobranca`, `mostrarToast`).
- `registrarCobranca(venda.id, parcela.numero)` é async e grava `ultimaCobrancaEm`.

Verificação: `npm run build` + `npm test -- --run` verdes; conferência manual do fluxo.

- [ ] **Step 1: Criar a tela `ModoCobranca.jsx`**

Criar `src/pages/ModoCobranca.jsx`:

```jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, SkipForward, MessageCircle, PartyPopper } from 'lucide-react'
import { construirFilaCobranca } from '../utils/filaCobranca.js'
import { gerarMensagemCobranca, linkWhatsApp } from '../utils/mensagensCobranca.js'
import { statusParcela, hoje } from '../utils/formatadores.js'
import { rotuloUltimaCobranca } from '../utils/cobrancaSelo.js'

function BotaoVoltar({ navegar }) {
  return (
    <button onClick={() => navegar('cobrancas')} className="flex items-center gap-1 text-ink-muted text-sm font-medium mb-2 -ml-1">
      <ArrowLeft size={18} /> Cobranças
    </button>
  )
}

export default function ModoCobranca({ clientes, vendas, navegar, registrarCobranca, mostrarToast }) {
  const [fila] = useState(() => construirFilaCobranca(vendas, clientes, hoje(), new Date().toISOString()))
  const [indice, setIndice] = useState(0)
  const [enviados, setEnviados] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState(() =>
    fila[0] ? gerarMensagemCobranca(fila[0].parcela, fila[0].cliente, fila[0].venda).mensagem : ''
  )

  const item = fila[indice]

  function avancar(proximo) {
    if (proximo < fila.length) {
      const it = fila[proximo]
      setMensagem(gerarMensagemCobranca(it.parcela, it.cliente, it.venda).mensagem)
    }
    setIndice(proximo)
  }

  async function enviar() {
    if (enviando || !item) return
    setEnviando(true)
    try {
      await registrarCobranca(item.venda.id, item.parcela.numero)
      window.open(linkWhatsApp(item.cliente.telefone, mensagem), '_blank', 'noopener,noreferrer')
      setEnviados(n => n + 1)
      avancar(indice + 1)
    } catch {
      mostrarToast('Erro ao registrar cobrança. Tente de novo.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  if (fila.length === 0) {
    return (
      <div className="p-4 pb-6">
        <BotaoVoltar navegar={navegar} />
        <div className="text-center py-16">
          <PartyPopper size={40} className="mx-auto mb-3 text-brand opacity-70" />
          <p className="font-semibold text-ink">Nenhuma cobrança para hoje</p>
          <p className="text-sm text-ink-muted mt-1">Nada atrasado ou vencendo hoje.</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="p-4 pb-6">
        <BotaoVoltar navegar={navegar} />
        <div className="text-center py-16">
          <PartyPopper size={40} className="mx-auto mb-3 text-brand" />
          <p className="text-lg font-display font-semibold text-ink">Pronto!</p>
          <p className="text-sm text-ink-muted mt-1">
            Você cobrou <strong className="font-mono">{enviados}</strong> de <strong className="font-mono">{fila.length}</strong> hoje.
          </p>
          <button
            onClick={() => navegar('cobrancas')}
            className="mt-6 bg-primary text-white px-6 py-3 rounded-xl font-semibold active:bg-primary-light transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    )
  }

  const st = statusParcela(item.parcela)
  const selo = rotuloUltimaCobranca(item.parcela.ultimaCobrancaEm, new Date().toISOString())

  return (
    <div className="p-4 pb-6 space-y-4">
      <BotaoVoltar navegar={navegar} />

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <h1 className="text-xl font-display font-semibold text-ink">Cobrança do dia</h1>
          <span className="text-sm font-mono text-ink-muted tabular-nums">{indice + 1}/{fila.length}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(indice / fila.length) * 100}%` }} />
        </div>
      </div>

      <motion.div key={indice} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
            <span className="font-display font-semibold text-ink-muted text-base">{item.cliente.nome[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink">{item.cliente.nome}</p>
            {item.cliente.bairro && <p className="text-xs font-mono text-ink-muted">{item.cliente.bairro}</p>}
          </div>
          <div className="text-right flex-shrink-0 font-mono">
            <div className="flex items-baseline gap-0.5 justify-end">
              <span className="text-accent text-xs font-medium">R$</span>
              <span className="text-xl font-semibold text-ink tabular-nums">
                {item.parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-ink-muted">Parcela {item.parcela.numero}/{item.venda.parcelas.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide ${st.bg} ${st.texto}`}>
            {st.label}
          </span>
          {selo && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-medium bg-surface-2 text-ink-muted">
              {selo}
            </span>
          )}
        </div>
      </motion.div>

      <div>
        <label className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wide">Mensagem</label>
        <textarea
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          rows={4}
          className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-sm bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => avancar(indice + 1)}
          className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-2 border-border text-ink-muted font-semibold active:bg-surface-2 transition-colors"
        >
          <SkipForward size={16} /> Pular
        </button>
        <button
          onClick={enviar}
          disabled={enviando}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-primary text-white font-semibold active:bg-primary-light transition-colors disabled:opacity-60"
        >
          <MessageCircle size={16} /> Enviar no WhatsApp
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Registrar a rota em `App.jsx`**

Em `src/App.jsx`, adicionar o import lazy junto aos outros (depois de `RedefinirSenha`):

```jsx
const ModoCobranca = lazy(() => import('./pages/ModoCobranca.jsx'))
```

E adicionar a rota no switch, logo após a linha `{paginaAtiva === 'cobrancas' && <CobrancasHoje {...props} />}`:

```jsx
{paginaAtiva === 'modo-cobranca' && <ModoCobranca {...props} />}
```

- [ ] **Step 3: Botão de entrada em `CobrancasHoje.jsx`**

Em `src/pages/CobrancasHoje.jsx`:

1. Trocar o import do lucide para incluir `Send`:
   ```jsx
   import { Bell, Send } from 'lucide-react'
   ```
2. Incluir `hoje` no import de formatadores e importar a fila:
   ```jsx
   import { formatarMoeda, formatarData, diasAteVencimento, statusParcela, hoje } from '../utils/formatadores.js'
   import { construirFilaCobranca } from '../utils/filaCobranca.js'
   ```
3. Dentro do componente `CobrancasHoje`, depois do `useMemo` de `aVencer`, calcular a fila do dia:
   ```jsx
   const filaHoje = useMemo(
     () => construirFilaCobranca(vendas, clientes, hoje(), new Date().toISOString()),
     [vendas, clientes]
   )
   ```
4. No JSX, logo **depois** do bloco de resumo (`<div className="bg-accent/10 ...">…</div>`) e **antes** da seção "Vencidas", inserir o botão:
   ```jsx
   {filaHoje.length > 0 && (
     <button
       onClick={() => navegar('modo-cobranca')}
       className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-2xl font-semibold active:bg-primary-light transition-colors shadow-sm"
     >
       <Send size={18} /> Iniciar cobrança do dia ({filaHoje.length})
     </button>
   )}
   ```

- [ ] **Step 4: Build + suíte**

Run: `npm run build` (Expected: PASS) e `npm test -- --run` (Expected: PASS).

- [ ] **Step 5: Commit**

```bash
git add src/pages/ModoCobranca.jsx src/App.jsx src/pages/CobrancasHoje.jsx
git commit -m "feat(cobrancas): tela Modo Cobrança guiado + entrada em Cobranças"
```

---

## Verificação final (Plano A)
- `npm test -- --run` verde (inclui `filaCobranca.test.js`).
- `npm run build` limpo.
- Manual no app: em Cobranças, quando há atrasadas/vencendo hoje, aparece "Iniciar cobrança do dia (N)"; a tela mostra progresso "1/N", cliente, mensagem editável; **Enviar** registra + abre WhatsApp + avança; **Pular** avança sem registrar; ao fim, "Pronto! Você cobrou X de N hoje"; quem já foi cobrado hoje aparece no fim.
- Deploy `vercel --prod` ao final da branch (junto com o Plano B, ou isolado se preferir).

## Fora de escopo (é o Plano B)
Lembrete diário no WhatsApp (Supabase pg_cron + Edge Function + CallMeBot).

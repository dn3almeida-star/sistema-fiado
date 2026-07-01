# Relatório com gráficos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o Relatório num painel com 4 gráficos (recebido/mês, a receber/mês, top devedores, pago vs em aberto) construídos com CSS/SVG.

**Architecture:** Uma função pura `metricasRelatorio` agrega os dados das vendas em 4 conjuntos prontos (testável). Três componentes de gráfico presentacionais (barras verticais, barras horizontais, donut SVG) renderizam esses dados. `Relatorio.jsx` liga tudo, preservando os cartões de resumo atuais.

**Tech Stack:** React 18, Vite, Tailwind, Vitest (funções puras), lucide-react.

## Global Constraints

- **Sem mudança nos dados/fluxos.** Só adiciona visualização; os cartões de resumo e o estado vazio existentes permanecem.
- **Sem biblioteca de gráficos.** Barras = divs com dimensão proporcional; donut = SVG com `stroke-dasharray`.
- **Cores de marca fixas nos gráficos** (não trocam no dark): recebido/top = `#154e30` (primary), a receber = `#c97c1a` (accent), pago (donut) = `#16a34a` (success). Trilha do donut e fundo das barras horizontais usam tokens (`--surface-2`) para adaptar ao tema.
- **Datas** são ISO `YYYY-MM-DD`; mês = `slice(0,7)` (`YYYY-MM`); comparação de mês por string. `hojeISO` injetada nas funções puras.
- **Recebido por mês:** últimos 6 meses (atual + 5 anteriores), crescente; soma de parcelas pagas por `pagoEm`; parcelas pagas sem `pagoEm` são ignoradas.
- **A receber por mês:** mês atual + próximos 5, crescente; soma de parcelas não pagas por `vencimento`; parcelas vencidas (mês < atual) somam no mês atual.
- **Top devedores:** até 5 clientes com `saldo > 0`, decrescente; saldo via `resumoCliente`.
- **Testes:** só funções puras via `npm test`. Componentes verificados com `npm run dev` + `npm run build`. Comandos rodam em `sistema-fiado/`.

---

### Task 1: Camada de dados pura (`metricasRelatorio` + `formatarCompacto`) com testes

**Files:**
- Create: `src/utils/metricasRelatorio.js`
- Create: `src/utils/metricasRelatorio.test.js`
- Modify: `src/utils/formatadores.js` (adicionar `formatarCompacto`)
- Create: `src/utils/formatarCompacto.test.js`

**Interfaces:**
- Consumes: `resumoCliente(vendas, clienteId, hojeISO)` de `./resumoCliente.js`.
- Produces:
  - `deslocarMes(mesISO, n) → 'YYYY-MM'` (desloca n meses; n pode ser negativo).
  - `labelMes(mesISO) → 'jan'..'dez'`.
  - `metricasRelatorio(vendas, clientes, hojeISO) → { recebidoPorMes, aReceberPorMes, topDevedores, pagoVsAberto }` onde `recebidoPorMes`/`aReceberPorMes` são `[{ mes, label, valor }]` (6 itens, crescente), `topDevedores` é `[{ cliente, saldo }]` (até 5, desc), `pagoVsAberto` é `{ pago, aberto }`.
  - `formatarCompacto(valor) → string` (ex.: `1234` → `'1,2k'`, `350` → `'350'`).

- [ ] **Step 1: Escrever os testes de `formatarCompacto`**

Criar `src/utils/formatarCompacto.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { formatarCompacto } from './formatadores.js'

describe('formatarCompacto', () => {
  it('valores abaixo de mil: inteiro sem sufixo', () => {
    expect(formatarCompacto(350)).toBe('350')
    expect(formatarCompacto(0)).toBe('0')
    expect(formatarCompacto(999)).toBe('999')
  })
  it('mil ou mais: milhares com 1 casa e sufixo k', () => {
    expect(formatarCompacto(1000)).toBe('1k')
    expect(formatarCompacto(1234)).toBe('1,2k')
    expect(formatarCompacto(12345)).toBe('12,3k')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FALHA — `formatarCompacto` não existe.

- [ ] **Step 3: Implementar `formatarCompacto` em formatadores.js**

Em `src/utils/formatadores.js`, adicionar ao final do arquivo:

```js
export function formatarCompacto(valor) {
  const n = valor || 0
  if (n >= 1000) {
    return (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + 'k'
  }
  return Math.round(n).toLocaleString('pt-BR')
}
```

- [ ] **Step 4: Escrever os testes de `metricasRelatorio`**

Criar `src/utils/metricasRelatorio.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { metricasRelatorio, deslocarMes, labelMes } from './metricasRelatorio.js'

const HOJE = '2026-07-01' // mês atual: 2026-07

describe('deslocarMes', () => {
  it('desloca para frente e para trás', () => {
    expect(deslocarMes('2026-07', 0)).toBe('2026-07')
    expect(deslocarMes('2026-07', -5)).toBe('2026-02')
    expect(deslocarMes('2026-07', 2)).toBe('2026-09')
  })
  it('atravessa a virada de ano', () => {
    expect(deslocarMes('2026-01', -1)).toBe('2025-12')
    expect(deslocarMes('2026-11', 3)).toBe('2027-02')
  })
})

describe('labelMes', () => {
  it('retorna o mês abreviado pt-BR', () => {
    expect(labelMes('2026-07')).toBe('jul')
    expect(labelMes('2026-01')).toBe('jan')
    expect(labelMes('2026-12')).toBe('dez')
  })
})

describe('metricasRelatorio', () => {
  const clientes = [{ id: 'c1', nome: 'Ana' }, { id: 'c2', nome: 'Bruno' }]
  const vendas = [
    { clienteId: 'c1', parcelas: [
      { valor: 100, vencimento: '2026-05-10', pago: true,  pagoEm: '2026-05-12' }, // recebido em mai
      { valor: 200, vencimento: '2026-06-10', pago: false }, // vencida (a receber -> mês atual jul)
      { valor: 150, vencimento: '2026-08-10', pago: false }, // a receber em ago
    ] },
    { clienteId: 'c2', parcelas: [
      { valor: 300, vencimento: '2026-07-20', pago: false }, // a receber em jul
      { valor: 50,  vencimento: '2026-04-01', pago: true, pagoEm: '2026-07-02' }, // recebido em jul
    ] },
  ]

  it('recebido por mês: 6 meses crescentes, soma por pagoEm', () => {
    const { recebidoPorMes } = metricasRelatorio(vendas, clientes, HOJE)
    expect(recebidoPorMes.map(x => x.mes)).toEqual(['2026-02','2026-03','2026-04','2026-05','2026-06','2026-07'])
    const mai = recebidoPorMes.find(x => x.mes === '2026-05')
    const jul = recebidoPorMes.find(x => x.mes === '2026-07')
    expect(mai.valor).toBe(100)
    expect(jul.valor).toBe(50)
    expect(recebidoPorMes.find(x => x.mes === '2026-03').valor).toBe(0)
  })

  it('a receber por mês: vencidas somam no mês atual', () => {
    const { aReceberPorMes } = metricasRelatorio(vendas, clientes, HOJE)
    expect(aReceberPorMes.map(x => x.mes)).toEqual(['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'])
    // jul = 200 (vencida jun) + 300 (jul) = 500
    expect(aReceberPorMes.find(x => x.mes === '2026-07').valor).toBe(500)
    expect(aReceberPorMes.find(x => x.mes === '2026-08').valor).toBe(150)
  })

  it('top devedores: saldo desc, só saldo > 0', () => {
    const { topDevedores } = metricasRelatorio(vendas, clientes, HOJE)
    // c1 aberto = 200 + 150 = 350; c2 aberto = 300
    expect(topDevedores.map(x => x.cliente.id)).toEqual(['c1', 'c2'])
    expect(topDevedores[0].saldo).toBe(350)
  })

  it('pago vs aberto: totais de todas as parcelas', () => {
    const { pagoVsAberto } = metricasRelatorio(vendas, clientes, HOJE)
    expect(pagoVsAberto.pago).toBe(150)   // 100 + 50
    expect(pagoVsAberto.aberto).toBe(650) // 200 + 150 + 300
  })
})
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm test`
Expected: FALHA — `metricasRelatorio.js` não existe.

- [ ] **Step 6: Implementar `metricasRelatorio.js`**

Criar `src/utils/metricasRelatorio.js`:

```js
import { resumoCliente } from './resumoCliente.js'

const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

export function labelMes(mesISO) {
  const m = parseInt(mesISO.slice(5, 7), 10)
  return MESES_ABREV[m - 1]
}

export function deslocarMes(mesISO, n) {
  const ano = parseInt(mesISO.slice(0, 4), 10)
  const mes0 = parseInt(mesISO.slice(5, 7), 10) - 1
  const total = ano * 12 + mes0 + n
  const novoAno = Math.floor(total / 12)
  const novoMes0 = total - novoAno * 12
  return `${novoAno}-${String(novoMes0 + 1).padStart(2, '0')}`
}

export function metricasRelatorio(vendas, clientes, hojeISO) {
  const mesAtual = hojeISO.slice(0, 7)
  const parcelas = vendas.flatMap(v => v.parcelas)

  // Recebido por mês (atual + 5 anteriores, crescente)
  const mesesReceb = Array.from({ length: 6 }, (_, i) => deslocarMes(mesAtual, i - 5))
  const recebidoMap = {}
  parcelas.forEach(p => {
    if (p.pago && p.pagoEm) {
      const m = p.pagoEm.slice(0, 7)
      recebidoMap[m] = (recebidoMap[m] || 0) + (p.valor || 0)
    }
  })
  const recebidoPorMes = mesesReceb.map(m => ({ mes: m, label: labelMes(m), valor: recebidoMap[m] || 0 }))

  // A receber por mês (atual + próximos 5, crescente). Vencidas somam no mês atual.
  const mesesRec = Array.from({ length: 6 }, (_, i) => deslocarMes(mesAtual, i))
  const aReceberMap = {}
  parcelas.forEach(p => {
    if (!p.pago) {
      let m = p.vencimento.slice(0, 7)
      if (m < mesAtual) m = mesAtual
      aReceberMap[m] = (aReceberMap[m] || 0) + (p.valor || 0)
    }
  })
  const aReceberPorMes = mesesRec.map(m => ({ mes: m, label: labelMes(m), valor: aReceberMap[m] || 0 }))

  // Top devedores (até 5, desc)
  const topDevedores = clientes
    .map(c => ({ cliente: c, saldo: resumoCliente(vendas, c.id, hojeISO).saldo }))
    .filter(x => x.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5)

  // Pago vs em aberto (todas as parcelas)
  let pago = 0, aberto = 0
  parcelas.forEach(p => {
    if (p.pago) pago += (p.valor || 0)
    else aberto += (p.valor || 0)
  })

  return { recebidoPorMes, aReceberPorMes, topDevedores, pagoVsAberto: { pago, aberto } }
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm test`
Expected: PASSA (todos os novos testes + os já existentes).

- [ ] **Step 8: Commit**

```bash
git add src/utils/metricasRelatorio.js src/utils/metricasRelatorio.test.js src/utils/formatadores.js src/utils/formatarCompacto.test.js
git commit -m "feat(relatorio): add metricasRelatorio and formatarCompacto with tests"
```

---

### Task 2: Componentes de gráfico (barras verticais, horizontais, donut)

**Files:**
- Create: `src/components/GraficoBarras.jsx`
- Create: `src/components/BarrasHorizontais.jsx`
- Create: `src/components/Donut.jsx`

**Interfaces:**
- Consumes: `formatarCompacto`, `formatarMoeda` de `formatadores.js`.
- Produces:
  - `<GraficoBarras dados={[{ mes, label, valor }]} cor="#154e30" destaqueIndex={5|null} />`
  - `<BarrasHorizontais itens={[{ label, valor }]} cor="#154e30" />`
  - `<Donut pago={number} aberto={number} />`

- [ ] **Step 1: Criar `GraficoBarras.jsx`**

Criar `src/components/GraficoBarras.jsx`:

```jsx
import { formatarCompacto } from '../utils/formatadores.js'

export default function GraficoBarras({ dados, cor = '#154e30', destaqueIndex = null }) {
  const max = Math.max(...dados.map(d => d.valor), 1)
  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {dados.map((d, i) => {
        const alturaPct = d.valor > 0 ? Math.max((d.valor / max) * 100, 4) : 0
        const destaque = destaqueIndex === null || i === destaqueIndex
        return (
          <div key={d.mes} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <span className="text-[10px] font-semibold text-ink-muted tabular-nums h-3 leading-3">
              {d.valor > 0 ? formatarCompacto(d.valor) : ''}
            </span>
            <div
              className="w-full rounded-t-md"
              style={{ height: `${alturaPct}%`, backgroundColor: cor, opacity: destaque ? 1 : 0.4 }}
            />
            <span className="text-[10px] text-ink-muted">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Criar `BarrasHorizontais.jsx`**

Criar `src/components/BarrasHorizontais.jsx`:

```jsx
import { formatarMoeda } from '../utils/formatadores.js'

export default function BarrasHorizontais({ itens, cor = '#154e30' }) {
  const max = Math.max(...itens.map(i => i.valor), 1)
  return (
    <div className="space-y-2.5">
      {itens.map((it, i) => (
        <div key={i}>
          <div className="flex justify-between items-baseline text-sm mb-1 gap-2">
            <span className="text-ink truncate">{it.label}</span>
            <span className="font-bold text-ink tabular-nums flex-shrink-0">{formatarMoeda(it.valor)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(it.valor / max) * 100}%`, backgroundColor: cor }} />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Criar `Donut.jsx`**

Criar `src/components/Donut.jsx`:

```jsx
import { formatarMoeda } from '../utils/formatadores.js'

export default function Donut({ pago, aberto }) {
  const total = pago + aberto
  const pct = total > 0 ? pago / total : 0
  const r = 42
  const circ = 2 * Math.PI * r
  const dash = circ * pct

  return (
    <div className="flex items-center gap-4">
      <svg width="110" height="110" viewBox="0 0 110 110" className="flex-shrink-0 -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="12" />
        <circle
          cx="55" cy="55" r={r} fill="none" stroke="#16a34a" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
        />
      </svg>
      <div className="flex-1 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#16a34a' }} />
          <span className="text-ink-muted">Pago</span>
          <span className="font-bold text-ink ml-auto tabular-nums">{formatarMoeda(pago)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-surface-2 border border-border flex-shrink-0" />
          <span className="text-ink-muted">Em aberto</span>
          <span className="font-bold text-ink ml-auto tabular-nums">{formatarMoeda(aberto)}</span>
        </div>
        <p className="text-xs text-ink-muted pt-1">{Math.round(pct * 100)}% quitado</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build conclui sem erros (componentes ainda não usados; só garante que compilam).

- [ ] **Step 5: Commit**

```bash
git add src/components/GraficoBarras.jsx src/components/BarrasHorizontais.jsx src/components/Donut.jsx
git commit -m "feat(relatorio): add chart components (bars, horizontal bars, donut)"
```

---

### Task 3: Integrar os gráficos em Relatorio.jsx

**Files:**
- Modify: `src/pages/Relatorio.jsx`

**Interfaces:**
- Consumes: `metricasRelatorio` (Task 1); `GraficoBarras`, `BarrasHorizontais`, `Donut` (Task 2); `hoje` de `formatadores.js`.

- [ ] **Step 1: Adicionar imports**

Em `src/pages/Relatorio.jsx`, ajustar a linha de import de `formatadores` e adicionar os novos imports (topo do arquivo):

```jsx
import { formatarMoeda, mesAtual, diasAteVencimento, hoje } from '../utils/formatadores.js'
import { metricasRelatorio } from '../utils/metricasRelatorio.js'
import GraficoBarras from '../components/GraficoBarras.jsx'
import BarrasHorizontais from '../components/BarrasHorizontais.jsx'
import Donut from '../components/Donut.jsx'
```

- [ ] **Step 2: Calcular as métricas via useMemo**

Em `src/pages/Relatorio.jsx`, logo após o `useMemo` existente de `stats` (que termina em `}, [vendas])`), adicionar:

```jsx
  const metricas = useMemo(() => metricasRelatorio(vendas, clientes, hoje()), [vendas, clientes])
```

- [ ] **Step 3: Renderizar os 4 gráficos**

Em `src/pages/Relatorio.jsx`, dentro do bloco `{vendas.length === 0 ? (...) : ( <> ... </> )}`, APÓS o `<div className="space-y-3">...</div>` dos cartões de resumo (o `</div>` que fecha os `CardResumo`) e ANTES do bloco `{/* Resumo geral */}`, inserir:

```jsx
          {/* Recebido por mês */}
          <div className="bg-surface rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-ink mb-3">Recebido por mês</h2>
            <GraficoBarras dados={metricas.recebidoPorMes} cor="#154e30" destaqueIndex={5} />
          </div>

          {/* A receber por mês */}
          <div className="bg-surface rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-ink mb-3">A receber por mês</h2>
            <GraficoBarras dados={metricas.aReceberPorMes} cor="#c97c1a" />
          </div>

          {/* Top devedores */}
          <div className="bg-surface rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-ink mb-3">Top devedores</h2>
            {metricas.topDevedores.length > 0 ? (
              <BarrasHorizontais
                itens={metricas.topDevedores.map(d => ({ label: d.cliente.nome, valor: d.saldo }))}
                cor="#154e30"
              />
            ) : (
              <p className="text-sm text-ink-muted">Nenhum cliente devendo no momento.</p>
            )}
          </div>

          {/* Pago vs em aberto */}
          <div className="bg-surface rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-ink mb-3">Pago vs em aberto</h2>
            <Donut pago={metricas.pagoVsAberto.pago} aberto={metricas.pagoVsAberto.aberto} />
          </div>
```

- [ ] **Step 4: Verificar build e testes**

Run: `npm run build`
Expected: build sem erros.

Run: `npm test`
Expected: testes verdes (Task 1 + existentes).

- [ ] **Step 5: Verificar no navegador**

Run: `npm run dev`
Expected: no Relatório aparecem os 4 gráficos abaixo dos cartões: barras verde de recebido (mês atual destacado), barras âmbar de a receber, barras horizontais de top devedores, e o donut pago/aberto com % quitado. Tudo legível no tema claro e escuro. Estado vazio (sem vendas) inalterado.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Relatorio.jsx
git commit -m "feat(relatorio): render charts panel in Relatorio"
```

---

## Verificação final

- [ ] `npm test` — `metricasRelatorio` e `formatarCompacto` passam + suíte existente intacta.
- [ ] `npm run build` — build de produção sem erros.
- [ ] `npm run dev` — 4 gráficos com dados corretos, dark mode ok, cartões de resumo e estado vazio preservados.

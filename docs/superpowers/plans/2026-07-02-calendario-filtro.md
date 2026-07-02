# Calendário Visual no Filtro de Período — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os campos nativos de data/mês/ano do modo Período por um calendário visual com abas Dia/Mês/Ano, navegável por mês/ano/década.

**Architecture:** Funções puras de calendário (`src/utils/calendario.js`) alimentam um novo componente `SeletorPeriodo.jsx`, que substitui os três `<input>` nativos que hoje existem em `ListaVendas.jsx` para o modo Período. O menu de filtro simplifica: o antigo submenu de texto "Dia/Mês/Ano" desaparece, porque essa escolha agora acontece como abas dentro do próprio calendário.

**Tech Stack:** React 18, Vite, Tailwind, Vitest, `lucide-react` (ícones `ChevronLeft`/`ChevronRight`). Sem dependências novas — `Date` nativo, mesmo padrão de `formatadores.js`/`vendaAvista.js`.

## Global Constraints

- Sem biblioteca de datas nova — só `Date` nativo.
- `vendaNoPeriodo` (já existente, `src/utils/filtroVendas.js`) não muda — o novo componente entrega o valor no formato que ela já espera (`'YYYY-MM-DD'` / `'YYYY-MM'` / `'YYYY'`).
- Trocar de aba (Dia/Mês/Ano) preserva a navegação de cada aba independentemente.
- Entrar no modo Período sempre abre na aba Dia, mês atual, sem seleção.
- Tocar no valor já selecionado desmarca o filtro.
- A aba Ano mostra uma década por vez: grade de 2 colunas × 5 linhas, 10 anos exatos.
- Sem mudanças de banco de dados.

---

## File Structure

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/utils/calendario.js` (novo) | Funções puras: `diasDoMes`, `nomeDoMes`, `decadaDoAno`. |
| `src/utils/calendario.test.js` (novo) | Testes das 3 funções. |
| `src/components/SeletorPeriodo.jsx` (novo) | Calendário com abas Dia/Mês/Ano, navegação própria por aba, seleção/desseleção. |
| `src/components/ListaVendas.jsx` (modificar) | Remove o submenu de texto Dia/Mês/Ano e os 3 `<input>` nativos; adiciona `<SeletorPeriodo>` e o estado de granularidade do período. |

**Mudança de arquitetura em `ListaVendas.jsx`:** hoje `modo` pode ser `'cliente' | 'produto' | 'dia' | 'mes' | 'ano'`, e o filtro de menu tem 2 níveis (Cliente/Produto/Período → depois Dia/Mês/Ano). Depois desta feature, `modo` passa a ser só `'cliente' | 'produto' | 'periodo'` (o menu volta a ter 1 nível, 3 botões), e um novo estado `granularidadePeriodo` (`'dia' | 'mes' | 'ano'`, default `'dia'`) guarda qual aba do calendário produziu o último valor selecionado — é isso que vai pra `vendaNoPeriodo` como `granularidade`.

---

## Task 1: Funções puras de calendário

**Files:**
- Create: `src/utils/calendario.js`
- Test: `src/utils/calendario.test.js`

**Interfaces:**
- Produces:
  - `diasDoMes(ano, mes) → Array<number | null>` — `mes` 1-indexado (1=Janeiro). Retorna os slots da grade: `null` pros espaços vazios antes do dia 1 (conforme o dia da semana em que o mês começa — domingo=0), depois os números `1..N` (N = total de dias do mês).
  - `nomeDoMes(mes) → string` — nome do mês por extenso em português, `mes` 1-indexado.
  - `decadaDoAno(ano) → number` — início da década daquele ano (ex: `2026` → `2020`).

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/utils/calendario.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { diasDoMes, nomeDoMes, decadaDoAno } from './calendario.js'

describe('diasDoMes', () => {
  it('julho de 2026 tem 31 dias, começando numa quarta (3 slots vazios antes do dia 1)', () => {
    const slots = diasDoMes(2026, 7)
    expect(slots[0]).toBe(null)
    expect(slots[1]).toBe(null)
    expect(slots[2]).toBe(null)
    expect(slots[3]).toBe(1)
    expect(slots[slots.length - 1]).toBe(31)
    expect(slots.filter(s => s !== null)).toHaveLength(31)
  })

  it('fevereiro de 2026 (não bissexto) tem 28 dias', () => {
    const slots = diasDoMes(2026, 2)
    expect(slots.filter(s => s !== null)).toHaveLength(28)
  })

  it('fevereiro de 2028 (bissexto) tem 29 dias', () => {
    const slots = diasDoMes(2028, 2)
    expect(slots.filter(s => s !== null)).toHaveLength(29)
  })

  it('dezembro (mes=12) funciona sem erro de índice', () => {
    const slots = diasDoMes(2026, 12)
    expect(slots.filter(s => s !== null)).toHaveLength(31)
  })
})

describe('nomeDoMes', () => {
  it('retorna os 12 nomes em português', () => {
    expect(nomeDoMes(1)).toBe('Janeiro')
    expect(nomeDoMes(2)).toBe('Fevereiro')
    expect(nomeDoMes(3)).toBe('Março')
    expect(nomeDoMes(4)).toBe('Abril')
    expect(nomeDoMes(5)).toBe('Maio')
    expect(nomeDoMes(6)).toBe('Junho')
    expect(nomeDoMes(7)).toBe('Julho')
    expect(nomeDoMes(8)).toBe('Agosto')
    expect(nomeDoMes(9)).toBe('Setembro')
    expect(nomeDoMes(10)).toBe('Outubro')
    expect(nomeDoMes(11)).toBe('Novembro')
    expect(nomeDoMes(12)).toBe('Dezembro')
  })
})

describe('decadaDoAno', () => {
  it('ano no meio da década', () => {
    expect(decadaDoAno(2026)).toBe(2020)
  })
  it('ano no início da década', () => {
    expect(decadaDoAno(2020)).toBe(2020)
  })
  it('ano no fim da década', () => {
    expect(decadaDoAno(2029)).toBe(2020)
  })
  it('outra década', () => {
    expect(decadaDoAno(1999)).toBe(1990)
  })
})
```

- [ ] **Step 2: Rodar os testes e ver que falham**

Run: `npm test -- calendario`
Expected: FAIL — "Failed to resolve import './calendario.js'" ou funções não definidas.

- [ ] **Step 3: Implementar as funções mínimas**

Criar `src/utils/calendario.js`:

```js
const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function diasDoMes(ano, mes) {
  const primeiroDia = new Date(ano, mes - 1, 1)
  const diaSemanaInicio = primeiroDia.getDay()
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const slots = []
  for (let i = 0; i < diaSemanaInicio; i++) slots.push(null)
  for (let d = 1; d <= ultimoDia; d++) slots.push(d)
  return slots
}

export function nomeDoMes(mes) {
  return NOMES_MESES[mes - 1]
}

export function decadaDoAno(ano) {
  return Math.floor(ano / 10) * 10
}
```

- [ ] **Step 4: Rodar os testes e ver que passam**

Run: `npm test -- calendario`
Expected: PASS — 12 testes passando.

- [ ] **Step 5: Rodar a suíte completa (garantir zero regressão)**

Run: `npm test`
Expected: PASS — todos os testes anteriores (64) + os 12 novos = 76.

- [ ] **Step 6: Commit**

```bash
git add src/utils/calendario.js src/utils/calendario.test.js
git commit -m "feat(vendas): add pure calendar helper functions for the period picker"
```

---

## Task 2: Componente `SeletorPeriodo`

**Files:**
- Create: `src/components/SeletorPeriodo.jsx`

**Interfaces:**
- Consumes: `diasDoMes`, `nomeDoMes`, `decadaDoAno` de `src/utils/calendario.js` (Task 1).
- Produces: componente default `SeletorPeriodo({ valor, onSelecionar })`, usado por `ListaVendas.jsx` (Task 3).
  - `valor`: string do valor atualmente selecionado (`''` se nenhum), no formato que `vendaNoPeriodo` espera pra granularidade correspondente.
  - `onSelecionar(granularidade, novoValor)`: chamado quando o usuário toca num dia/mês/ano. `granularidade` é `'dia' | 'mes' | 'ano'` (a aba de onde veio o toque). Se o usuário tocar no mesmo valor já selecionado, `novoValor` é `''` (desmarca).

- [ ] **Step 1: Criar o componente**

Criar `src/components/SeletorPeriodo.jsx`:

```jsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { diasDoMes, nomeDoMes, decadaDoAno } from '../utils/calendario.js'

const ABAS = [
  { id: 'dia', label: 'Dia' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

const CELULA_BASE = 'rounded-lg text-sm font-medium transition-colors'
const CELULA_SELECIONADA = 'bg-primary text-white'
const CELULA_NORMAL = 'text-ink active:bg-surface-2'

export default function SeletorPeriodo({ valor, onSelecionar }) {
  const hoje = new Date()
  const [aba, setAba] = useState('dia')
  const [anoVistaDia, setAnoVistaDia] = useState(hoje.getFullYear())
  const [mesVistaDia, setMesVistaDia] = useState(hoje.getMonth() + 1)
  const [anoVistaMes, setAnoVistaMes] = useState(hoje.getFullYear())
  const [decadaVistaAno, setDecadaVistaAno] = useState(decadaDoAno(hoje.getFullYear()))

  function mesAnterior() {
    if (mesVistaDia === 1) { setMesVistaDia(12); setAnoVistaDia(a => a - 1) }
    else setMesVistaDia(m => m - 1)
  }

  function mesProximo() {
    if (mesVistaDia === 12) { setMesVistaDia(1); setAnoVistaDia(a => a + 1) }
    else setMesVistaDia(m => m + 1)
  }

  function selecionarDia(dia) {
    const valorDia = `${anoVistaDia}-${pad2(mesVistaDia)}-${pad2(dia)}`
    onSelecionar('dia', valor === valorDia ? '' : valorDia)
  }

  function selecionarMes(mes) {
    const valorMes = `${anoVistaMes}-${pad2(mes)}`
    onSelecionar('mes', valor === valorMes ? '' : valorMes)
  }

  function selecionarAno(ano) {
    const valorAno = String(ano)
    onSelecionar('ano', valor === valorAno ? '' : valorAno)
  }

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-sm p-3">
      <div className="flex gap-2 bg-surface-2 p-1 rounded-xl mb-3">
        {ABAS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
              aba === id ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'dia' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={mesAnterior} className="p-2 text-ink-muted">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-ink text-sm">{nomeDoMes(mesVistaDia)} {anoVistaDia}</span>
            <button type="button" onClick={mesProximo} className="p-2 text-ink-muted">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted mb-1">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {diasDoMes(anoVistaDia, mesVistaDia).map((dia, i) => {
              if (dia === null) return <span key={i} />
              const valorDia = `${anoVistaDia}-${pad2(mesVistaDia)}-${pad2(dia)}`
              const selecionado = valor === valorDia
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selecionarDia(dia)}
                  className={`aspect-square ${CELULA_BASE} ${selecionado ? CELULA_SELECIONADA : CELULA_NORMAL}`}
                >
                  {dia}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {aba === 'mes' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setAnoVistaMes(a => a - 1)} className="p-2 text-ink-muted">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-ink text-sm">{anoVistaMes}</span>
            <button type="button" onClick={() => setAnoVistaMes(a => a + 1)} className="p-2 text-ink-muted">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
              const valorMes = `${anoVistaMes}-${pad2(mes)}`
              const selecionado = valor === valorMes
              return (
                <button
                  key={mes}
                  type="button"
                  onClick={() => selecionarMes(mes)}
                  className={`py-2.5 ${CELULA_BASE} ${selecionado ? CELULA_SELECIONADA : CELULA_NORMAL}`}
                >
                  {nomeDoMes(mes).slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {aba === 'ano' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setDecadaVistaAno(d => d - 10)} className="p-2 text-ink-muted">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-ink text-sm">{decadaVistaAno}–{decadaVistaAno + 9}</span>
            <button type="button" onClick={() => setDecadaVistaAno(d => d + 10)} className="p-2 text-ink-muted">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => decadaVistaAno + i).map(ano => {
              const valorAno = String(ano)
              const selecionado = valor === valorAno
              return (
                <button
                  key={ano}
                  type="button"
                  onClick={() => selecionarAno(ano)}
                  className={`py-2.5 ${CELULA_BASE} ${selecionado ? CELULA_SELECIONADA : CELULA_NORMAL}`}
                >
                  {ano}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar o build (sem erro de sintaxe/import)**

Run: `npm run build`
Expected: `✓ built` sem erros. (Não há teste automatizado para este componente — é de apresentação, seguindo a convenção do projeto de não testar `.jsx` de página/componente.)

- [ ] **Step 3: Rodar a suíte de testes (garantir zero regressão)**

Run: `npm test`
Expected: PASS — mesma contagem da Task 1 (76 testes; nenhum novo aqui, nenhum quebrado).

- [ ] **Step 4: Commit**

```bash
git add src/components/SeletorPeriodo.jsx
git commit -m "feat(vendas): add SeletorPeriodo calendar component with Dia/Mês/Ano tabs"
```

---

## Task 3: Integrar `SeletorPeriodo` em `ListaVendas.jsx`

**Files:**
- Modify: `src/components/ListaVendas.jsx` (reescrever o arquivo inteiro — conteúdo completo abaixo)

**Interfaces:**
- Consumes: `SeletorPeriodo({ valor, onSelecionar })` de `src/components/SeletorPeriodo.jsx` (Task 2). `vendaNoPeriodo`, `statusVenda`, `formatarMoeda`, `formatarData` continuam sendo usados como já estão.
- Produces: nenhuma interface nova — último arquivo da feature.

**O que muda, em detalhe:**
- `modo` passa a ser `'cliente' | 'produto' | 'periodo'` (antes incluía `'dia'|'mes'|'ano'` também).
- Novo estado `granularidadePeriodo` (`'dia' | 'mes' | 'ano'`, default `'dia'`) — atualizado só quando `SeletorPeriodo` chama `onSelecionar`.
- `escolherModo` (chamado pelos 3 botões do menu) reseta `busca` pra `''` — igual antes. Não precisa resetar `granularidadePeriodo` manualmente: como `<SeletorPeriodo>` só é renderizado quando `modo === 'periodo'`, ele desmonta sempre que o usuário sai desse modo e remonta do zero na próxima vez que entrar (o mesmo truque de reset-por-remontagem já usado no `VendasTab` da feature anterior) — seu estado interno (aba ativa, navegação de mês/ano/década) volta ao padrão sozinho.
- O menu de filtro volta a ter só 1 nível: Cliente / Produto / Período (o antigo submenu de texto Dia/Mês/Ano é removido — essa escolha agora é feita dentro do `SeletorPeriodo`, via abas).
- A lógica de filtragem usa `granularidadePeriodo` (não mais `modo`) como segundo argumento de `vendaNoPeriodo`.

- [ ] **Step 1: Substituir o conteúdo do arquivo**

Sobrescrever `src/components/ListaVendas.jsx` com:

```jsx
import { useState, useMemo } from 'react'
import { Search, ChevronRight, ShoppingBag, Filter } from 'lucide-react'
import { formatarMoeda, formatarData } from '../utils/formatadores.js'
import { statusVenda } from '../utils/statusVenda.js'
import { vendaNoPeriodo } from '../utils/filtroVendas.js'
import SeletorPeriodo from './SeletorPeriodo.jsx'

export default function ListaVendas({ vendas, clientes, navegar }) {
  const [modo, setModo] = useState('cliente')
  const [busca, setBusca] = useState('')
  const [granularidadePeriodo, setGranularidadePeriodo] = useState('dia')
  const [menuAberto, setMenuAberto] = useState(false)

  function escolherModo(novoModo) {
    setModo(novoModo)
    setBusca('')
    setMenuAberto(false)
  }

  const lista = useMemo(() => {
    return vendas
      .map(venda => ({ venda, cliente: clientes.find(c => c.id === venda.clienteId) }))
      .filter(({ venda, cliente }) => {
        if (modo === 'cliente') return (cliente?.nome || '').toLowerCase().includes(busca.toLowerCase())
        if (modo === 'produto') return (venda.itens || '').toLowerCase().includes(busca.toLowerCase())
        return vendaNoPeriodo(venda, granularidadePeriodo, busca)
      })
      .sort((a, b) => new Date(b.venda.criadaEm) - new Date(a.venda.criadaEm))
  }, [vendas, clientes, busca, modo, granularidadePeriodo])

  if (vendas.length === 0) {
    return (
      <div className="text-center py-12 text-ink-muted">
        <ShoppingBag size={36} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">Nenhuma venda ainda</p>
      </div>
    )
  }

  const placeholderTexto = modo === 'cliente' ? 'Buscar por cliente…' : 'Buscar por produto…'

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          {(modo === 'cliente' || modo === 'produto') && (
            <>
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="text"
                placeholder={placeholderTexto}
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
              />
            </>
          )}
          {modo === 'periodo' && (
            <div className="flex items-center h-11 px-1 text-sm text-ink-muted font-medium">
              Filtrando por período
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAberto(a => !a)}
            className={`flex items-center justify-center w-11 h-11 rounded-2xl border transition-colors ${
              modo !== 'cliente' ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-ink-muted'
            }`}
          >
            <Filter size={18} />
          </button>

          {menuAberto && (
            <div className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-2xl shadow-sm p-1.5 z-10">
              <button
                type="button"
                onClick={() => escolherModo('cliente')}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => escolherModo('produto')}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
              >
                Produto
              </button>
              <button
                type="button"
                onClick={() => escolherModo('periodo')}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
              >
                Período
              </button>
            </div>
          )}
        </div>
      </div>

      {modo === 'periodo' && (
        <SeletorPeriodo
          valor={busca}
          onSelecionar={(novaGranularidade, novoValor) => {
            setGranularidadePeriodo(novaGranularidade)
            setBusca(novoValor)
          }}
        />
      )}

      {lista.length === 0 ? (
        <p className="text-center text-ink-muted py-6 text-sm">Nenhuma venda encontrada</p>
      ) : (
        <div className="space-y-2">
          {lista.map(({ venda, cliente }) => {
            const status = statusVenda(venda)
            const nome = cliente?.nome || 'Cliente removido'
            return (
              <button
                key={venda.id}
                onClick={() => cliente && navegar('perfil', { clienteId: cliente.id })}
                disabled={!cliente}
                className="w-full bg-surface rounded-2xl shadow-sm p-4 text-left flex items-center gap-3 active:bg-surface-2 transition-colors disabled:opacity-60"
              >
                <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-lg">{nome[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{nome}</p>
                  <p className="text-sm text-ink-muted truncate">{venda.itens}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-ink tabular-nums">{formatarMoeda(venda.valorTotal)}</span>
                    <span className="text-xs text-ink-muted">{formatarData(venda.criadaEm)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.classe}`}>
                    {status.label}
                  </span>
                  <ChevronRight size={16} className="text-ink-muted" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Nota de implementação:** o campo de busca (linha da lupa) fica vazio/"Filtrando por período" quando `modo === 'periodo'`, porque o calendário aparece logo abaixo — não faz sentido ter um campo de texto ali junto com o calendário. Isso é intencional, não um bug.

- [ ] **Step 2: Verificar o build**

Run: `npm run build`
Expected: `✓ built` sem erros.

- [ ] **Step 3: Rodar a suíte de testes (garantir zero regressão)**

Run: `npm test`
Expected: PASS — mesma contagem das tasks anteriores (76 testes).

- [ ] **Step 4: Commit**

```bash
git add src/components/ListaVendas.jsx
git commit -m "feat(vendas): replace native date/month/year inputs with the visual SeletorPeriodo calendar"
```

---

## Verificação manual (após todas as tasks, pelo humano)

Sem display/browser nos subagentes, então confirmar visualmente:
- Menu de filtro tem só Cliente / Produto / Período (sem o antigo submenu Dia/Mês/Ano).
- Escolher Período mostra o calendário, sempre abrindo na aba Dia, mês atual, nada selecionado.
- Aba Dia: navegar entre meses (‹ ›), tocar num dia filtra por aquele dia; tocar de novo desmarca.
- Aba Mês: navegar entre anos, tocar num mês filtra o mês inteiro; tocar de novo desmarca.
- Aba Ano: navegar entre décadas, tocar num ano filtra o ano inteiro; tocar de novo desmarca.
- Trocar de aba (Dia→Mês→Dia) preserva a posição de navegação de cada uma.
- Sair do modo Período (trocar pra Cliente/Produto) e voltar reseta o calendário pro padrão (aba Dia, mês atual, sem seleção) — confirma o reset-por-remontagem.
- Filtrar com vendas de datas conhecidas e conferir que só as esperadas aparecem, incluindo um caso perto da virada de fuso horário (venda criada tarde da noite local).

## Maintenance note

Um "página" de 12 anos por navegação (a década) é fixa em múltiplos de 10 (2020, 2030, ...) via `decadaDoAno`. Se no uso real fizer mais sentido navegar ano a ano em vez de década a década, é uma mudança pequena e isolada dentro de `SeletorPeriodo.jsx` (trocar o passo de `±10` por `±1` na aba Ano) — não afeta o resto da feature.

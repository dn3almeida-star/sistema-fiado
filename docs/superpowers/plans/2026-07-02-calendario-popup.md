# Calendário como Popup + Polimento Visual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o calendário de período num popup flutuante (com fundo escurecido), restringir a aba Ano ao ano atual em diante, memorizar a navegação por 5 minutos entre aberturas, e melhorar o acabamento visual/fluidez.

**Architecture:** `SeletorPeriodo` passa a controlar sua própria visibilidade via uma prop `aberto` (em vez de ser condicionalmente montado/desmontado pelo pai) — assim seu estado de navegação sobrevive entre uma abertura e outra do popup. Um `useRef` guarda o timestamp do último fechamento; ao reabrir, se passaram 5+ minutos, a navegação reseta pro padrão. `ListaVendas` ganha um botão clicável que abre esse popup, no lugar do texto estático de hoje.

**Tech Stack:** React 18, Vite, Tailwind, Vitest, `lucide-react`, `framer-motion` (já é dependência do projeto — usado em `App.jsx`, `BottomNav.jsx`, etc.).

## Global Constraints

- `vendaNoPeriodo` (`src/utils/filtroVendas.js`) não muda.
- A restrição "só ano atual em diante" é exclusiva da aba Ano — Dia e Mês continuam navegáveis livremente pro passado.
- O timer de 5 minutos é lógica interna, sem nenhuma indicação visual — invisível ao usuário.
- Selecionar um valor (dia/mês/ano) fecha o popup automaticamente.
- Fechar o popup (X ou seleção) nunca afeta o filtro já aplicado — só a navegação visual futura do calendário.
- Sem biblioteca de datas nova — `Date` nativo. `framer-motion` já é dependência existente.
- Sem mudanças de banco de dados.

---

## File Structure

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/utils/calendario.js` (modificar) | Remove `decadaDoAno` (órfã). Adiciona `rotuloPeriodo`. |
| `src/utils/calendario.test.js` (modificar) | Remove os testes de `decadaDoAno`. Adiciona os de `rotuloPeriodo`. |
| `src/components/SeletorPeriodo.jsx` (modificar) | Reescrita completa: popup controlado por `aberto`/`onFechar`, timer de 5 min, aba Ano sem década, polimento visual e de movimento. |
| `src/components/ListaVendas.jsx` (modificar) | Novo estado `calendarioAberto`. Botão clicável no lugar do texto estático. `SeletorPeriodo` recebe `aberto`/`onFechar`. |

---

## Task 1: `rotuloPeriodo` + remover `decadaDoAno`

**Files:**
- Modify: `src/utils/calendario.js`
- Modify: `src/utils/calendario.test.js`

**Interfaces:**
- Consumes: nada de outras tasks.
- Produces: `rotuloPeriodo(granularidade, valor) → string` — `granularidade` é `'dia'|'mes'|'ano'`, `valor` é a string no formato que `vendaNoPeriodo` já usa (`'YYYY-MM-DD'`/`'YYYY-MM'`/`'YYYY'`). Retorna `''` se `valor` for vazio. Usado por `ListaVendas.jsx` (Task 3).

**Nota de sequenciamento:** `decadaDoAno` continua existindo e é usada por `src/components/SeletorPeriodo.jsx` **até a Task 2 rodar** (é a Task 2 que reescreve esse componente e para de usá-la). Por isso esta task NÃO remove `decadaDoAno` — só adiciona `rotuloPeriodo`. A remoção de `decadaDoAno` (código + testes) fica dentro da Task 2, no mesmo commit que reescreve `SeletorPeriodo.jsx`, pra nenhum commit individual deixar o build quebrado.

- [ ] **Step 1: Escrever os testes novos que falham**

Editar `src/utils/calendario.test.js` — trocar a linha de import:

```js
import { diasDoMes, nomeDoMes, decadaDoAno } from './calendario.js'
```

por:

```js
import { diasDoMes, nomeDoMes, decadaDoAno, rotuloPeriodo } from './calendario.js'
```

E adicionar, ao final do arquivo (depois do `describe('decadaDoAno', ...)`):

```js

describe('rotuloPeriodo', () => {
  it('dia: formata DD/MM/YYYY', () => {
    expect(rotuloPeriodo('dia', '2026-07-15')).toBe('15/07/2026')
  })

  it('mes: formata "Mês de YYYY"', () => {
    expect(rotuloPeriodo('mes', '2026-07')).toBe('Julho de 2026')
  })

  it('ano: retorna o próprio valor', () => {
    expect(rotuloPeriodo('ano', '2026')).toBe('2026')
  })

  it('valor vazio retorna string vazia, em qualquer granularidade', () => {
    expect(rotuloPeriodo('dia', '')).toBe('')
    expect(rotuloPeriodo('mes', '')).toBe('')
    expect(rotuloPeriodo('ano', '')).toBe('')
  })
})
```

- [ ] **Step 2: Rodar os testes e ver que os novos falham**

Run: `npm test -- calendario`
Expected: FAIL — `rotuloPeriodo is not a function` (ou erro de import). Os testes de `diasDoMes`/`nomeDoMes`/`decadaDoAno` continuam passando normalmente.

- [ ] **Step 3: Implementar `rotuloPeriodo`**

Editar `src/utils/calendario.js` — adicionar, ao final do arquivo:

```js

export function rotuloPeriodo(granularidade, valor) {
  if (!valor) return ''
  if (granularidade === 'dia') {
    const [ano, mes, dia] = valor.split('-')
    return `${dia}/${mes}/${ano}`
  }
  if (granularidade === 'mes') {
    const [ano, mes] = valor.split('-')
    return `${nomeDoMes(Number(mes))} de ${ano}`
  }
  if (granularidade === 'ano') return valor
  return ''
}
```

- [ ] **Step 4: Rodar os testes e ver que tudo passa**

Run: `npm test -- calendario`
Expected: PASS — 13 testes (4 `diasDoMes` + 1 `nomeDoMes` + 4 `decadaDoAno` + 4 `rotuloPeriodo`).

- [ ] **Step 5: Rodar a suíte completa e o build (garantir zero regressão)**

Run: `npm test`
Expected: PASS — 77 testes (73 de antes + 4 `rotuloPeriodo` novos; `decadaDoAno` continua presente e usada por `SeletorPeriodo.jsx`, então nada foi removido nesta task).

Run: `npm run build`
Expected: `✓ built` sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/utils/calendario.js src/utils/calendario.test.js
git commit -m "feat(vendas): add rotuloPeriodo helper"
```

---

## Task 2: `SeletorPeriodo` — popup, timer, aba Ano restrita, polimento

**Files:**
- Modify: `src/components/SeletorPeriodo.jsx` (reescrever o arquivo inteiro)
- Modify: `src/utils/calendario.js` (remover `decadaDoAno` — ver Step 2)
- Modify: `src/utils/calendario.test.js` (remover os testes de `decadaDoAno` — ver Step 2)

**Interfaces:**
- Consumes: `diasDoMes`, `nomeDoMes` de `src/utils/calendario.js`. `motion`, `AnimatePresence` de `framer-motion` (já é dependência do projeto).
- Esta task é quem torna `decadaDoAno` (de `src/utils/calendario.js`, criada numa feature anterior) órfã — o novo `SeletorPeriodo.jsx` não a usa mais (a aba Ano agora começa no ano atual, não numa década fixa). Por isso a remoção de `decadaDoAno` acontece **nesta task**, no mesmo commit que para de usá-la — não na Task 1, que rodou antes desta e não pode deixar o build quebrado.
- Produces: componente default `SeletorPeriodo({ aberto, onFechar, valor, onSelecionar })` — **contrato novo**, usado por `ListaVendas.jsx` (Task 3):
  - `aberto` (boolean): controla a visibilidade do popup. O componente nunca desmonta por conta disso — só alterna entre mostrar o modal e não mostrar nada.
  - `onFechar` (function): chamado ao fechar explicitamente (botão X), sem selecionar nada.
  - `valor`, `onSelecionar`: mesmo contrato de antes (`onSelecionar(granularidade, novoValor)`).

- [ ] **Step 1: Substituir o conteúdo do arquivo**

Sobrescrever `src/components/SeletorPeriodo.jsx` com:

```jsx
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { diasDoMes, nomeDoMes } from '../utils/calendario.js'

const ABAS = [
  { id: 'dia', label: 'Dia' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
]

const CINCO_MINUTOS_MS = 5 * 60 * 1000

function pad2(n) {
  return String(n).padStart(2, '0')
}

export default function SeletorPeriodo({ aberto, onFechar, valor, onSelecionar }) {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1
  const diaAtual = hoje.getDate()

  const [aba, setAba] = useState('dia')
  const [anoVistaDia, setAnoVistaDia] = useState(anoAtual)
  const [mesVistaDia, setMesVistaDia] = useState(mesAtual)
  const [anoVistaMes, setAnoVistaMes] = useState(anoAtual)
  const [paginaAnoInicio, setPaginaAnoInicio] = useState(anoAtual)

  const ultimoFechamentoRef = useRef(null)
  const abertoAnteriorRef = useRef(aberto)

  useEffect(() => {
    const estavaAberto = abertoAnteriorRef.current
    if (estavaAberto && !aberto) {
      ultimoFechamentoRef.current = Date.now()
    }
    if (!estavaAberto && aberto) {
      const ultimo = ultimoFechamentoRef.current
      if (ultimo === null || Date.now() - ultimo >= CINCO_MINUTOS_MS) {
        setAba('dia')
        setAnoVistaDia(anoAtual)
        setMesVistaDia(mesAtual)
        setAnoVistaMes(anoAtual)
        setPaginaAnoInicio(anoAtual)
      }
    }
    abertoAnteriorRef.current = aberto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

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
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-surface rounded-2xl shadow-sm p-4 max-w-md w-full space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">Escolher período</h3>
              <button onClick={onFechar} className="text-ink-muted hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 bg-surface-2 p-1 rounded-xl">
              {ABAS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAba(id)}
                  className={`relative flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    aba === id ? 'text-white' : 'text-ink-muted'
                  }`}
                >
                  {aba === id && (
                    <motion.div
                      layoutId="pilula-aba-periodo"
                      className="absolute inset-0 bg-primary rounded-lg shadow-sm"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  <span className="relative">{label}</span>
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
                <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-ink-muted mb-1.5">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <motion.div
                  key={`${anoVistaDia}-${mesVistaDia}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-7 gap-1.5"
                >
                  {diasDoMes(anoVistaDia, mesVistaDia).map((dia, i) => {
                    if (dia === null) return <span key={`vazio-${i}`} />
                    const valorDia = `${anoVistaDia}-${pad2(mesVistaDia)}-${pad2(dia)}`
                    const selecionado = valor === valorDia
                    const ehHoje = anoVistaDia === anoAtual && mesVistaDia === mesAtual && dia === diaAtual
                    return (
                      <button
                        key={valorDia}
                        type="button"
                        onClick={() => selecionarDia(dia)}
                        className={`aspect-square rounded-full text-sm font-medium transition-colors ${
                          selecionado
                            ? 'bg-primary text-white'
                            : ehHoje
                            ? 'ring-2 ring-primary text-primary font-semibold'
                            : 'text-ink active:bg-surface-2'
                        }`}
                      >
                        {dia}
                      </button>
                    )
                  })}
                </motion.div>
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
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                    const valorMes = `${anoVistaMes}-${pad2(mes)}`
                    const selecionado = valor === valorMes
                    return (
                      <button
                        key={valorMes}
                        type="button"
                        onClick={() => selecionarMes(mes)}
                        className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          selecionado ? 'bg-primary text-white' : 'text-ink active:bg-surface-2'
                        }`}
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
                  <button
                    type="button"
                    onClick={() => setPaginaAnoInicio(p => Math.max(anoAtual, p - 10))}
                    disabled={paginaAnoInicio <= anoAtual}
                    className="p-2 text-ink-muted disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="font-semibold text-ink text-sm">{paginaAnoInicio}–{paginaAnoInicio + 9}</span>
                  <button type="button" onClick={() => setPaginaAnoInicio(p => p + 10)} className="p-2 text-ink-muted">
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 10 }, (_, i) => paginaAnoInicio + i).map(ano => {
                    const valorAno = String(ano)
                    const selecionado = valor === valorAno
                    return (
                      <button
                        key={ano}
                        type="button"
                        onClick={() => selecionarAno(ano)}
                        className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          selecionado ? 'bg-primary text-white' : 'text-ink active:bg-surface-2'
                        }`}
                      >
                        {ano}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Notas de implementação:**
- Todos os `useState`/`useRef` ficam no topo da função, **fora** do bloco condicional `{aberto && (...)}` — é isso que garante que a navegação (aba, mês/ano visualizados) sobrevive entre uma abertura e outra do popup, mesmo com o conteúdo visual entrando/saindo via `AnimatePresence`.
- O `useEffect` roda toda vez que a prop `aberto` muda: se estava aberto e virou fechado, grava o timestamp; se estava fechado e virou aberto, decide se reseta a navegação com base em quanto tempo passou.
- A pílula deslizante usa `layoutId` do `framer-motion` — só a aba ativa renderiza o `motion.div` da pílula; ao trocar de aba, o `framer-motion` anima a transição de posição automaticamente porque o `layoutId` é o mesmo.
- A aba Ano não usa mais `decadaDoAno` — a página inicial é sempre o ano atual, e a seta "anterior" fica desabilitada (`disabled`, com opacidade reduzida) quando já está na primeira página.

- [ ] **Step 2: Remover `decadaDoAno` (agora órfã) e seus testes**

Editar `src/utils/calendario.test.js` — remover o bloco inteiro:

```js
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

E trocar a linha de import de volta pra sem `decadaDoAno`:

```js
import { diasDoMes, nomeDoMes, rotuloPeriodo } from './calendario.js'
```

Editar `src/utils/calendario.js` — remover a função:

```js
export function decadaDoAno(ano) {
  return Math.floor(ano / 10) * 10
}
```

- [ ] **Step 3: Verificar o build**

Run: `npm run build`
Expected: `✓ built` sem erros (confirma que nada mais importa `decadaDoAno`).

- [ ] **Step 4: Rodar a suíte de testes (garantir zero regressão)**

Run: `npm test`
Expected: PASS — 73 testes (77 depois da Task 1, -4 de `decadaDoAno` removida agora).

- [ ] **Step 5: Commit**

```bash
git add src/components/SeletorPeriodo.jsx src/utils/calendario.js src/utils/calendario.test.js
git commit -m "feat(vendas): turn SeletorPeriodo into a popup with 5-minute navigation memory and visual polish

Also removes decadaDoAno, now orphaned since the Ano tab starts from
the current year instead of a fixed decade."
```

---

## Task 3: Integrar o popup em `ListaVendas.jsx`

**Files:**
- Modify: `src/components/ListaVendas.jsx` (conteúdo completo abaixo)

**Interfaces:**
- Consumes: `SeletorPeriodo({ aberto, onFechar, valor, onSelecionar })` (Task 2, novo contrato). `rotuloPeriodo(granularidade, valor)` de `src/utils/calendario.js` (Task 1).
- Produces: nenhuma interface nova — último arquivo da feature.

- [ ] **Step 1: Substituir o conteúdo do arquivo**

Sobrescrever `src/components/ListaVendas.jsx` com:

```jsx
import { useState, useMemo } from 'react'
import { Search, ChevronRight, ShoppingBag, Filter, Calendar as CalendarIcon } from 'lucide-react'
import { formatarMoeda, formatarData } from '../utils/formatadores.js'
import { statusVenda } from '../utils/statusVenda.js'
import { vendaNoPeriodo } from '../utils/filtroVendas.js'
import { rotuloPeriodo } from '../utils/calendario.js'
import SeletorPeriodo from './SeletorPeriodo.jsx'

export default function ListaVendas({ vendas, clientes, navegar }) {
  const [modo, setModo] = useState('cliente')
  const [busca, setBusca] = useState('')
  const [granularidadePeriodo, setGranularidadePeriodo] = useState('dia')
  const [menuAberto, setMenuAberto] = useState(false)
  const [calendarioAberto, setCalendarioAberto] = useState(false)

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
  const rotuloAtual = modo === 'periodo' ? rotuloPeriodo(granularidadePeriodo, busca) : ''

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
            <button
              type="button"
              onClick={() => setCalendarioAberto(true)}
              className="w-full flex items-center gap-2 h-11 px-4 border border-border rounded-2xl text-sm bg-surface shadow-sm text-left"
            >
              <CalendarIcon size={16} className="text-ink-muted flex-shrink-0" />
              <span className={rotuloAtual ? 'text-ink font-medium' : 'text-ink-muted'}>
                {rotuloAtual || 'Escolher período'}
              </span>
            </button>
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
          aberto={calendarioAberto}
          onFechar={() => setCalendarioAberto(false)}
          valor={busca}
          onSelecionar={(novaGranularidade, novoValor) => {
            setGranularidadePeriodo(novaGranularidade)
            setBusca(novoValor)
            setCalendarioAberto(false)
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

**Nota de implementação:** `SeletorPeriodo` agora é sempre renderizado quando `modo === 'periodo'` (não só quando `calendarioAberto` é `true`) — é o próprio `SeletorPeriodo` quem decide, internamente via a prop `aberto`, se mostra o popup ou nada. Isso é o que permite a memória de navegação de 5 minutos funcionar (Task 2).

- [ ] **Step 2: Verificar o build**

Run: `npm run build`
Expected: `✓ built` sem erros.

- [ ] **Step 3: Rodar a suíte de testes (garantir zero regressão)**

Run: `npm test`
Expected: PASS — mesma contagem das tasks anteriores (73 testes).

- [ ] **Step 4: Commit**

```bash
git add src/components/ListaVendas.jsx
git commit -m "feat(vendas): open the period calendar as a popup triggered by a clickable field"
```

---

## Verificação manual (após todas as tasks, pelo humano)

Sem display/browser nos subagentes, então confirmar visualmente:
- Tocar no campo "Escolher período" abre o popup com fundo escurecido, entrando com fade + zoom leve.
- Selecionar um dia/mês/ano fecha o popup e mostra o rótulo formatado no campo (ex: "15/07/2026").
- Pílula verde desliza suavemente ao trocar entre as abas Dia/Mês/Ano.
- Dias aparecem como círculos; o dia de hoje tem um contorno verde quando não está selecionado.
- Aba Ano: seta "anterior" desabilitada no ano atual; não dá pra navegar pra anos passados.
- Fechar o popup e reabrir rapidamente (poucos segundos) — deve manter a aba e o mês/ano/página exibidos.
- Fechar o popup, esperar 5+ minutos (ou simular no DevTools), reabrir — deve voltar pro padrão (aba Dia, mês atual).
- Confirmar que o filtro já aplicado nunca muda sozinho por causa do timer — só a navegação visual do calendário reseta.

## Maintenance note

O timer de 5 minutos usa `Date.now()` capturado em `useRef`, sem `setTimeout`/`setInterval` — a checagem só acontece no momento em que o popup é reaberto (não há um relógio rodando em segundo plano). Isso é intencional (mais simples, sem custo de performance), mas significa que não há como "avisar" o usuário que o tempo está passando — o que está de acordo com o requisito de ser invisível.

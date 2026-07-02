# Filtro na Lista de Vendas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um ícone de filtro na aba Vendas que permite buscar por Cliente (já existe), Produto, ou Período (dia/mês/ano).

**Architecture:** Uma função pura `vendaNoPeriodo` (nova) decide se uma venda cai num período, reaproveitando a mesma conversão de data local já usada em `vendaAvista.js`. `ListaVendas.jsx` ganha um estado de `modo` que troca o tipo do campo de busca e a lógica de filtragem.

**Tech Stack:** React 18, Vite, Tailwind, Vitest, `lucide-react` (ícones). Sem dependências novas.

## Global Constraints

- Busca por Cliente mantém o comportamento atual exatamente como está (regressão zero).
- Período usa o campo `criadaEm` já exibido na lista, com conversão de data local consistente com `vendaAvista.js` (mesmo padrão que corrigiu um bug de fuso horário em feature anterior — não reintroduzir).
- Um modo de busca ativo por vez — sem combinação de filtros nesta rodada.
- Sem persistência entre sessões — sempre abre em modo Cliente.
- Sem mudanças de banco de dados.

---

## File Structure

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/utils/vendaAvista.js` (modificar) | Exportar a função `dataLocal` que já existe internamente (hoje privada), para reuso em `filtroVendas.js`. Nenhuma outra mudança nesse arquivo. |
| `src/utils/filtroVendas.js` (novo) | Função pura `vendaNoPeriodo(venda, granularidade, valor) → boolean`. |
| `src/utils/filtroVendas.test.js` (novo) | Testes: dia, mês, ano, fora do período, valor vazio, e um caso de fronteira de fuso horário. |
| `src/components/ListaVendas.jsx` (modificar) | Ícone de filtro + menu de modos (Cliente/Produto/Período→Dia/Mês/Ano); campo de busca troca de tipo conforme o modo; filtragem por produto e por período. |

---

## Task 1: `vendaNoPeriodo` + exportar `dataLocal`

**Files:**
- Modify: `src/utils/vendaAvista.js` (adicionar `export` a uma função já existente — ver Step 1)
- Create: `src/utils/filtroVendas.js`
- Test: `src/utils/filtroVendas.test.js`

**Interfaces:**
- Consumes: `dataLocal(isoString) → string` ('YYYY-MM-DD'), hoje definida sem `export` em `src/utils/vendaAvista.js` na linha 11-17:
  ```js
  function dataLocal(isoString) {
    const d = new Date(isoString)
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }
  ```
- Produces: `vendaNoPeriodo(venda, granularidade, valor) → boolean`, onde `granularidade` ∈ `'dia' | 'mes' | 'ano'` e `valor` é a string do `<input>` correspondente (`'YYYY-MM-DD'` para dia, `'YYYY-MM'` para mês, `'YYYY'` para ano). Task 2 consome esta função.

- [ ] **Step 1: Exportar `dataLocal` em `vendaAvista.js`**

Em `src/utils/vendaAvista.js`, trocar a linha 11 de:

```js
function dataLocal(isoString) {
```

para:

```js
export function dataLocal(isoString) {
```

Nenhuma outra linha desse arquivo muda.

- [ ] **Step 2: Rodar a suíte pra confirmar que a mudança não quebra nada**

Run: `npm test -- vendaAvista`
Expected: PASS — os testes existentes de `vendaAvista.test.js` continuam passando (exportar uma função não muda seu comportamento).

- [ ] **Step 3: Escrever os testes que falham**

Criar `src/utils/filtroVendas.test.js`:

```js
process.env.TZ = 'America/Sao_Paulo'

import { describe, it, expect } from 'vitest'
import { vendaNoPeriodo } from './filtroVendas.js'

describe('vendaNoPeriodo', () => {
  it('dia: bate quando a data local exata coincide', () => {
    const venda = { criadaEm: '2026-07-15T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'dia', '2026-07-15')).toBe(true)
  })

  it('dia: nao bate em outro dia', () => {
    const venda = { criadaEm: '2026-07-15T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'dia', '2026-07-16')).toBe(false)
  })

  it('dia: usa data LOCAL, nao UTC (fronteira de fuso horario)', () => {
    // 2026-07-16T01:00:00Z em America/Sao_Paulo (UTC-3) é 2026-07-15 22:00 local.
    // Se a implementação usasse UTC em vez de local, esse teste falharia.
    const venda = { criadaEm: '2026-07-16T01:00:00Z' }
    expect(vendaNoPeriodo(venda, 'dia', '2026-07-15')).toBe(true)
    expect(vendaNoPeriodo(venda, 'dia', '2026-07-16')).toBe(false)
  })

  it('mes: bate em qualquer dia do mesmo mes', () => {
    const venda = { criadaEm: '2026-07-01T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'mes', '2026-07')).toBe(true)
  })

  it('mes: nao bate em outro mes', () => {
    const venda = { criadaEm: '2026-07-31T23:59:00Z' }
    expect(vendaNoPeriodo(venda, 'mes', '2026-08')).toBe(false)
  })

  it('ano: bate em qualquer mes do mesmo ano', () => {
    const venda = { criadaEm: '2026-01-05T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'ano', '2026')).toBe(true)
  })

  it('ano: nao bate em outro ano', () => {
    const venda = { criadaEm: '2026-12-31T23:59:00Z' }
    expect(vendaNoPeriodo(venda, 'ano', '2027')).toBe(false)
  })

  it('valor vazio retorna true (sem filtro aplicado ainda)', () => {
    const venda = { criadaEm: '2026-07-15T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'dia', '')).toBe(true)
    expect(vendaNoPeriodo(venda, 'mes', '')).toBe(true)
    expect(vendaNoPeriodo(venda, 'ano', '')).toBe(true)
  })
})
```

- [ ] **Step 4: Rodar os testes e ver que falham**

Run: `npm test -- filtroVendas`
Expected: FAIL — "Failed to resolve import './filtroVendas.js'" ou "vendaNoPeriodo is not a function".

- [ ] **Step 5: Implementar a função mínima**

Criar `src/utils/filtroVendas.js`:

```js
import { dataLocal } from './vendaAvista.js'

export function vendaNoPeriodo(venda, granularidade, valor) {
  if (!valor) return true
  if (!venda?.criadaEm) return false
  const dataVenda = dataLocal(venda.criadaEm)
  if (granularidade === 'dia') return dataVenda === valor
  if (granularidade === 'mes') return dataVenda.slice(0, 7) === valor
  if (granularidade === 'ano') return dataVenda.slice(0, 4) === valor
  return true
}
```

- [ ] **Step 6: Rodar os testes e ver que passam**

Run: `npm test -- filtroVendas`
Expected: PASS — 8 testes passando.

- [ ] **Step 7: Rodar a suíte completa (garantir zero regressão)**

Run: `npm test`
Expected: PASS — todos os testes anteriores (incluindo `vendaAvista.test.js`) + os 8 novos.

- [ ] **Step 8: Commit**

```bash
git add src/utils/vendaAvista.js src/utils/filtroVendas.js src/utils/filtroVendas.test.js
git commit -m "feat(vendas): add vendaNoPeriodo pure function for period filtering"
```

---

## Task 2: Ícone de filtro e modos em `ListaVendas.jsx`

**Files:**
- Modify: `src/components/ListaVendas.jsx` (conteúdo completo abaixo — reescrever o arquivo inteiro)

**Interfaces:**
- Consumes: `vendaNoPeriodo(venda, granularidade, valor) → boolean` de `src/utils/filtroVendas.js` (Task 1). `statusVenda`, `formatarMoeda`, `formatarData` continuam sendo usados exatamente como já estão neste arquivo.
- Produces: nenhuma interface nova para outras tasks — este é o último arquivo da feature.

**Contexto:** o arquivo atual (antes desta task) tem um único `useState('busca')` e filtra só por nome do cliente. Esta task substitui isso por um estado de `modo` (`'cliente' | 'produto' | 'dia' | 'mes' | 'ano'`, default `'cliente'`), um menu de escolha de modo, e um campo de busca que muda de tipo (`text` para cliente/produto, `date`/`month`/`number` para dia/mês/ano).

- [ ] **Step 1: Substituir o conteúdo do arquivo**

Sobrescrever `src/components/ListaVendas.jsx` com:

```jsx
import { useState, useMemo } from 'react'
import { Search, ChevronRight, ShoppingBag, Filter } from 'lucide-react'
import { formatarMoeda, formatarData } from '../utils/formatadores.js'
import { statusVenda } from '../utils/statusVenda.js'
import { vendaNoPeriodo } from '../utils/filtroVendas.js'

export default function ListaVendas({ vendas, clientes, navegar }) {
  const [modo, setModo] = useState('cliente')
  const [busca, setBusca] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  const [submenuPeriodo, setSubmenuPeriodo] = useState(false)

  function escolherModo(novoModo) {
    setModo(novoModo)
    setBusca('')
    setMenuAberto(false)
    setSubmenuPeriodo(false)
  }

  const lista = useMemo(() => {
    return vendas
      .map(venda => ({ venda, cliente: clientes.find(c => c.id === venda.clienteId) }))
      .filter(({ venda, cliente }) => {
        if (modo === 'cliente') return (cliente?.nome || '').toLowerCase().includes(busca.toLowerCase())
        if (modo === 'produto') return (venda.itens || '').toLowerCase().includes(busca.toLowerCase())
        return vendaNoPeriodo(venda, modo, busca)
      })
      .sort((a, b) => new Date(b.venda.criadaEm) - new Date(a.venda.criadaEm))
  }, [vendas, clientes, busca, modo])

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
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          {(modo === 'cliente' || modo === 'produto') && (
            <input
              type="text"
              placeholder={placeholderTexto}
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
            />
          )}
          {modo === 'dia' && (
            <input
              type="date"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
            />
          )}
          {modo === 'mes' && (
            <input
              type="month"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
            />
          )}
          {modo === 'ano' && (
            <input
              type="number"
              placeholder="Ano (ex: 2026)"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm tabular-nums"
            />
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
              {!submenuPeriodo ? (
                <>
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
                    onClick={() => setSubmenuPeriodo(true)}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
                  >
                    Período
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => escolherModo('dia')}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
                  >
                    Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => escolherModo('mes')}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
                  >
                    Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => escolherModo('ano')}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
                  >
                    Ano
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

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

**Nota de implementação:** o ícone `Search` fica sobreposto ao campo mesmo quando o tipo muda pra `date`/`month`/`number` — isso é intencional (visual consistente), e por isso ganhou `pointer-events-none` (pra não atrapalhar clique no campo por baixo).

- [ ] **Step 2: Verificar o build (sem erro de sintaxe/import)**

Run: `npm run build`
Expected: `✓ built` sem erros.

- [ ] **Step 3: Rodar a suíte de testes (garantir zero regressão)**

Run: `npm test`
Expected: PASS — mesma contagem da Task 1 (nenhum teste novo aqui — `ListaVendas.jsx` não tem teste automatizado, seguindo a convenção do projeto de não testar `.jsx` de página/componente).

- [ ] **Step 4: Commit**

```bash
git add src/components/ListaVendas.jsx
git commit -m "feat(vendas): add filter icon with Cliente/Produto/Período modes to ListaVendas"
```

---

## Verificação manual (após as duas tasks, pelo humano)

Sem display/browser nos subagentes, então confirmar visualmente:
- Ícone de filtro abre o menu com Cliente / Produto / Período.
- Escolher Período abre o submenu Dia / Mês / Ano.
- Escolher qualquer modo diferente de Cliente deixa o ícone destacado (fundo verde).
- Campo de busca muda de tipo corretamente em cada modo (texto → data → mês → número).
- Buscar por Produto encontra vendas pela descrição dos itens.
- Filtrar por Dia/Mês/Ano mostra só as vendas esperadas (testar com vendas de datas conhecidas).
- Trocar de modo limpa o valor de busca anterior.
- Voltar pra Cliente no menu reseta ao comportamento padrão.

## Maintenance note

O menu do filtro fecha só ao escolher uma opção — não fecha ao clicar fora dele. Se isso incomodar no uso real, adicionar um listener de clique-fora é uma melhoria pequena e isolada pra uma rodada futura.

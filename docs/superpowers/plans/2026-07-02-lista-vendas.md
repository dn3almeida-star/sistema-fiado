# Lista de Vendas na Aba Nova Venda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma lista de todas as vendas já feitas na aba central (botão +), via um toggle `[Nova Venda] [Vendas]`, mantendo a criação de venda tão rápida quanto hoje.

**Architecture:** Um wrapper `VendasTab.jsx` assume o lugar de `NovaVenda` na aba central e alterna, por um toggle, entre o fluxo de criar (`NovaVenda.jsx`, reaproveitado sem alteração) e uma lista nova (`ListaVendas.jsx`). O badge de situação de cada venda vem de uma função pura testável `statusVenda`.

**Tech Stack:** React 18, Vite, Tailwind, Vitest. Sem dependências novas.

## Global Constraints

- O fluxo de criar venda (`NovaVenda.jsx`) não pode mudar de comportamento — é reaproveitado exatamente como está (nenhuma edição no arquivo).
- A aba central sempre abre em "Nova Venda"; criação a partir do perfil do cliente (`clientePreSelecionado` definido) força o lado de criar e esconde o toggle.
- Reaproveitar `ehVendaAvista` (`src/utils/vendaAvista.js`), `formatarMoeda`/`formatarData` (`src/utils/formatadores.js`) e os estilos de badge já usados em `PerfilCliente.jsx` — não duplicar lógica nem inventar cores novas.
- Toggle no mesmo padrão visual do toggle Fiado/À Vista de `NovaVenda.jsx`: wrapper `flex gap-2 bg-surface-2 p-1 rounded-2xl`, botão ativo `bg-primary text-white shadow-sm`, inativo `text-ink-muted`.
- Sem mudanças de banco de dados.

---

## File Structure

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/utils/statusVenda.js` (novo) | Função pura `statusVenda(venda) → { label, classe }` — deriva situação (À Vista / Quitada / Em aberto). |
| `src/utils/statusVenda.test.js` (novo) | Testes unitários das 3 situações + venda sem parcelas. |
| `src/components/ListaVendas.jsx` (novo) | Lista de vendas com busca por cliente, badge e navegação pro perfil. |
| `src/components/VendasTab.jsx` (novo) | Wrapper com toggle Nova Venda / Vendas. |
| `src/App.jsx` (modificar) | Renderizar `VendasTab` no lugar de `NovaVenda` para `paginaAtiva === 'nova-venda'`. |

---

## Task 1: Função pura `statusVenda`

**Files:**
- Create: `src/utils/statusVenda.js`
- Test: `src/utils/statusVenda.test.js`

**Interfaces:**
- Consumes: `ehVendaAvista(venda)` de `src/utils/vendaAvista.js` (já existe; retorna `boolean`).
- Produces: `statusVenda(venda)` retornando `{ label: string, classe: string }`, onde `label` ∈ `'À Vista' | 'Quitada' | 'Em aberto'` e `classe` são classes Tailwind de cor do badge.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/utils/statusVenda.test.js`:

```js
process.env.TZ = 'America/Sao_Paulo'

import { describe, it, expect } from 'vitest'
import { statusVenda } from './statusVenda.js'

describe('statusVenda', () => {
  it('À Vista: venda à vista (1 parcela paga, sem entrada, vencimento = data de criação)', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [{ numero: 1, valor: 300, vencimento: '2026-07-01', pago: true, pagoEm: '2026-07-01T10:05:00Z' }],
    }
    const r = statusVenda(venda)
    expect(r.label).toBe('À Vista')
    expect(r.classe).toContain('blue')
  })

  it('Quitada: não é à vista e todas as parcelas estão pagas', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 100, vencimento: '2026-07-01', pago: true },
        { numero: 2, valor: 100, vencimento: '2026-08-01', pago: true },
      ],
    }
    const r = statusVenda(venda)
    expect(r.label).toBe('Quitada')
    expect(r.classe).toContain('green')
  })

  it('Em aberto: tem ao menos uma parcela não paga', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 100, vencimento: '2026-07-01', pago: true },
        { numero: 2, valor: 100, vencimento: '2026-08-01', pago: false },
      ],
    }
    const r = statusVenda(venda)
    expect(r.label).toBe('Em aberto')
    expect(r.classe).toContain('red')
  })

  it('Defensivo: venda com parcelas vazias não quebra (retorna Em aberto)', () => {
    const r = statusVenda({ entrada: 0, parcelas: [] })
    expect(r.label).toBe('Em aberto')
  })

  it('Defensivo: venda sem campo parcelas não quebra', () => {
    const r = statusVenda({ entrada: 0 })
    expect(r.label).toBe('Em aberto')
  })
})
```

- [ ] **Step 2: Rodar os testes e ver que falham**

Run: `npm test -- statusVenda`
Expected: FAIL — "Failed to resolve import './statusVenda.js'" ou "statusVenda is not a function".

- [ ] **Step 3: Implementar a função mínima**

Criar `src/utils/statusVenda.js`:

```js
import { ehVendaAvista } from './vendaAvista.js'

export function statusVenda(venda) {
  if (ehVendaAvista(venda)) {
    return { label: 'À Vista', classe: 'bg-blue-50 text-blue-700' }
  }
  const parcelas = Array.isArray(venda?.parcelas) ? venda.parcelas : []
  const temAberta = parcelas.some(p => !p?.pago)
  if (parcelas.length > 0 && !temAberta) {
    return { label: 'Quitada', classe: 'bg-green-50 text-green-700' }
  }
  return { label: 'Em aberto', classe: 'bg-red-50 text-red-600' }
}
```

- [ ] **Step 4: Rodar os testes e ver que passam**

Run: `npm test -- statusVenda`
Expected: PASS — 5 testes passando.

- [ ] **Step 5: Rodar a suíte completa (garantir zero regressão)**

Run: `npm test`
Expected: PASS — todos os testes anteriores + os 5 novos.

- [ ] **Step 6: Commit**

```bash
git add src/utils/statusVenda.js src/utils/statusVenda.test.js
git commit -m "feat(vendas): add statusVenda pure function for sale status badge"
```

---

## Task 2: Componente `ListaVendas`

**Files:**
- Create: `src/components/ListaVendas.jsx`

**Interfaces:**
- Consumes:
  - `statusVenda(venda) → { label, classe }` de `src/utils/statusVenda.js` (Task 1).
  - `formatarMoeda(valor) → string` e `formatarData(iso) → string` de `src/utils/formatadores.js` (já existem).
  - Props: `vendas` (array de `{ id, clienteId, itens, valorTotal, entrada, parcelas, criadaEm }`), `clientes` (array de `{ id, nome, bairro, ... }`), `navegar(pagina, params)`.
- Produces: componente default `ListaVendas` usado por `VendasTab` (Task 3).

**Contexto de dados:** cada `venda` tem `venda.clienteId`; o nome do cliente vem de `clientes.find(c => c.id === venda.clienteId)`. `venda.criadaEm` é uma string ISO. A ordenação por data desc usa `new Date(b.criadaEm) - new Date(a.criadaEm)`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/ListaVendas.jsx`:

```jsx
import { useState, useMemo } from 'react'
import { Search, ChevronRight, ShoppingBag } from 'lucide-react'
import { formatarMoeda, formatarData } from '../utils/formatadores.js'
import { statusVenda } from '../utils/statusVenda.js'

export default function ListaVendas({ vendas, clientes, navegar }) {
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return vendas
      .map(venda => ({ venda, cliente: clientes.find(c => c.id === venda.clienteId) }))
      .filter(({ cliente }) => (cliente?.nome || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.venda.criadaEm) - new Date(a.venda.criadaEm))
  }, [vendas, clientes, busca])

  if (vendas.length === 0) {
    return (
      <div className="text-center py-12 text-ink-muted">
        <ShoppingBag size={36} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">Nenhuma venda ainda</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Buscar por cliente…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
        />
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

- [ ] **Step 2: Verificar o build (sem erro de sintaxe/import)**

Run: `npm run build`
Expected: `✓ built` sem erros. (Não há teste automatizado para este componente — é de apresentação/navegação, seguindo a convenção do projeto de não testar `.jsx` de página/componente.)

- [ ] **Step 3: Rodar a suíte de testes (garantir zero regressão)**

Run: `npm test`
Expected: PASS — mesma contagem da Task 1 (nenhum teste novo, nenhum quebrado).

- [ ] **Step 4: Commit**

```bash
git add src/components/ListaVendas.jsx
git commit -m "feat(vendas): add ListaVendas component with client search and status badge"
```

---

## Task 3: Wrapper `VendasTab` + fiação no `App.jsx`

**Files:**
- Create: `src/components/VendasTab.jsx`
- Modify: `src/App.jsx` (remover o lazy-import de `NovaVenda`, adicionar lazy-import de `VendasTab`, e trocar o render em `paginaAtiva === 'nova-venda'`)

**Interfaces:**
- Consumes:
  - `NovaVenda` (default) de `src/pages/NovaVenda.jsx` — importado estaticamente dentro do `VendasTab` (props: `{ clientes, adicionarVenda, clientePreSelecionado, navegar }` já são passadas via `{...props}`).
  - `ListaVendas` (default) de `src/components/ListaVendas.jsx` (Task 2).
- Produces: componente default `VendasTab`, renderizado pelo `App.jsx` para a aba `nova-venda`.

**Decisão de layout:** o toggle fica num container leve no topo (fundo `ground`, com padding). Quando "Nova Venda" está ativo, `NovaVenda` é renderizado logo abaixo, com o próprio header verde intacto (arquivo não é tocado). Quando "Vendas" está ativo, a `ListaVendas` é renderizada num container com padding. Quando `clientePreSelecionado` está definido, o `VendasTab` renderiza `NovaVenda` direto, sem toggle.

**Nota sobre code-splitting:** hoje `App.jsx` faz `const NovaVenda = lazy(() => import('./pages/NovaVenda.jsx'))` e `NovaVenda` só é usado ali. Movendo o import estático pra dentro do `VendasTab` (que passa a ser o componente lazy da aba), o `NovaVenda` entra no chunk do `VendasTab` — o code-splitting é preservado (carrega só ao abrir a aba). O lazy-import de `NovaVenda` no `App.jsx` fica órfão e deve ser removido.

- [ ] **Step 1: Criar o wrapper `VendasTab`**

Criar `src/components/VendasTab.jsx`:

```jsx
import { useState } from 'react'
import NovaVenda from '../pages/NovaVenda.jsx'
import ListaVendas from './ListaVendas.jsx'

export default function VendasTab(props) {
  const [aba, setAba] = useState('nova')

  // Criar a partir do perfil do cliente: vai direto pro criar, sem toggle.
  if (props.clientePreSelecionado) {
    return <NovaVenda {...props} />
  }

  return (
    <div>
      <div className="p-4 pb-0">
        <div className="flex gap-2 bg-surface-2 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setAba('nova')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              aba === 'nova' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
            }`}
          >
            Nova Venda
          </button>
          <button
            type="button"
            onClick={() => setAba('lista')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              aba === 'lista' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
            }`}
          >
            Vendas
          </button>
        </div>
      </div>

      {aba === 'nova' ? (
        <NovaVenda {...props} />
      ) : (
        <div className="p-4">
          <ListaVendas vendas={props.vendas} clientes={props.clientes} navegar={props.navegar} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Trocar o import no `App.jsx`**

Em `src/App.jsx`, remover a linha (atual linha 16):

```jsx
const NovaVenda = lazy(() => import('./pages/NovaVenda.jsx'))
```

e adicionar no mesmo bloco de lazy-imports (junto das outras páginas, ex. logo após a linha do `Relatorio`):

```jsx
const VendasTab = lazy(() => import('./components/VendasTab.jsx'))
```

- [ ] **Step 3: Trocar o render da aba no `App.jsx`**

Em `src/App.jsx`, localizar (atual linha 102-104):

```jsx
                {paginaAtiva === 'nova-venda' && (
                  <NovaVenda {...props} clientePreSelecionado={vendaParaCliente} />
                )}
```

e substituir por:

```jsx
                {paginaAtiva === 'nova-venda' && (
                  <VendasTab {...props} clientePreSelecionado={vendaParaCliente} />
                )}
```

- [ ] **Step 4: Verificar o build**

Run: `npm run build`
Expected: `✓ built` sem erros. Sem warning de import não usado referente a `NovaVenda` no `App.jsx` (confirma que o lazy-import órfão foi removido).

- [ ] **Step 5: Rodar a suíte de testes (garantir zero regressão)**

Run: `npm test`
Expected: PASS — mesma contagem das tasks anteriores.

- [ ] **Step 6: Commit**

```bash
git add src/components/VendasTab.jsx src/App.jsx
git commit -m "feat(vendas): add VendasTab toggle wrapper and wire it into the nova-venda tab"
```

---

## Verificação manual (após todas as tasks, pelo humano)

Sem display/browser nos subagentes, então confirmar visualmente:
- Botão + abre a aba já em "Nova Venda" (fluxo de criar como hoje).
- Toggle alterna pra "Vendas" e mostra a lista.
- Busca filtra por nome do cliente.
- Badges corretos nas 3 situações: uma venda à vista (🔵 À Vista), uma fiado toda paga (🟢 Quitada), uma fiado com parcela em aberto (🔴 Em aberto).
- Tocar numa venda abre o perfil do cliente certo.
- Criar venda a partir do perfil de um cliente (`clientePreSelecionado`) vai direto pro criar, sem toggle.
- Trocar de aba na barra inferior e voltar pro + reseta o toggle pra "Nova Venda".

## Maintenance note

O toggle fica acima do header verde próprio do `NovaVenda`, então na aba "Nova Venda" há o toggle (fundo claro) seguido do header verde "Nova Venda". É funcional e mantém `NovaVenda` intocado (exigência do spec). Se no uso real esse empilhamento parecer redundante, o polimento visual (ex: integrar o toggle ao header verde) pode ser revisitado numa rodada futura — exigiria tornar o header do `NovaVenda` condicional, o que muda aquele arquivo.

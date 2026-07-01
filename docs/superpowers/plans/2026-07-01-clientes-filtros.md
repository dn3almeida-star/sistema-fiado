# Filtros de situação em Clientes — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar filtros por situação (Todos/Em atraso/Em dia/Quitados) com contagem, e ordenar a lista de clientes por maior devedor.

**Architecture:** Uma função pura testável (`resumoCliente`) classifica cada cliente a partir das vendas/parcelas. A tela Clientes usa um `useMemo` para calcular resumos, contagens, filtro e ordenação; uma pílula-componente (`FiltroSituacao`) renderiza os botões de filtro.

**Tech Stack:** React 18, Vite, Tailwind, Vitest (funções puras), lucide-react, framer-motion.

## Global Constraints

- **Sem mudança nos fluxos existentes** — cadastro de cliente, busca por texto e navegação continuam iguais. Só adiciona filtro/ordenação/contagem.
- **Situações (verbatim):** `quitado` = saldo em aberto 0; `atraso` = existe parcela não paga com vencimento anterior a hoje; `em_dia` = tem saldo em aberto mas nenhuma vencida. Precedência: saldo 0 → quitado; senão vencida → atraso; senão → em_dia. "Vence hoje" conta como `em_dia` (não atraso).
- **Ordenação:** sempre por maior saldo devedor primeiro (desc), dentro do filtro.
- **Busca + filtro atuam em conjunto (AND).** Filtro padrão inicial: `todos`.
- **Datas:** vencimento é string ISO `YYYY-MM-DD`; comparação de "vencida" é `p.vencimento < hojeISO` (comparação lexicográfica de strings ISO).
- **Tokens de cor semânticos** (dark-mode safe) e `whileTap` consistentes com o resto do app.
- **Testes:** só funções puras via `npm test` (Vitest). Componentes verificados com `npm run dev` + `npm run build`. Comandos rodam dentro de `sistema-fiado/`.

---

### Task 1: Função `resumoCliente` (pura, TDD)

Classifica um cliente a partir das vendas. Testável sem DOM nem Date global.

**Files:**
- Create: `src/utils/resumoCliente.js`
- Create: `src/utils/resumoCliente.test.js`

**Interfaces:**
- Produces: `resumoCliente(vendas, clienteId, hojeISO) → { saldo: number, emAtraso: boolean, situacao: 'quitado' | 'atraso' | 'em_dia' }`
  - `vendas`: array de `{ clienteId, parcelas: [{ valor, vencimento, pago }] }`
  - `hojeISO`: string `YYYY-MM-DD`

- [ ] **Step 1: Escrever o teste falhando**

Criar `src/utils/resumoCliente.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { resumoCliente } from './resumoCliente.js'

const HOJE = '2026-07-01'

describe('resumoCliente', () => {
  it('cliente sem vendas: quitado, saldo 0', () => {
    const r = resumoCliente([], 'c1', HOJE)
    expect(r).toEqual({ saldo: 0, emAtraso: false, situacao: 'quitado' })
  })

  it('todas as parcelas pagas: quitado', () => {
    const vendas = [{ clienteId: 'c1', parcelas: [
      { valor: 100, vencimento: '2026-06-01', pago: true },
      { valor: 100, vencimento: '2026-08-01', pago: true },
    ] }]
    expect(resumoCliente(vendas, 'c1', HOJE).situacao).toBe('quitado')
    expect(resumoCliente(vendas, 'c1', HOJE).saldo).toBe(0)
  })

  it('parcela futura em aberto: em_dia com saldo somado', () => {
    const vendas = [{ clienteId: 'c1', parcelas: [
      { valor: 150, vencimento: '2026-08-01', pago: false },
      { valor: 50, vencimento: '2026-09-01', pago: false },
    ] }]
    const r = resumoCliente(vendas, 'c1', HOJE)
    expect(r.saldo).toBe(200)
    expect(r.emAtraso).toBe(false)
    expect(r.situacao).toBe('em_dia')
  })

  it('parcela vencida em aberto: atraso', () => {
    const vendas = [{ clienteId: 'c1', parcelas: [
      { valor: 80, vencimento: '2026-06-15', pago: false },
      { valor: 80, vencimento: '2026-08-15', pago: false },
    ] }]
    const r = resumoCliente(vendas, 'c1', HOJE)
    expect(r.emAtraso).toBe(true)
    expect(r.situacao).toBe('atraso')
    expect(r.saldo).toBe(160)
  })

  it('vence hoje conta como em_dia, nao atraso', () => {
    const vendas = [{ clienteId: 'c1', parcelas: [
      { valor: 100, vencimento: HOJE, pago: false },
    ] }]
    expect(resumoCliente(vendas, 'c1', HOJE).situacao).toBe('em_dia')
  })

  it('ignora vendas de outros clientes', () => {
    const vendas = [
      { clienteId: 'c1', parcelas: [{ valor: 100, vencimento: '2026-06-01', pago: false }] },
      { clienteId: 'c2', parcelas: [{ valor: 999, vencimento: '2026-06-01', pago: false }] },
    ]
    expect(resumoCliente(vendas, 'c1', HOJE).saldo).toBe(100)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FALHA — `resumoCliente.js` não existe / `resumoCliente is not a function`.

- [ ] **Step 3: Implementar `resumoCliente.js`**

Criar `src/utils/resumoCliente.js`:

```js
export function resumoCliente(vendas, clienteId, hojeISO) {
  const abertas = vendas
    .filter(v => v.clienteId === clienteId)
    .flatMap(v => v.parcelas)
    .filter(p => !p.pago)

  const saldo = abertas.reduce((acc, p) => acc + p.valor, 0)
  const emAtraso = abertas.some(p => p.vencimento < hojeISO)

  let situacao
  if (saldo === 0) situacao = 'quitado'
  else if (emAtraso) situacao = 'atraso'
  else situacao = 'em_dia'

  return { saldo, emAtraso, situacao }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASSA (todos os testes de `resumoCliente` verdes + os já existentes).

- [ ] **Step 5: Commit**

```bash
git add src/utils/resumoCliente.js src/utils/resumoCliente.test.js
git commit -m "feat(clientes): add resumoCliente pure helper with tests"
```

---

### Task 2: Componente `FiltroSituacao` + integração em Clientes.jsx

Renderiza as pílulas de filtro com contagem e liga tudo na tela.

**Files:**
- Create: `src/components/FiltroSituacao.jsx`
- Modify: `src/pages/Clientes.jsx`

**Interfaces:**
- Consumes: `resumoCliente` (Task 1); `hoje` de `formatadores.js`.
- Produces: `<FiltroSituacao filtro onSelect contagens />` — `filtro` é a string ativa, `onSelect(id)` callback, `contagens` é `{ todos, atraso, em_dia, quitado }`.

- [ ] **Step 1: Criar o componente de pílulas**

Criar `src/components/FiltroSituacao.jsx`:

```jsx
import { motion } from 'framer-motion'

const OPCOES = [
  { id: 'todos',   label: 'Todos'     },
  { id: 'atraso',  label: 'Em atraso' },
  { id: 'em_dia',  label: 'Em dia'    },
  { id: 'quitado', label: 'Quitados'  },
]

export default function FiltroSituacao({ filtro, onSelect, contagens }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {OPCOES.map(o => {
        const ativo = filtro === o.id
        return (
          <motion.button
            key={o.id}
            onClick={() => onSelect(o.id)}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              ativo
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-ink-muted active:bg-surface-2'
            }`}
          >
            {o.label}
            <span className={`text-xs tabular-nums ${ativo ? 'text-white/80' : 'text-ink-muted'}`}>
              {contagens[o.id] ?? 0}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Importar dependências novas em Clientes.jsx**

Em `src/pages/Clientes.jsx`, ajustar os imports do topo (linhas 1-6) para incluir `useMemo`, `hoje`, `resumoCliente` e o novo componente:

```jsx
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, ChevronRight, Users, X } from 'lucide-react'
import { mascaraTelefone, hoje } from '../utils/formatadores.js'
import { resumoCliente } from '../utils/resumoCliente.js'
import { staggerContainer, fadeInUp } from '../utils/motion.js'
import EstadoVazio from '../components/EstadoVazio.jsx'
import FiltroSituacao from '../components/FiltroSituacao.jsx'
```

- [ ] **Step 3: Adicionar estado de filtro e substituir o cálculo da lista**

Em `src/pages/Clientes.jsx`, dentro do componente: adicionar o estado `filtro` junto aos outros `useState` (após `const [busca, setBusca] = useState('')`):

```jsx
  const [filtro, setFiltro] = useState('todos')
```

Depois, SUBSTITUIR o bloco atual (linhas ~16-23):

```jsx
  const clientesFiltrados = clientes.filter(c => {
    const q = busca.toLowerCase()
    return (
      c.nome.toLowerCase().includes(q) ||
      (c.bairro || '').toLowerCase().includes(q) ||
      (c.endereco || '').toLowerCase().includes(q)
    )
  })
```

por:

```jsx
  const { lista, contagens } = useMemo(() => {
    const hojeISO = hoje()
    const q = busca.toLowerCase()
    const comResumo = clientes.map(c => ({ cliente: c, ...resumoCliente(vendas, c.id, hojeISO) }))

    const contagens = {
      todos:   comResumo.length,
      atraso:  comResumo.filter(x => x.situacao === 'atraso').length,
      em_dia:  comResumo.filter(x => x.situacao === 'em_dia').length,
      quitado: comResumo.filter(x => x.situacao === 'quitado').length,
    }

    const lista = comResumo
      .filter(x => filtro === 'todos' || x.situacao === filtro)
      .filter(x => {
        const c = x.cliente
        return (
          c.nome.toLowerCase().includes(q) ||
          (c.bairro || '').toLowerCase().includes(q) ||
          (c.endereco || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.saldo - a.saldo)

    return { lista, contagens }
  }, [clientes, vendas, busca, filtro])
```

Nota: `debitoCliente` deixa de ser usado no render (o `saldo` já vem no item da lista). Remover a função `debitoCliente` (linhas ~41-47) se ela não for referenciada em nenhum outro ponto do arquivo (fazer uma busca por `debitoCliente` antes de remover).

- [ ] **Step 4: Renderizar as pílulas abaixo da busca**

Em `src/pages/Clientes.jsx`, logo APÓS o bloco `{/* Busca */}` (o `</div>` que fecha o input de busca, linha ~73), inserir:

```jsx
      {/* Filtros de situação */}
      <FiltroSituacao filtro={filtro} onSelect={setFiltro} contagens={contagens} />
```

- [ ] **Step 5: Atualizar a lista e o estado vazio para usar `lista`**

Em `src/pages/Clientes.jsx`, SUBSTITUIR o bloco `{/* Lista */}` inteiro (linhas ~154-204) por:

```jsx
      {/* Lista */}
      {lista.length === 0 ? (
        busca ? (
          <div className="text-center py-12 text-ink-muted">
            <Users size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhum cliente encontrado</p>
          </div>
        ) : filtro !== 'todos' ? (
          <EstadoVazio
            icone={Users}
            titulo={
              filtro === 'atraso' ? 'Nenhum cliente em atraso'
              : filtro === 'em_dia' ? 'Nenhum cliente em dia'
              : 'Nenhum cliente quitado'
            }
            descricao="Nenhum cliente nessa situação por enquanto."
          />
        ) : (
          <EstadoVazio
            icone={Users}
            titulo="Nenhum cliente ainda"
            descricao="Cadastre o primeiro cliente para começar"
            acao={{ label: 'Cadastrar primeiro cliente', onClick: () => { setMostrarForm(true); setErro('') } }}
          />
        )
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
          {lista.map(({ cliente, saldo }) => (
            <motion.div variants={fadeInUp} key={cliente.id}>
              <button
                onClick={() => navegar('perfil', { clienteId: cliente.id })}
                className="w-full bg-surface rounded-2xl shadow-sm p-4 text-left flex items-center gap-3 active:bg-surface-2 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-lg">{cliente.nome[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{cliente.nome}</p>
                  {cliente.bairro && <p className="text-sm text-ink-muted truncate">{cliente.bairro}</p>}
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  {saldo > 0 && (
                    <div className="text-right">
                      <span className="text-[11px] text-accent font-semibold">R$</span>
                      <span className="text-sm font-bold text-ink tabular-nums ml-0.5">
                        {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <ChevronRight size={16} className="text-ink-muted" />
                </div>
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
```

- [ ] **Step 6: Verificar build e testes**

Run: `npm run build`
Expected: build conclui sem erros.

Run: `npm test`
Expected: testes verdes (inclusive os de Task 1).

- [ ] **Step 7: Verificar no navegador**

Run: `npm run dev`
Expected: abaixo da busca aparecem as 4 pílulas com contagens; tocar em cada uma filtra a lista; busca + filtro funcionam juntos; lista ordenada por maior devedor; pílula ativa destacada em verde; funciona no tema claro e escuro.

- [ ] **Step 8: Commit**

```bash
git add src/components/FiltroSituacao.jsx src/pages/Clientes.jsx
git commit -m "feat(clientes): status filters with counts and debt sorting"
```

---

## Verificação final

- [ ] `npm test` — testes de `resumoCliente` passam + suíte existente intacta.
- [ ] `npm run build` — build de produção sem erros.
- [ ] `npm run dev` — pílulas com contagem correta, filtro + busca combinados, ordenação por maior devedor, dark mode ok, cadastro inalterado.

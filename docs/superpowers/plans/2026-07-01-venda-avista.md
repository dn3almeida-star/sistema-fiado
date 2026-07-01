# Venda à Vista — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar uma venda paga integralmente no ato ("à vista"), sem parcelamento, para que o vendedor tenha controle de todas as suas vendas em um único sistema.

**Architecture:** Reaproveita o modelo de dados existente (`vendas.parcelas`, array JSONB) sem migration. Uma venda à vista é uma venda comum com uma única parcela que já nasce paga (`pago: true`, `pagoEm` = agora). Um toggle "Fiado / À Vista" na tela `NovaVenda` simplifica o formulário quando ativado. Toda a lógica existente que já opera por parcela (`resumoCliente`, `Timeline`, `Relatorio`) funciona automaticamente sem mudanças.

**Tech Stack:** React 18 + Vite + Tailwind + Vitest. Reusa `hoje()`, `formatarMoeda`, `formatarData`, `haptic()` já existentes. Sem novas dependências.

## Global Constraints

- Sem migrations, sem novos endpoints — modelo de dados atual já suporta a feature.
- Fluxo "Fiado" (padrão) deve continuar 100% igual ao atual — zero regressão.
- Tokens semânticos de cor (Tailwind, dark-mode safe).
- Mobile-friendly (~360px).
- Testes: funções puras via `npm test` (Vitest). Componentes verificados com `npm run dev` + `npm run build`. Comandos rodam dentro de `sistema-fiado/`.

---

## File Structure

**Create:**
- `src/utils/vendaAvista.js` — `criarParcelaAvista(valorTotal, dataVenda)` + `ehVendaAvista(venda)`
- `src/utils/vendaAvista.test.js` — testes para os dois helpers

**Modify:**
- `src/pages/NovaVenda.jsx` — toggle Fiado/À Vista, formulário simplificado no modo à vista
- `src/pages/PerfilCliente.jsx` — badge "À Vista" no card da venda (linhas ~288-323)

---

## Task 1: Helpers puros `criarParcelaAvista` e `ehVendaAvista`

**Files:**
- Create: `src/utils/vendaAvista.js`
- Create: `src/utils/vendaAvista.test.js`

**Interfaces:**
- Produces: `criarParcelaAvista(valorTotal: number, dataVenda: string) → { numero: 1, valor: number, vencimento: string, pago: true, pagoEm: string }`
- Produces: `ehVendaAvista(venda: { entrada: number, criadaEm: string, parcelas: object[] }) → boolean`

- [ ] **Step 1: Write the failing test**

Create `src/utils/vendaAvista.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { criarParcelaAvista, ehVendaAvista } from './vendaAvista.js'

describe('criarParcelaAvista', () => {
  it('cria parcela única já paga com o valor e data informados', () => {
    const p = criarParcelaAvista(300, '2026-07-01')
    expect(p.numero).toBe(1)
    expect(p.valor).toBe(300)
    expect(p.vencimento).toBe('2026-07-01')
    expect(p.pago).toBe(true)
    expect(typeof p.pagoEm).toBe('string')
    expect(p.pagoEm.length).toBeGreaterThan(0)
  })
})

describe('ehVendaAvista', () => {
  it('true: uma parcela paga, sem entrada, vencimento igual à data de criação', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 300, vencimento: '2026-07-01', pago: true, pagoEm: '2026-07-01T10:05:00Z' }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(true)
  })

  it('false: mais de uma parcela', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 150, vencimento: '2026-07-01', pago: true, pagoEm: '2026-07-01T10:05:00Z' },
        { numero: 2, valor: 150, vencimento: '2026-08-01', pago: false, pagoEm: null }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(false)
  })

  it('false: parcela ainda não paga', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 300, vencimento: '2026-07-01', pago: false, pagoEm: null }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(false)
  })

  it('false: teve entrada', () => {
    const venda = {
      entrada: 50,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 250, vencimento: '2026-07-01', pago: true, pagoEm: '2026-07-01T10:05:00Z' }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(false)
  })

  it('false: vencimento diferente da data de criação (fiado 1x pago depois)', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 300, vencimento: '2026-08-01', pago: true, pagoEm: '2026-08-01T10:05:00Z' }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd c:/Users/Daniel-PC/Desktop/Jose\ Iran/sistema-fiado
npm test -- src/utils/vendaAvista.test.js
```

Expected: FAIL — "Failed to resolve import './vendaAvista.js'" ou "criarParcelaAvista is not a function"

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/vendaAvista.js`:

```javascript
export function criarParcelaAvista(valorTotal, dataVenda) {
  return {
    numero: 1,
    valor: valorTotal,
    vencimento: dataVenda,
    pago: true,
    pagoEm: new Date().toISOString(),
  }
}

export function ehVendaAvista(venda) {
  if (venda.parcelas.length !== 1) return false
  if (venda.entrada !== 0) return false
  const parcela = venda.parcelas[0]
  if (!parcela.pago) return false
  return parcela.vencimento === venda.criadaEm.slice(0, 10)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/utils/vendaAvista.test.js
```

Expected: PASS (6 test cases)

- [ ] **Step 5: Commit**

```bash
git add src/utils/vendaAvista.js src/utils/vendaAvista.test.js
git commit -m "feat(venda-avista): add criarParcelaAvista and ehVendaAvista pure helpers"
```

---

## Task 2: Toggle Fiado/À Vista em `NovaVenda`

**Files:**
- Modify: `src/pages/NovaVenda.jsx` (arquivo inteiro — 267 linhas, será substituído por completo)

**Interfaces:**
- Consumes: `criarParcelaAvista` (Task 1) de `../utils/vendaAvista.js`
- Consumes: `hoje()` já existente em `../utils/formatadores.js`
- Produces: nenhuma interface nova consumida por outras tasks

- [ ] **Step 1: Substituir o conteúdo de `src/pages/NovaVenda.jsx`**

Substituir o arquivo inteiro por:

```javascript
import { useState, useMemo } from 'react'
import { ArrowLeft, Search, Check } from 'lucide-react'
import { calcularParcelas } from '../utils/calcularParcelas.js'
import { criarParcelaAvista } from '../utils/vendaAvista.js'
import { formatarMoeda, formatarData, hoje } from '../utils/formatadores.js'
import { haptic } from '../utils/haptic.js'

export default function NovaVenda({ clientes, adicionarVenda, clientePreSelecionado, navegar }) {
  const [etapa, setEtapa] = useState(clientePreSelecionado ? 2 : 1)
  const [clienteId, setClienteId] = useState(clientePreSelecionado || '')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [modo, setModo] = useState('fiado') // 'fiado' | 'avista'
  const [form, setForm] = useState({
    itens: '',
    valorTotal: '',
    entrada: '',
    numeroParcelas: '1',
    dataPrimeiraParcela: hoje(),
  })
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const clienteSelecionado = clientes.find(c => c.id === clienteId)

  const clientesFiltrados = clientes.filter(c => {
    const q = buscaCliente.toLowerCase()
    return c.nome.toLowerCase().includes(q) || (c.bairro || '').toLowerCase().includes(q)
  })

  const parcelasPreview = useMemo(() => {
    if (modo !== 'fiado') return []
    const total = parseFloat(form.valorTotal) || 0
    const entrada = parseFloat(form.entrada) || 0
    const nparcelas = parseInt(form.numeroParcelas) || 1
    if (total <= 0 || !form.dataPrimeiraParcela) return []
    return calcularParcelas(total, entrada, nparcelas, form.dataPrimeiraParcela)
  }, [modo, form.valorTotal, form.entrada, form.numeroParcelas, form.dataPrimeiraParcela])

  function validar() {
    if (!clienteId)                        { setErro('Selecione um cliente');                 return false }
    if (!form.itens.trim())                { setErro('Descreva os itens da venda');           return false }
    const total = parseFloat(form.valorTotal)
    if (!total || total <= 0)              { setErro('Informe o valor total');                return false }

    if (modo === 'avista') {
      setErro('')
      return true
    }

    const entrada = parseFloat(form.entrada) || 0
    if (entrada > total)                   { setErro('Entrada não pode ser maior que o total'); return false }
    const nparcelas = parseInt(form.numeroParcelas)
    if (!nparcelas || nparcelas < 1)       { setErro('Número de parcelas inválido');          return false }
    if (!form.dataPrimeiraParcela)         { setErro('Informe a data da primeira parcela');   return false }
    setErro('')
    return true
  }

  async function salvar() {
    if (!validar()) return
    try {
      const total = parseFloat(form.valorTotal)
      const dados = modo === 'avista'
        ? {
            clienteId,
            itens: form.itens.trim(),
            valorTotal: total,
            entrada: 0,
            parcelas: [criarParcelaAvista(total, hoje())],
          }
        : {
            clienteId,
            itens: form.itens.trim(),
            valorTotal: total,
            entrada: parseFloat(form.entrada) || 0,
            parcelas: parcelasPreview,
          }
      await adicionarVenda(dados)
      haptic()
      setSucesso(true)
      setTimeout(() => navegar('perfil', { clienteId }), 1200)
    } catch {
      setErro('Erro ao salvar a venda. Verifique a conexão e tente de novo.')
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
          <Check size={32} className="text-success" />
        </div>
        <p className="text-xl font-bold text-ink">Venda registrada!</p>
        <p className="text-sm text-ink-muted text-center">Redirecionando para o perfil do cliente…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="bg-primary text-white px-4 pt-4 pb-5">
        <button
          onClick={() => navegar('dashboard')}
          className="flex items-center gap-2 text-white/70 mb-3 min-h-touch transition-colors hover:text-white"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Cancelar</span>
        </button>
        <h1 className="text-xl font-bold">Nova Venda</h1>

        {/* Progresso */}
        <div className="flex gap-2 mt-3">
          {[1, 2].map(n => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full transition-colors ${etapa >= n ? 'bg-white' : 'bg-white/25'}`}
            />
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Etapa 1: Selecionar cliente */}
        {etapa === 1 && (
          <div className="space-y-3">
            <h2 className="font-bold text-ink">Selecionar Cliente</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Buscar cliente…"
                value={buscaCliente}
                onChange={e => setBuscaCliente(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface shadow-sm"
              />
            </div>

            <div className="space-y-2">
              {clientesFiltrados.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setClienteId(c.id); setEtapa(2) }}
                  className="w-full bg-surface rounded-2xl shadow-sm p-4 text-left flex items-center gap-3 active:bg-primary-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">{c.nome[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{c.nome}</p>
                    {c.bairro && <p className="text-sm text-ink-muted">{c.bairro}</p>}
                  </div>
                </button>
              ))}
              {clientesFiltrados.length === 0 && (
                <p className="text-center text-ink-muted py-6 text-sm">Nenhum cliente encontrado</p>
              )}
            </div>
          </div>
        )}

        {/* Etapa 2: Dados da venda */}
        {etapa === 2 && (
          <div className="space-y-4">
            {/* Cliente selecionado */}
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-primary font-semibold uppercase tracking-wide">Cliente</p>
                <p className="font-bold text-ink mt-0.5">{clienteSelecionado?.nome}</p>
              </div>
              {!clientePreSelecionado && (
                <button onClick={() => setEtapa(1)} className="text-sm text-primary font-semibold underline underline-offset-2">
                  Trocar
                </button>
              )}
            </div>

            {/* Toggle Fiado / À Vista */}
            <div className="flex gap-2 bg-surface-2 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setModo('fiado')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  modo === 'fiado' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
                }`}
              >
                Fiado
              </button>
              <button
                type="button"
                onClick={() => setModo('avista')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  modo === 'avista' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
                }`}
              >
                À Vista
              </button>
            </div>

            {erro && <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl">{erro}</p>}

            {/* Formulário */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Itens / Descrição *</span>
                <textarea
                  value={form.itens}
                  onChange={e => setForm(f => ({ ...f, itens: e.target.value }))}
                  placeholder="Ex: Jogo de panelas 5 peças, conjunto de lençol…"
                  rows={3}
                  className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </label>

              {modo === 'fiado' ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Valor Total (R$) *</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={form.valorTotal}
                      onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))}
                      placeholder="0,00"
                      className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Entrada (R$)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={form.entrada}
                      onChange={e => setForm(f => ({ ...f, entrada: e.target.value }))}
                      placeholder="0,00"
                      className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
                    />
                  </label>
                </div>
              ) : (
                <label className="block">
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Valor Total (R$) *</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.valorTotal}
                    onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))}
                    placeholder="0,00"
                    className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
                  />
                </label>
              )}

              {modo === 'fiado' && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Nº de Parcelas *</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="60"
                      value={form.numeroParcelas}
                      onChange={e => setForm(f => ({ ...f, numeroParcelas: e.target.value }))}
                      className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">1ª Parcela em *</span>
                    <input
                      type="date"
                      value={form.dataPrimeiraParcela}
                      onChange={e => setForm(f => ({ ...f, dataPrimeiraParcela: e.target.value }))}
                      className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Preview de parcelas */}
            {modo === 'fiado' && parcelasPreview.length > 0 && (
              <div className="bg-surface rounded-2xl shadow-sm p-4">
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Preview das Parcelas</p>
                <div className="space-y-2">
                  {parcelasPreview.map(p => (
                    <div key={p.numero} className="flex justify-between items-center text-sm">
                      <span className="text-ink-muted font-medium">Parcela {p.numero}</span>
                      <span className="text-ink-muted">{formatarData(p.vencimento)}</span>
                      <span className="font-bold text-ink tabular-nums">{formatarMoeda(p.valor)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
                  <span className="text-ink-muted font-medium">Total parcelado</span>
                  <div>
                    <span className="text-accent text-xs font-semibold">R$ </span>
                    <span className="font-bold text-primary tabular-nums">
                      {parcelasPreview.reduce((a, p) => a + p.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={salvar}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base active:bg-primary-light transition-colors shadow-sm"
            >
              Salvar Venda
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rodar testes existentes (regressão)**

```bash
cd c:/Users/Daniel-PC/Desktop/Jose\ Iran/sistema-fiado
npm test
```

Expected: PASS (todos os testes existentes continuam passando — nenhum teste cobre `NovaVenda.jsx` diretamente, é verificação de que nada quebrou no resto do projeto)

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build sem erros

- [ ] **Step 4: Teste manual (visual)**

```bash
npm run dev
```

Verificar no navegador:
- Nova Venda → selecionar cliente → toggle "Fiado" ativo por padrão, formulário igual ao anterior
- Clicar "À Vista" → campos Entrada, Nº Parcelas, 1ª Parcela e Preview desaparecem, só resta Itens + Valor Total
- Preencher e salvar uma venda à vista → redireciona para o perfil do cliente
- No perfil, a venda aparece com saldo já quitado (é o Task 3 que adiciona o badge visual)
- Trocar de volta para "Fiado" → fluxo original de parcelamento continua funcionando normalmente

- [ ] **Step 5: Commit**

```bash
git add src/pages/NovaVenda.jsx
git commit -m "feat(venda-avista): add Fiado/À Vista toggle to NovaVenda"
```

---

## Task 3: Badge "À Vista" no card da venda em `PerfilCliente`

**Files:**
- Modify: `src/pages/PerfilCliente.jsx:1-8` (imports) e `src/pages/PerfilCliente.jsx:288-323` (card da venda)

**Interfaces:**
- Consumes: `ehVendaAvista` (Task 1) de `../utils/vendaAvista.js`

- [ ] **Step 1: Adicionar o import**

Em `src/pages/PerfilCliente.jsx`, no topo do arquivo, junto aos outros imports de utils:

```javascript
import { formatarMoeda, formatarData, statusParcela, formatarTelefone } from '../utils/formatadores.js'
import { ehVendaAvista } from '../utils/vendaAvista.js'
import { gerarCarnetPDF } from '../utils/gerarPDF.js'
```

- [ ] **Step 2: Substituir o badge de parcelas pagas por um badge condicional "À Vista"**

Localizar o trecho (dentro do `.map(venda => {...})`):

```javascript
                  const aberta = vendasAbertas[venda.id]
                  const parcelasAbertas = venda.parcelas.filter(p => !p.pago).length
                  const pagas = venda.parcelas.filter(p => p.pago).length
```

Substituir por:

```javascript
                  const aberta = vendasAbertas[venda.id]
                  const parcelasAbertas = venda.parcelas.filter(p => !p.pago).length
                  const pagas = venda.parcelas.filter(p => p.pago).length
                  const avista = ehVendaAvista(venda)
```

Localizar o trecho:

```javascript
                          <div className="flex gap-2 mt-2">
                            {parcelasAbertas > 0 && (
                              <span className="text-xs bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                                {parcelasAbertas} em aberto
                              </span>
                            )}
                            {pagas > 0 && (
                              <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                                {pagas} paga{pagas > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
```

Substituir por:

```javascript
                          <div className="flex gap-2 mt-2">
                            {avista ? (
                              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                                À Vista
                              </span>
                            ) : (
                              <>
                                {parcelasAbertas > 0 && (
                                  <span className="text-xs bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                                    {parcelasAbertas} em aberto
                                  </span>
                                )}
                                {pagas > 0 && (
                                  <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                                    {pagas} paga{pagas > 1 ? 's' : ''}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
```

- [ ] **Step 3: Rodar testes**

```bash
cd c:/Users/Daniel-PC/Desktop/Jose\ Iran/sistema-fiado
npm test
```

Expected: PASS (todos os testes continuam passando)

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: build sem erros

- [ ] **Step 5: Teste manual (visual)**

```bash
npm run dev
```

Verificar no navegador:
- Perfil de um cliente com venda à vista registrada (Task 2) → card mostra badge azul "À Vista" no lugar de "X paga(s)"
- Perfil de um cliente com venda fiado normal (parcelada, com parcelas em aberto e/ou pagas) → badges "X em aberto" / "X paga(s)" continuam aparecendo normalmente, sem regressão

- [ ] **Step 6: Commit**

```bash
git add src/pages/PerfilCliente.jsx
git commit -m "feat(venda-avista): show badge for à vista sales in client profile"
```

---

## Summary of Changes

| File | Type | Purpose |
|------|------|---------|
| `src/utils/vendaAvista.js` | Create | `criarParcelaAvista` + `ehVendaAvista` |
| `src/utils/vendaAvista.test.js` | Create | Testes unitários (6 casos) |
| `src/pages/NovaVenda.jsx` | Modify | Toggle Fiado/À Vista, formulário simplificado |
| `src/pages/PerfilCliente.jsx` | Modify | Badge "À Vista" no card da venda |

**Total:** 2 arquivos criados, 2 arquivos modificados.

---

## Testing Checklist

Após completar todas as tasks:

- [ ] `npm test` — todos os testes passam (35 existentes + 6 novos de vendaAvista)
- [ ] `npm run build` — sem erros
- [ ] Nova Venda: toggle Fiado/À Vista alterna o formulário corretamente
- [ ] Nova Venda: modo Fiado continua idêntico ao comportamento anterior (zero regressão)
- [ ] Nova Venda: venda à vista salva com sucesso e redireciona ao perfil
- [ ] PerfilCliente: venda à vista mostra badge "À Vista"
- [ ] PerfilCliente: vendas fiado continuam mostrando badges de parcelas em aberto/pagas normalmente
- [ ] Relatório: venda à vista conta em "Recebido no mês" e "Parcelas quitadas"
- [ ] Timeline: venda à vista aparece com eventos de Compra/Vencimento/Pagamento na mesma data
- [ ] Filtro de situação (Clientes): cliente com só vendas à vista aparece como "Quitado"
- [ ] Dark mode: cores legíveis (tokens semânticos)
- [ ] Mobile (~360px): formulário e badges funcionam sem quebra de layout

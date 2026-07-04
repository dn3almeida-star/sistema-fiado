# Valor editável ao confirmar pagamento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o lojista informe o valor realmente pago de uma parcela (diferente do combinado), redistribuindo automaticamente a diferença para a próxima parcela em aberto.

**Architecture:** Uma função pura e testável (`aplicarPagamentoParcela`) concentra toda a lógica de redistribuição. O hook `useVendas` a invoca e persiste o resultado no Supabase. Um novo modal dedicado (`ModalConfirmarPagamento`) coleta o valor editável, sem alterar o `ModalConfirmar` genérico usado em outros fluxos.

**Tech Stack:** React 18, Vite, Tailwind 3, Supabase (tabela `vendas`, coluna `parcelas` é um array JSON), Vitest.

## Global Constraints

- Retrocompatibilidade: `marcarParcelaPaga(vendaId, numeroParcela, valorPago)` — se `valorPago` for `undefined`, usa o valor atual da parcela (comportamento idêntico ao de hoje).
- Diferença de "faltou" soma na próxima parcela em aberto (por número, não posicional); "sobrou" abate, com piso em 0 (nunca fica negativa).
- Sem próxima parcela em aberto: faltou → cria parcela extra (vencimento = +1 mês da última, `valorTotal` da venda aumenta pela diferença); sobrou → apenas registra, sem crédito.
- Desfazer pagamento (`desmarcarParcelaPaga`, já existe) **não** reverte a redistribuição — limitação conhecida, não implementar reversão.
- Todos os valores monetários arredondados a 2 casas (`Math.round(n * 100) / 100`) para evitar erro de ponto flutuante.
- Spec de referência: `docs/superpowers/specs/2026-07-03-pagamento-valor-editavel-design.md`

---

### Task 1: Função pura de redistribuição (`pagamentoParcela.js`)

**Files:**
- Create: `src/utils/pagamentoParcela.js`
- Test: `src/utils/pagamentoParcela.test.js`

**Interfaces:**
- Produces: `aplicarPagamentoParcela(parcelas, numeroParcela, valorPago, agoraISO) → { parcelas: Parcela[], parcelaExtraCriada: boolean, diferenca: number }`
  - `Parcela = { numero: number, vencimento: 'YYYY-MM-DD', valor: number, pago: boolean, pagoEm: string|null }`
  - Não muta o array `parcelas` recebido.

- [ ] **Step 1: Escrever os testes (todos falhando)**

Criar `src/utils/pagamentoParcela.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { aplicarPagamentoParcela } from './pagamentoParcela.js'

const AGORA = '2026-07-03T12:00:00.000Z'

function parcelas(...vals) {
  // vals: [{numero, valor, vencimento, pago}]
  return vals.map(v => ({ pago: false, pagoEm: null, ...v }))
}

describe('aplicarPagamentoParcela', () => {
  it('valor exato: fecha a parcela, nenhuma outra muda', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
      { numero: 2, valor: 100, vencimento: '2026-08-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 100, AGORA)
    expect(r.diferenca).toBe(0)
    expect(r.parcelaExtraCriada).toBe(false)
    expect(r.parcelas.find(p => p.numero === 1)).toEqual({
      numero: 1, valor: 100, vencimento: '2026-07-01', pago: true, pagoEm: AGORA,
    })
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(100)
  })

  it('pagou menos: diferença soma na próxima em aberto', () => {
    const entrada = parcelas(
      { numero: 1, valor: 142.33, vencimento: '2026-07-01' },
      { numero: 2, valor: 142.33, vencimento: '2026-08-01' },
      { numero: 3, valor: 142.33, vencimento: '2026-09-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 100, AGORA)
    expect(r.diferenca).toBe(42.33)
    expect(r.parcelas.find(p => p.numero === 1).valor).toBe(100)
    expect(r.parcelas.find(p => p.numero === 1).pago).toBe(true)
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(184.66)
    expect(r.parcelas.find(p => p.numero === 3).valor).toBe(142.33)
    expect(r.parcelaExtraCriada).toBe(false)
  })

  it('pagou mais: excedente abate da próxima em aberto', () => {
    const entrada = parcelas(
      { numero: 1, valor: 142.33, vencimento: '2026-07-01' },
      { numero: 2, valor: 142.33, vencimento: '2026-08-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 200, AGORA)
    expect(r.diferenca).toBe(-57.67)
    expect(r.parcelas.find(p => p.numero === 1).valor).toBe(200)
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(84.66)
  })

  it('excedente maior que a próxima parcela: trava em 0, não fica negativa', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
      { numero: 2, valor: 30, vencimento: '2026-08-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 200, AGORA)
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(0)
  })

  it('faltou na última parcela: cria parcela extra (venc. +1 mês, valor = diferença)', () => {
    const entrada = parcelas(
      { numero: 1, valor: 142.33, vencimento: '2026-07-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 100, AGORA)
    expect(r.parcelaExtraCriada).toBe(true)
    expect(r.parcelas).toHaveLength(2)
    const extra = r.parcelas.find(p => p.numero === 2)
    expect(extra).toEqual({
      numero: 2, valor: 42.33, vencimento: '2026-08-01', pago: false, pagoEm: null,
    })
  })

  it('sobrou na última parcela: sem crédito, sem parcela nova', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 150, AGORA)
    expect(r.parcelaExtraCriada).toBe(false)
    expect(r.parcelas).toHaveLength(1)
    expect(r.diferenca).toBe(-50)
  })

  it('pagamento fora de ordem: escolhe a próxima por número, não posicional', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
      { numero: 2, valor: 100, vencimento: '2026-08-01', pago: true, pagoEm: '2026-07-05T00:00:00.000Z' },
      { numero: 3, valor: 100, vencimento: '2026-09-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 80, AGORA)
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(100) // já paga, não mexe
    expect(r.parcelas.find(p => p.numero === 3).valor).toBe(120) // próxima NÃO paga
  })

  it('imutabilidade: não muta o array/objetos de entrada', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
      { numero: 2, valor: 100, vencimento: '2026-08-01' },
    )
    const copia = JSON.parse(JSON.stringify(entrada))
    aplicarPagamentoParcela(entrada, 1, 80, AGORA)
    expect(entrada).toEqual(copia)
  })

  it('parcela inexistente: retorna a lista original sem mudanças', () => {
    const entrada = parcelas({ numero: 1, valor: 100, vencimento: '2026-07-01' })
    const r = aplicarPagamentoParcela(entrada, 99, 50, AGORA)
    expect(r.parcelas).toEqual(entrada)
    expect(r.parcelaExtraCriada).toBe(false)
    expect(r.diferenca).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test -- pagamentoParcela`
Expected: FAIL — `Cannot find module './pagamentoParcela.js'` (o arquivo ainda não existe).

- [ ] **Step 3: Implementar a função**

Criar `src/utils/pagamentoParcela.js`:

```js
function arredondar(n) {
  return Math.round(n * 100) / 100
}

function somarUmMes(vencimentoISO) {
  const [ano, mes, dia] = vencimentoISO.split('-').map(Number)
  return new Date(ano, mes - 1 + 1, dia).toISOString().slice(0, 10)
}

export function aplicarPagamentoParcela(parcelas, numeroParcela, valorPago, agoraISO) {
  const parcelaAlvo = parcelas.find(p => p.numero === numeroParcela)
  if (!parcelaAlvo) {
    return { parcelas: parcelas.map(p => ({ ...p })), parcelaExtraCriada: false, diferenca: 0 }
  }

  const diferenca = arredondar(parcelaAlvo.valor - valorPago)

  let novas = parcelas.map(p =>
    p.numero === numeroParcela
      ? { ...p, valor: arredondar(valorPago), pago: true, pagoEm: agoraISO }
      : { ...p }
  )

  let parcelaExtraCriada = false

  if (diferenca !== 0) {
    const proxima = novas
      .filter(p => p.numero > numeroParcela && !p.pago)
      .sort((a, b) => a.numero - b.numero)[0]

    if (proxima) {
      novas = novas.map(p =>
        p.numero === proxima.numero
          ? { ...p, valor: Math.max(0, arredondar(p.valor + diferenca)) }
          : p
      )
    } else if (diferenca > 0) {
      const maiorNumero = Math.max(...novas.map(p => p.numero))
      const maiorVencimento = novas.reduce(
        (max, p) => (p.vencimento > max ? p.vencimento : max),
        novas[0].vencimento
      )
      novas = [
        ...novas,
        {
          numero: maiorNumero + 1,
          vencimento: somarUmMes(maiorVencimento),
          valor: diferenca,
          pago: false,
          pagoEm: null,
        },
      ]
      parcelaExtraCriada = true
    }
    // diferenca < 0 e sem próxima em aberto: não faz nada (sem crédito)
  }

  return {
    parcelas: novas.sort((a, b) => a.numero - b.numero),
    parcelaExtraCriada,
    diferenca,
  }
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test -- pagamentoParcela`
Expected: PASS — 9 testes.

- [ ] **Step 5: Commit**

```bash
git add src/utils/pagamentoParcela.js src/utils/pagamentoParcela.test.js
git commit -m "feat(pagamentos): add aplicarPagamentoParcela — redistribui diferença de valor pago"
```

---

### Task 2: Integrar no `useVendas.js`

**Files:**
- Modify: `src/hooks/useVendas.js:57-66` (função `marcarParcelaPaga`)

**Interfaces:**
- Consumes: `aplicarPagamentoParcela(parcelas, numeroParcela, valorPago, agoraISO)` de `../utils/pagamentoParcela.js` (Task 1).
- Produces: `marcarParcelaPaga(vendaId, numeroParcela, valorPago?)` — `valorPago` agora opcional; mesma assinatura de chamada externa que já existe hoje quando omitido.

- [ ] **Step 1: Adicionar o import**

No topo de `src/hooks/useVendas.js`, junto aos imports existentes:

```js
import { aplicarPagamentoParcela } from '../utils/pagamentoParcela.js'
```

- [ ] **Step 2: Substituir a função `marcarParcelaPaga`**

Localizar (linhas 57-66):

```js
  async function marcarParcelaPaga(vendaId, numeroParcela) {
    const venda = vendas.find(v => v.id === vendaId)
    if (!venda) return
    const novas = venda.parcelas.map(p =>
      p.numero === numeroParcela
        ? { ...p, pago: true, pagoEm: new Date().toISOString() }
        : p
    )
    await atualizarParcelas(vendaId, novas)
  }
```

Substituir por:

```js
  async function marcarParcelaPaga(vendaId, numeroParcela, valorPago) {
    const venda = vendas.find(v => v.id === vendaId)
    if (!venda) return
    const parcelaAtual = venda.parcelas.find(p => p.numero === numeroParcela)
    if (!parcelaAtual) return

    const valorFinal = valorPago ?? parcelaAtual.valor
    const { parcelas: novas, parcelaExtraCriada, diferenca } = aplicarPagamentoParcela(
      venda.parcelas,
      numeroParcela,
      valorFinal,
      new Date().toISOString()
    )

    if (parcelaExtraCriada) {
      const novoValorTotal = Math.round((venda.valorTotal + diferenca) * 100) / 100
      const { error } = await supabase
        .from('vendas')
        .update({ parcelas: novas, valor_total: novoValorTotal })
        .eq('id', vendaId)
      if (error) throw error
      setVendas(prev =>
        prev.map(v => (v.id === vendaId ? { ...v, parcelas: novas, valorTotal: novoValorTotal } : v))
      )
    } else {
      await atualizarParcelas(vendaId, novas)
    }
  }
```

- [ ] **Step 3: Verificar (sem teste automatizado — este hook integra direto com Supabase, mesmo padrão de `adicionarVenda`/`removerVenda`, que também não têm teste unitário)**

Run: `npm run build`
Expected: build verde, sem erros de import/sintaxe.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useVendas.js
git commit -m "feat(pagamentos): useVendas.marcarParcelaPaga aceita valor pago diferente"
```

---

### Task 3: Modal dedicado com valor editável

**Files:**
- Create: `src/components/ModalConfirmarPagamento.jsx`

**Interfaces:**
- Produces: `ModalConfirmarPagamento({ aberto, parcela, onConfirmar, onCancelar })` — componente default export.
  - `parcela`: `{ numeroParcela: number, valor: number }` — **atenção:** é o mesmo objeto que já existe em `modalPago` (state de `PerfilCliente.jsx`, linha 353: `{ vendaId, numeroParcela, valor }`), por isso a chave é `numeroParcela`, não `numero`.
  - `onConfirmar(valorPago: number)` — chamado só quando o valor digitado é válido (`> 0`).

- [ ] **Step 1: Criar o componente**

```jsx
import { useState, useEffect } from 'react'
import { haptic } from '../utils/haptic.js'
import { formatarMoeda } from '../utils/formatadores.js'

export default function ModalConfirmarPagamento({ aberto, parcela, onConfirmar, onCancelar }) {
  const [valor, setValor] = useState('')

  useEffect(() => {
    if (aberto && parcela) {
      setValor(parcela.valor.toFixed(2).replace('.', ','))
    }
  }, [aberto, parcela])

  if (!aberto || !parcela) return null

  const valorNumero = parseFloat(valor.replace(',', '.'))
  const valido = !isNaN(valorNumero) && valorNumero > 0

  function confirmar() {
    if (!valido) return
    haptic()
    onConfirmar(valorNumero)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-display font-semibold text-ink mb-2">Confirmar Pagamento</h2>
        <p className="text-ink-muted mb-4 text-sm leading-relaxed">
          Parcela {parcela.numeroParcela} — valor combinado {formatarMoeda(parcela.valor)}
        </p>

        <label className="block mb-6">
          <span className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wide">
            Valor recebido (R$)
          </span>
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3 rounded-xl border-2 border-border text-ink-muted font-semibold hover:bg-surface-2 active:bg-surface-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!valido}
            className="flex-1 py-3 rounded-xl font-semibold transition-colors bg-success hover:bg-green-700 text-white disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar (sem teste automatizado — mesmo padrão de `ModalConfirmar.jsx`, que também não tem teste de componente neste projeto)**

Run: `npm run build`
Expected: build verde.

- [ ] **Step 3: Commit**

```bash
git add src/components/ModalConfirmarPagamento.jsx
git commit -m "feat(pagamentos): add ModalConfirmarPagamento com valor editável"
```

---

### Task 4: Ligar o novo modal em `PerfilCliente.jsx`

**Files:**
- Modify: `src/pages/PerfilCliente.jsx:3` (import)
- Modify: `src/pages/PerfilCliente.jsx:74-83` (`confirmarMarcarPago`)
- Modify: `src/pages/PerfilCliente.jsx:430-437` (uso do `ModalConfirmar` de pagamento → `ModalConfirmarPagamento`)

**Interfaces:**
- Consumes: `ModalConfirmarPagamento` (Task 3), `marcarParcelaPaga(vendaId, numeroParcela, valorPago)` (Task 2, já injetado via props em `PerfilCliente`).

- [ ] **Step 1: Trocar o import**

Localizar linha 3:

```js
import ModalConfirmar from '../components/ModalConfirmar.jsx'
```

Adicionar logo abaixo (o `ModalConfirmar` genérico continua sendo usado para "remover venda" e "excluir cliente" — não remover o import):

```js
import ModalConfirmarPagamento from '../components/ModalConfirmarPagamento.jsx'
```

- [ ] **Step 2: Atualizar `confirmarMarcarPago` para aceitar o valor**

Localizar (linhas 74-83):

```js
  async function confirmarMarcarPago() {
    if (!modalPago) return
    try {
      await marcarParcelaPaga(modalPago.vendaId, modalPago.numeroParcela)
      setModalPago(null)
      mostrarToast('✓ Parcela marcada como paga')
    } catch {
      mostrarToast('Erro ao atualizar a parcela.', 'error')
    }
  }
```

Substituir por:

```js
  async function confirmarMarcarPago(valorPago) {
    if (!modalPago) return
    try {
      await marcarParcelaPaga(modalPago.vendaId, modalPago.numeroParcela, valorPago)
      setModalPago(null)
      mostrarToast('✓ Parcela marcada como paga')
    } catch {
      mostrarToast('Erro ao atualizar a parcela.', 'error')
    }
  }
```

- [ ] **Step 3: Trocar o modal de pagamento**

Localizar (linhas 430-437):

```jsx
      <ModalConfirmar
        aberto={!!modalPago}
        titulo="Confirmar Pagamento"
        mensagem={modalPago ? `Marcar parcela ${modalPago.numeroParcela} de ${formatarMoeda(modalPago.valor)} como paga?` : ''}
        onConfirmar={confirmarMarcarPago}
        onCancelar={() => setModalPago(null)}
        corConfirmar="success"
      />
```

Substituir por:

```jsx
      <ModalConfirmarPagamento
        aberto={!!modalPago}
        parcela={modalPago}
        onConfirmar={confirmarMarcarPago}
        onCancelar={() => setModalPago(null)}
      />
```

(Os outros dois usos do `ModalConfirmar` nesse mesmo arquivo — remover venda e excluir cliente — permanecem inalterados.)

- [ ] **Step 4: Rodar a suíte completa e o build**

Run: `npm test`
Expected: PASS — todos os testes (incluindo os 9 novos de `pagamentoParcela`).

Run: `npm run build`
Expected: build verde.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PerfilCliente.jsx
git commit -m "feat(pagamentos): usar ModalConfirmarPagamento com valor editável no Perfil do Cliente"
```

---

## Verificação final (checklist manual, quando puder testar no app)

1. Abrir uma venda com 2+ parcelas em aberto, marcar a parcela 1 como paga com o **valor exato** → nada muda na parcela 2.
2. Repetir pagando **menos** → parcela 2 aumenta pela diferença.
3. Repetir pagando **mais** → parcela 2 diminui pela diferença (sem ficar negativa).
4. Numa venda de 1 parcela só, pagar **menos** → nasce uma parcela 2 nova, vencendo 1 mês depois, e o "Total" da venda aumenta.
5. Cancelar o modal → nada é alterado.

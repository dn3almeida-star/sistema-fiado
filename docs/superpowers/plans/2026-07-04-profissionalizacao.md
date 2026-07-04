# Profissionalização do sistema-fiado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir bugs, reforçar consistência e polir o app (datas de vencimento robustas, cores de gráfico coerentes com o tema, exclusão segura de devedor, progresso de parcela, selo de cobrado, acessibilidade de modais, remoção de código morto).

**Architecture:** Lógica nova mora em funções puras testadas (`calcularParcelas`, novo `cobrancaSelo`); mudanças de UI reusam tokens de tema e helpers já existentes. Nenhuma dependência nova.

**Tech Stack:** React 18, Vite, Tailwind 3, Framer Motion, Supabase, Vitest.

## Global Constraints

- CPF é armazenado e comparado como **dígitos puros** (sem pontuação); busca por CPF usa `(c.cpf || '').includes(qDigits)` com guarda `qDigits !== ''`.
- Cor verde de dados vem do token de tema `--brand-bright` (`#154e30` claro / `#2FB56C` escuro), via string `rgb(var(--brand-bright))`. Nunca hardcodar verde novo.
- Formato de "x/y" de parcela: `{numero}/{venda.parcelas.length}` (mesmo padrão de `timelineHelpers.js`).
- Datas são construídas como string local `YYYY-MM-DD`, nunca via `.toISOString()` (evita bug de fuso), seguindo o fix já aplicado em `pagamentoParcela.js`.
- Seguir o estilo visual e de código de cada arquivo (mesmas classes Tailwind, mesmo padrão de erro/toast).
- YAGNI: sem features novas além do escopo. Higiene de git: commitar só os arquivos listados em cada task; nunca `git add .` (há arquivos soltos não relacionados no repo).
- Vitest pode abrir em watch mode; usar `npm test -- --run` (ou `npx vitest run`) para um passe único.

---

## Task 1: Datas de vencimento robustas em `calcularParcelas` (TDD)

**Files:**
- Modify: `src/utils/calcularParcelas.js`
- Create: `src/utils/calcularParcelas.test.js`

**Interfaces:**
- Produces: `calcularParcelas(valorTotal, entrada, numParcelas, dataPrimeira) => Parcela[]` (assinatura inalterada). Corrige transbordo de dia (parcela no dia 31 em meses curtos) e troca `.toISOString()` por string de data local.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/utils/calcularParcelas.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { calcularParcelas } from './calcularParcelas.js'

describe('calcularParcelas', () => {
  it('divide igualmente quando não sobra centavo', () => {
    const p = calcularParcelas(300, 0, 3, '2026-07-01')
    expect(p.map(x => x.valor)).toEqual([100, 100, 100])
    expect(p.map(x => x.vencimento)).toEqual(['2026-07-01', '2026-08-01', '2026-09-01'])
    expect(p.map(x => x.numero)).toEqual([1, 2, 3])
    expect(p.every(x => x.pago === false && x.pagoEm === null)).toBe(true)
  })

  it('última parcela absorve o centavo de arredondamento', () => {
    const p = calcularParcelas(100, 0, 3, '2026-07-10')
    expect(p.map(x => x.valor)).toEqual([33.33, 33.33, 33.34])
  })

  it('desconta a entrada do saldo parcelado', () => {
    const p = calcularParcelas(300, 60, 2, '2026-07-05')
    expect(p.map(x => x.valor)).toEqual([120, 120])
  })

  it('dia 31 não escorrega: fixa no último dia de meses curtos', () => {
    const p = calcularParcelas(300, 0, 3, '2026-01-31')
    expect(p.map(x => x.vencimento)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('vira o ano corretamente', () => {
    const p = calcularParcelas(200, 0, 3, '2026-11-15')
    expect(p.map(x => x.vencimento)).toEqual(['2026-11-15', '2026-12-15', '2027-01-15'])
  })

  it('saldo <= 0 retorna vazio', () => {
    expect(calcularParcelas(100, 100, 3, '2026-07-01')).toEqual([])
    expect(calcularParcelas(100, 150, 3, '2026-07-01')).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- --run calcularParcelas`
Expected: FAIL — o teste do dia 31 falha (hoje escorrega para 02/03) e/ou o arquivo de teste é novo.

- [ ] **Step 3: Reescrever a implementação**

Substituir todo o conteúdo de `src/utils/calcularParcelas.js` por:

```js
/**
 * Calcula as parcelas de uma venda.
 * A última parcela absorve o centavo de arredondamento.
 */
export function calcularParcelas(valorTotal, entrada, numParcelas, dataPrimeira) {
  const saldo = valorTotal - entrada
  if (saldo <= 0 || numParcelas < 1) return []

  const valorBase = Math.floor((saldo / numParcelas) * 100) / 100
  const soma = valorBase * (numParcelas - 1)
  const ultimoValor = Math.round((saldo - soma) * 100) / 100

  const [ano, mes, dia] = dataPrimeira.split('-').map(Number)

  return Array.from({ length: numParcelas }, (_, i) => ({
    numero: i + 1,
    vencimento: dataVencimento(ano, mes - 1 + i, dia),
    valor: i === numParcelas - 1 ? ultimoValor : valorBase,
    pago: false,
    pagoEm: null,
  }))
}

// Monta 'YYYY-MM-DD' local, normalizando o mês (índice pode passar de 11) e
// fixando o dia ao último dia do mês-alvo quando o dia original não existe.
function dataVencimento(ano, mesIndex, dia) {
  const anoAlvo = ano + Math.floor(mesIndex / 12)
  const mesAlvo = ((mesIndex % 12) + 12) % 12 // 0–11
  const ultimoDia = new Date(anoAlvo, mesAlvo + 1, 0).getDate()
  const diaAlvo = Math.min(dia, ultimoDia)
  const mm = String(mesAlvo + 1).padStart(2, '0')
  const dd = String(diaAlvo).padStart(2, '0')
  return `${anoAlvo}-${mm}-${dd}`
}
```

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npm test -- --run calcularParcelas`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test -- --run`
Expected: PASS — nada regrediu.

- [ ] **Step 6: Commit**

```bash
git add src/utils/calcularParcelas.js src/utils/calcularParcelas.test.js
git commit -m "fix(vendas): vencimento não escorrega em meses curtos e usa data local"
```

---

## Task 2: Helper de selo de cobrança `cobrancaSelo` (TDD)

**Files:**
- Create: `src/utils/cobrancaSelo.js`
- Create: `src/utils/cobrancaSelo.test.js`

**Interfaces:**
- Produces: `rotuloUltimaCobranca(ultimaCobrancaEm: string|null, agoraISO: string) => string|null` — `null` se nunca cobrado; `'Cobrado hoje'` / `'Cobrado ontem'` / `'Cobrado há Nd'` conforme a diferença em dias de calendário local.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/utils/cobrancaSelo.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { rotuloUltimaCobranca } from './cobrancaSelo.js'

describe('rotuloUltimaCobranca', () => {
  const agora = '2026-07-10T15:00:00.000Z'

  it('nunca cobrado retorna null', () => {
    expect(rotuloUltimaCobranca(null, agora)).toBe(null)
    expect(rotuloUltimaCobranca(undefined, agora)).toBe(null)
  })

  it('cobrado hoje', () => {
    expect(rotuloUltimaCobranca('2026-07-10T09:00:00.000Z', agora)).toBe('Cobrado hoje')
  })

  it('cobrado ontem', () => {
    expect(rotuloUltimaCobranca('2026-07-09T09:00:00.000Z', agora)).toBe('Cobrado ontem')
  })

  it('cobrado há N dias', () => {
    expect(rotuloUltimaCobranca('2026-07-06T09:00:00.000Z', agora)).toBe('Cobrado há 4d')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- --run cobrancaSelo`
Expected: FAIL — módulo/função não existe.

- [ ] **Step 3: Implementar**

Criar `src/utils/cobrancaSelo.js`:

```js
// Rótulo curto de "quando foi a última cobrança" para o cartão de cobrança.
// Compara por dia de calendário local (ignora horas).
export function rotuloUltimaCobranca(ultimaCobrancaEm, agoraISO) {
  if (!ultimaCobrancaEm) return null
  const c = new Date(ultimaCobrancaEm)
  const a = new Date(agoraISO)
  const d1 = new Date(c.getFullYear(), c.getMonth(), c.getDate())
  const d2 = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const dias = Math.round((d2 - d1) / 86400000)
  if (dias <= 0) return 'Cobrado hoje'
  if (dias === 1) return 'Cobrado ontem'
  return `Cobrado há ${dias}d`
}
```

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npm test -- --run cobrancaSelo`
Expected: PASS.

- [ ] **Step 5: Suíte inteira**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/cobrancaSelo.js src/utils/cobrancaSelo.test.js
git commit -m "feat(cobrancas): helper de rótulo da última cobrança"
```

---

## Task 3: Cores de gráfico via token de tema

**Files:**
- Modify: `src/pages/Relatorio.jsx`
- Modify: `src/components/Donut.jsx`

**Interfaces:**
- Consumes: token CSS `--brand-bright` (já definido em `src/index.css`). `GraficoBarras`/`BarrasHorizontais`/`Donut` aplicam a cor via `style` inline/`stroke`, que aceitam string `rgb(var(--brand-bright))` (confirmado nos três componentes).

Verificação: `npm run build` + `npm test -- --run` verdes; conferência visual manual no dark mode.

- [ ] **Step 1: Trocar os verdes hardcoded no Relatório**

Em `src/pages/Relatorio.jsx`, trocar as duas ocorrências de `cor="#154e30"`:
- Linha do "Recebido por mês": `<GraficoBarras dados={metricas.recebidoPorMes} cor="#154e30" destaqueIndex={5} />` → `cor="rgb(var(--brand-bright))"`.
- Linha do "Top devedores": `<BarrasHorizontais ... cor="#154e30" />` → `cor="rgb(var(--brand-bright))"`.

Deixar o laranja da série "A receber" como está (`cor="#c97c1a"`) — é a cor `accent` da marca e lê bem em ambos os temas.

- [ ] **Step 2: Unificar o verde do Donut**

Em `src/components/Donut.jsx`, trocar as duas ocorrências de `#16a34a` (o `stroke` do círculo de progresso e o `backgroundColor` da legenda "Pago") por `rgb(var(--brand-bright))`.

- [ ] **Step 3: Build + suíte**

Run: `npm run build` (Expected: PASS) e `npm test -- --run` (Expected: PASS).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Relatorio.jsx src/components/Donut.jsx
git commit -m "fix(relatorio): cores de gráfico via token de tema (verde único, legível no dark)"
```

---

## Task 4: Remover código morto do "Pedido #N"

**Files:**
- Modify: `src/utils/mensagensCobranca.js`
- Modify: `src/utils/mensagensCobranca.test.js`

**Interfaces:**
- Produces: `gerarMensagemCobranca` sem o bloco de `venda.numero` (o `SELECT` de vendas nunca traz `numero`, então em produção nunca dispara). Assinatura inalterada.

Verificação: `npm test -- --run mensagensCobranca` verde após ajustar o teste.

- [ ] **Step 1: Remover o bloco morto**

Em `src/utils/mensagensCobranca.js`, remover as três linhas:

```js
  if (venda?.numero) {
    mensagem += ` (Pedido #${venda.numero})`
  }
```

O parâmetro `venda` continua na assinatura (mantém compatibilidade da chamada), mas não é mais usado no ramo de cobrança.

- [ ] **Step 2: Ajustar o teste**

Em `src/utils/mensagensCobranca.test.js`, remover o caso que dependia do `numero` sintético (o `it('cobranca: inclui referência do pedido quando a venda tem numero', ...)`, ~linhas 48–52). Manter o caso `'cobranca: sem venda, funciona e não menciona pedido'` (continua válido — a mensagem nunca menciona "Pedido").

- [ ] **Step 3: Rodar o teste do arquivo + suíte**

Run: `npm test -- --run mensagensCobranca` (Expected: PASS) e `npm test -- --run` (Expected: PASS).

- [ ] **Step 4: Commit**

```bash
git add src/utils/mensagensCobranca.js src/utils/mensagensCobranca.test.js
git commit -m "chore(cobrancas): remover referência de pedido nunca preenchida (código morto)"
```

---

## Task 5: Exclusão segura de cliente devedor

**Files:**
- Modify: `src/pages/PerfilCliente.jsx`

**Interfaces:**
- Consumes: `totalDevido` (já calculado em `PerfilCliente.jsx`), `formatarMoeda` (já importado), `removerCliente` (prop, async).

Verificação: `npm run build` + `npm test -- --run` verdes; manual (excluir cliente com saldo mostra o aviso).

- [ ] **Step 1: Tornar `confirmarExcluirCliente` async + try/catch**

Substituir a função (atualmente síncrona, sem tratamento de erro):

```js
  function confirmarExcluirCliente() {
    const nome = cliente.nome
    removerCliente(clienteId)
    navegar('clientes')
    mostrarToast(`${nome} foi excluído`, 'info')
  }
```

por:

```js
  async function confirmarExcluirCliente() {
    const nome = cliente.nome
    try {
      await removerCliente(clienteId)
      navegar('clientes')
      mostrarToast(`${nome} foi excluído`, 'info')
    } catch {
      mostrarToast('Erro ao excluir o cliente.', 'error')
    }
  }
```

- [ ] **Step 2: Mensagem dinâmica avisando o saldo em aberto**

No `<ModalConfirmar ... titulo="Excluir Cliente" ... />`, trocar a prop `mensagem` estática por:

```jsx
        mensagem={
          totalDevido > 0
            ? `${cliente.nome} tem ${formatarMoeda(totalDevido)} em aberto. Excluir apaga permanentemente este cliente e todo o histórico de vendas e parcelas — inclusive essa dívida.`
            : `Tem certeza que deseja excluir "${cliente.nome}"? Todo o histórico de vendas e parcelas será removido permanentemente.`
        }
```

- [ ] **Step 3: Build + suíte**

Run: `npm run build` (Expected: PASS) e `npm test -- --run` (Expected: PASS).

- [ ] **Step 4: Commit**

```bash
git add src/pages/PerfilCliente.jsx
git commit -m "fix(clientes): exclusão segura — avisa saldo em aberto e trata erro"
```

---

## Task 6: Progresso da parcela (x/y), selo de cobrado e busca por CPF na Nova Venda

**Files:**
- Modify: `src/pages/CobrancasHoje.jsx`
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/NovaVenda.jsx`

**Interfaces:**
- Consumes: `rotuloUltimaCobranca` de `src/utils/cobrancaSelo.js` (Task 2); `venda.parcelas.length`; `cliente.cpf` (dígitos).

Verificação: `npm run build` + `npm test -- --run` verdes; manual.

- [ ] **Step 1: "Parcela x/y" + selo de cobrado no cartão de Cobranças**

Em `src/pages/CobrancasHoje.jsx`:
1. Adicionar o import no topo: `import { rotuloUltimaCobranca } from '../utils/cobrancaSelo.js'`.
2. Dentro de `CartaoCobranca`, logo após `const st = statusParcela(parcela)`, adicionar:
   ```js
   const selo = rotuloUltimaCobranca(parcela.ultimaCobrancaEm, new Date().toISOString())
   ```
3. Trocar `Parcela {parcela.numero}` por `Parcela {parcela.numero}/{venda.parcelas.length}`.
4. Na linha do rótulo de status (o `<span>` com `${st.bg} ${st.texto}`), logo depois desse span, adicionar o selo:
   ```jsx
   {selo && (
     <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-medium bg-surface-2 text-ink-muted flex-shrink-0">
       {selo}
     </span>
   )}
   ```

- [ ] **Step 2: "Parcela x/y" no Dashboard**

Em `src/pages/Dashboard.jsx`, na lista "Cobranças de Hoje", trocar
`Parcela {parcela.numero} — {formatarData(parcela.vencimento)}` por
`Parcela {parcela.numero}/{venda.parcelas.length} — {formatarData(parcela.vencimento)}`.

- [ ] **Step 3: Busca por CPF na Nova Venda**

Em `src/pages/NovaVenda.jsx`, trocar o filtro de clientes:

```js
  const clientesFiltrados = clientes.filter(c => {
    const q = buscaCliente.toLowerCase()
    return c.nome.toLowerCase().includes(q) || (c.bairro || '').toLowerCase().includes(q)
  })
```

por:

```js
  const clientesFiltrados = clientes.filter(c => {
    const q = buscaCliente.toLowerCase()
    const qDigits = buscaCliente.replace(/\D/g, '')
    return (
      c.nome.toLowerCase().includes(q) ||
      (c.bairro || '').toLowerCase().includes(q) ||
      (qDigits !== '' && (c.cpf || '').includes(qDigits))
    )
  })
```

- [ ] **Step 4: Build + suíte**

Run: `npm run build` (Expected: PASS) e `npm test -- --run` (Expected: PASS).

- [ ] **Step 5: Commit**

```bash
git add src/pages/CobrancasHoje.jsx src/pages/Dashboard.jsx src/pages/NovaVenda.jsx
git commit -m "feat(cobrancas): progresso da parcela x/y, selo de cobrado e busca por CPF na venda"
```

---

## Task 7: Acessibilidade dos modais (fechar com Esc + foco)

**Files:**
- Modify: `src/components/ModalConfirmar.jsx`
- Modify: `src/components/BotaoCobranca.jsx`

**Interfaces:**
- Nenhuma nova. Apenas comportamento: tecla Esc fecha o modal; `role="dialog"`/`aria-modal`.

Verificação: `npm run build` + `npm test -- --run` verdes; manual (Esc fecha os modais).

- [ ] **Step 1: Esc + aria em `ModalConfirmar`**

Em `src/components/ModalConfirmar.jsx`:
1. Trocar o import por `import { useEffect } from 'react'` + o `haptic` já existente:
   ```js
   import { useEffect } from 'react'
   import { haptic } from '../utils/haptic.js'
   ```
2. **Antes** do `if (!aberto) return null` (hooks precisam ser incondicionais), adicionar:
   ```js
   useEffect(() => {
     if (!aberto) return
     function onKey(e) { if (e.key === 'Escape') onCancelar() }
     window.addEventListener('keydown', onKey)
     return () => window.removeEventListener('keydown', onKey)
   }, [aberto, onCancelar])
   ```
3. No `<div>` interno do modal (o `className="relative bg-surface ..."`), adicionar `role="dialog"` e `aria-modal="true"`.

- [ ] **Step 2: Esc + aria no modal de `BotaoCobranca`**

Em `src/components/BotaoCobranca.jsx`:
1. Adicionar `useEffect` ao import existente: `import { useState, useEffect } from 'react'`.
2. Após os `useState`, adicionar:
   ```js
   useEffect(() => {
     if (!aberto) return
     function onKey(e) { if (e.key === 'Escape') setAberto(false) }
     window.addEventListener('keydown', onKey)
     return () => window.removeEventListener('keydown', onKey)
   }, [aberto])
   ```
3. No contêiner do modal (o `<div className="bg-surface rounded-2xl ...">` dentro do overlay), adicionar `role="dialog"` e `aria-modal="true"`.

- [ ] **Step 3: Build + suíte**

Run: `npm run build` (Expected: PASS) e `npm test -- --run` (Expected: PASS).

- [ ] **Step 4: Commit**

```bash
git add src/components/ModalConfirmar.jsx src/components/BotaoCobranca.jsx
git commit -m "a11y(modais): fechar com Esc e marcar role=dialog"
```

---

## Verificação final (branch)
- `npm test -- --run` verde (inclui os novos testes de `calcularParcelas` e `cobrancaSelo`).
- `npm run build` limpo.
- Manual no app: (a) dark mode — verde único e legível nos gráficos; (b) excluir cliente com saldo mostra o aviso do valor em aberto; (c) cartão de cobrança mostra "Parcela x/y" e o selo "Cobrado…"; (d) busca por CPF encontra o cliente na Nova Venda; (e) Esc fecha os modais; (f) criar venda com 1ª parcela em dia 31 gera vencimentos coerentes.
- Deploy `vercel --prod` ao final (após RLS da Fase 0 já confirmado e suíte verde).

## Ordem e dependências
- Task 2 antes da Task 6 (o cartão consome `rotuloUltimaCobranca`).
- Demais tasks são independentes; ordem sugerida 1→7.

# Lembretes de Cobrança por WhatsApp — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir ao usuário gerar uma mensagem de cobrança/recebimento pré-montada, abrir direto no WhatsApp (wa.me), e guardar timestamp da última cobrança por parcela.

**Architecture:** Função pura `gerarMensagemCobranca` monta as 2 variantes; helper `linkWhatsApp` monta a URL wa.me. Componente `BotaoCobranca` abre modal editável e dispara o envio. Persistência via novo `registrarCobranca` no hook `useVendas` (atualiza o campo `ultimaCobrancaEm` dentro do array JSONB `parcelas`, igual ao `marcarParcelaPaga`). Integrado em PerfilCliente e CobrancasHoje.

**Tech Stack:** React 18, Vite, Tailwind, Supabase (JS client via hooks), vitest.

## Global Constraints

- **Modelo de dados real:** parcelas são um array JSONB DENTRO de `vendas` (coluna `parcelas`). NÃO há tabela `parcelas`, NÃO há migration SQL, NÃO há endpoint REST. Parcela identificada por `numero` dentro da venda. Shape: `{ numero, vencimento: 'YYYY-MM-DD', valor, pago, pagoEm: ISO-completo|null, ultimaCobrancaEm?: ISO-completo }`.
- **Persistência:** novo `registrarCobranca(vendaId, numeroParcela)` em `useVendas` — mapeia as parcelas, seta `ultimaCobrancaEm: new Date().toISOString()` na parcela do `numero`, chama `atualizarParcelas(vendaId, novas)`. Espelha `marcarParcelaPaga`.
- **Duas mensagens:** "cobranca" (`parcela.pago === false`) com valor+vencimento+pedido; "recebimento" (`parcela.pago === true`) com valor+data recebimento.
- **Datas/moeda:** usar `formatarData` (trata `YYYY-MM-DD` e ISO completo, timezone-safe) e `formatarMoeda` de `formatadores.js`. NÃO usar `new Date(x + 'T00:00:00')` cru (quebra no `pagoEm` ISO completo).
- **wa.me:** `https://wa.me/55${digits}?text=${encoded}` — prefixo `55` (Brasil), `digits` = telefone só com números. Igual ao `BotaoWhatsApp.jsx` existente (que deve ser refatorado pra usar o helper compartilhado).
- **Número obrigatório:** botão desabilitado + `title` de aviso se `cliente.telefone` faltar.
- **Callback:** `BotaoCobranca` expõe `onRegistrar` (async) — a tela mae persiste e mostra toast. Sem refetch automático dentro do componente.
- **Tokens de cor:** botão + modal dark-mode safe (bg-surface, text-ink, border-border).
- **Sem mudança** nos fluxos de pagamento/cadastro. Só adiciona atalho.

---

### Task 1: Helpers puros `gerarMensagemCobranca` + `linkWhatsApp` com testes

**Files:**
- Create: `src/utils/mensagensCobranca.js`
- Create: `src/utils/mensagensCobranca.test.js`

**Interfaces:**
- Consumes: `formatarData`, `formatarMoeda` de `./formatadores.js`.
- Produces:
  - `gerarMensagemCobranca(parcela, cliente, venda) → { mensagem: string, tipo: 'cobranca' | 'recebimento', titulo: string }`
  - `linkWhatsApp(telefone, mensagem) → string` (URL wa.me com prefixo 55 e texto codificado).

- [ ] **Step 1: Escrever os testes falhando**

Criar `src/utils/mensagensCobranca.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { gerarMensagemCobranca, linkWhatsApp } from './mensagensCobranca.js'

describe('gerarMensagemCobranca', () => {
  const cliente = { id: 'c1', nome: 'João Silva', telefone: '(11) 99999-9999' }
  const venda = { id: 'v1', numero: '001' }

  it('cobranca: parcela aberta com nome, valor e vencimento', () => {
    const parcela = { numero: 1, valor: 150, vencimento: '2026-07-15', pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.tipo).toBe('cobranca')
    expect(r.titulo).toBe('Cobrar')
    expect(r.mensagem).toContain('João Silva')
    expect(r.mensagem).toContain('150')
    expect(r.mensagem).toContain('15/07/2026')
  })

  it('recebimento: parcela paga usa a data de pagamento (ISO completo)', () => {
    const parcela = { numero: 1, valor: 150, vencimento: '2026-07-15', pago: true, pagoEm: '2026-07-10T12:00:00.000Z' }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.tipo).toBe('recebimento')
    expect(r.titulo).toBe('Confirmar Recebimento')
    expect(r.mensagem).toContain('João Silva')
    expect(r.mensagem).toContain('150')
    expect(r.mensagem).toContain('10/07/2026')
  })

  it('cobranca: inclui referência do pedido quando a venda tem numero', () => {
    const parcela = { numero: 2, valor: 200, vencimento: '2026-08-01', pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.mensagem).toContain('001')
  })

  it('cobranca: sem venda, funciona e não menciona pedido', () => {
    const parcela = { numero: 1, valor: 100, vencimento: '2026-08-01', pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, null)
    expect(r.tipo).toBe('cobranca')
    expect(r.mensagem).toContain('João Silva')
    expect(r.mensagem).not.toContain('Pedido')
  })
})

describe('linkWhatsApp', () => {
  it('monta wa.me com prefixo 55 e telefone só com dígitos', () => {
    const url = linkWhatsApp('(11) 99999-9999', 'oi')
    expect(url).toBe('https://wa.me/5511999999999?text=oi')
  })
  it('codifica a mensagem (espaços e acentos)', () => {
    const url = linkWhatsApp('11999999999', 'olá mundo')
    expect(url).toContain('https://wa.me/5511999999999?text=')
    expect(url).toContain('ol%C3%A1%20mundo')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FALHA — `gerarMensagemCobranca is not a function`.

- [ ] **Step 3: Implementar `mensagensCobranca.js`**

Criar `src/utils/mensagensCobranca.js`:

```js
import { formatarData, formatarMoeda } from './formatadores.js'

export function gerarMensagemCobranca(parcela, cliente, venda) {
  const valor = formatarMoeda(parcela.valor)

  if (parcela.pago) {
    const dataRecebimento = formatarData(parcela.pagoEm)
    return {
      mensagem: `Oi ${cliente.nome}, recebemos seu pagamento de ${valor} em ${dataRecebimento}. Obrigado!`,
      tipo: 'recebimento',
      titulo: 'Confirmar Recebimento',
    }
  }

  const dataVencimento = formatarData(parcela.vencimento)
  let mensagem = `Oi ${cliente.nome}, você tem uma parcela aberta de ${valor} com vencimento em ${dataVencimento}.`
  if (venda?.numero) {
    mensagem += ` (Pedido #${venda.numero})`
  }
  mensagem += ' Pode confirmar?'
  return { mensagem, tipo: 'cobranca', titulo: 'Cobrar' }
}

export function linkWhatsApp(telefone, mensagem) {
  const digits = (telefone || '').replace(/\D/g, '')
  return `https://wa.me/55${digits}?text=${encodeURIComponent(mensagem)}`
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASSA (todos os novos + pré-existentes verdes).

- [ ] **Step 5: Commit**

```bash
git add src/utils/mensagensCobranca.js src/utils/mensagensCobranca.test.js
git commit -m "feat(cobranca): add gerarMensagemCobranca and linkWhatsApp helpers with tests"
```

---

### Task 2: Componente `BotaoCobranca` + refatorar `BotaoWhatsApp` para o helper

**Files:**
- Create: `src/components/BotaoCobranca.jsx`
- Modify: `src/components/BotaoWhatsApp.jsx`

**Interfaces:**
- Consumes: `gerarMensagemCobranca`, `linkWhatsApp` de `../utils/mensagensCobranca.js`; `MessageCircle`, `X` de `lucide-react`.
- Produces: `<BotaoCobranca parcela={parcela} cliente={cliente} venda={venda} onRegistrar={async () => {}} />`

- [ ] **Step 1: Refatorar `BotaoWhatsApp.jsx` para usar `linkWhatsApp`**

Substituir o corpo de `src/components/BotaoWhatsApp.jsx` por (mantém a mesma API e visual, só centraliza a URL):

```jsx
import { MessageCircle } from 'lucide-react'
import { linkWhatsApp } from '../utils/mensagensCobranca.js'

export default function BotaoWhatsApp({ telefone, mensagem, className = '' }) {
  function abrirWhatsApp() {
    window.open(linkWhatsApp(telefone, mensagem), '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={abrirWhatsApp}
      className={`flex items-center gap-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-touch ${className}`}
    >
      <MessageCircle size={18} />
      <span>WhatsApp</span>
    </button>
  )
}
```

- [ ] **Step 2: Criar `BotaoCobranca.jsx`**

Criar `src/components/BotaoCobranca.jsx`:

```jsx
import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { gerarMensagemCobranca, linkWhatsApp } from '../utils/mensagensCobranca.js'

export default function BotaoCobranca({ parcela, cliente, venda, onRegistrar }) {
  const [aberto, setAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [titulo, setTitulo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const semTelefone = !cliente?.telefone

  function abrir() {
    if (semTelefone) return
    const g = gerarMensagemCobranca(parcela, cliente, venda)
    setMensagem(g.mensagem)
    setTitulo(g.titulo)
    setAberto(true)
  }

  async function enviar() {
    if (semTelefone) return
    setEnviando(true)
    try {
      await onRegistrar?.()
    } catch {
      // a tela mae mostra o erro; ainda assim abrimos o WhatsApp
    } finally {
      setEnviando(false)
    }
    window.open(linkWhatsApp(cliente.telefone, mensagem), '_blank', 'noopener,noreferrer')
    setAberto(false)
  }

  return (
    <>
      <button
        onClick={abrir}
        disabled={semTelefone}
        title={semTelefone ? 'Número do cliente não cadastrado' : 'Enviar via WhatsApp'}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
          semTelefone
            ? 'opacity-50 cursor-not-allowed text-ink-muted'
            : 'bg-primary text-white active:bg-primary-light'
        }`}
      >
        <MessageCircle size={16} />
        WhatsApp
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-sm p-4 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">{titulo}</h3>
              <button onClick={() => setAberto(false)} className="text-ink-muted hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Edite a mensagem aqui..."
            />

            <div className="flex gap-2 justify-end">
              <button onClick={() => setAberto(false)} className="px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink">
                Cancelar
              </button>
              <button
                onClick={enviar}
                disabled={enviando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white active:bg-primary-light disabled:opacity-60"
              >
                <MessageCircle size={16} />
                Enviar via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build sucesso (BotaoWhatsApp refatorado compila; BotaoCobranca compila mesmo sem uso ainda).

Run: `npm test`
Expected: testes verdes (Task 1 + pré-existentes).

- [ ] **Step 4: Commit**

```bash
git add src/components/BotaoCobranca.jsx src/components/BotaoWhatsApp.jsx
git commit -m "feat(cobranca): add BotaoCobranca modal and share wa.me helper with BotaoWhatsApp"
```

---

### Task 3: `registrarCobranca` no useVendas + integração nas telas

**Files:**
- Modify: `src/hooks/useVendas.js`
- Modify: `src/App.jsx` (garantir que `registrarCobranca` chega às telas via props)
- Modify: `src/pages/PerfilCliente.jsx`
- Modify: `src/pages/CobrancasHoje.jsx`

**Interfaces:**
- Consumes: `BotaoCobranca` (Task 2).
- Produces: `registrarCobranca(vendaId, numeroParcela)` no hook `useVendas` (retornado no objeto do hook).

- [ ] **Step 1: Adicionar `registrarCobranca` ao `useVendas`**

Em `src/hooks/useVendas.js`, adicionar a função (após `desmarcarParcelaPaga`, espelhando o padrão):

```js
  async function registrarCobranca(vendaId, numeroParcela) {
    const venda = vendas.find(v => v.id === vendaId)
    if (!venda) return
    const novas = venda.parcelas.map(p =>
      p.numero === numeroParcela
        ? { ...p, ultimaCobrancaEm: new Date().toISOString() }
        : p
    )
    await atualizarParcelas(vendaId, novas)
  }
```

E incluir no `return` do hook:

```js
  return {
    vendas,
    carregandoVendas: carregando,
    adicionarVenda,
    marcarParcelaPaga,
    desmarcarParcelaPaga,
    registrarCobranca,
    removerVenda,
  }
```

- [ ] **Step 2: Garantir propagação em App.jsx**

Em `src/App.jsx`, verificar como as funções do `useVendas` chegam às telas. `PerfilCliente` já recebe `marcarParcelaPaga`/`desmarcarParcelaPaga` via o objeto de props espalhado. Confirmar que esse objeto inclui todo o hook (ex.: `...vendasHook`); se as funções forem listadas uma a uma, adicionar `registrarCobranca` à lista. Ler o trecho onde `const vendasHook = useVendas()` é montado no objeto `props` e garantir que `registrarCobranca` esteja disponível para `PerfilCliente` e `CobrancasHoje`.

(Se já usa `...vendasHook`, nenhuma mudança é necessária aqui além de confirmar.)

- [ ] **Step 3: Integrar em PerfilCliente.jsx**

Em `src/pages/PerfilCliente.jsx`:

1. Adicionar `registrarCobranca` à desestruturação de props (linha 7, junto de `marcarParcelaPaga`):

```jsx
export default function PerfilCliente({ clienteId, clientes, vendas, marcarParcelaPaga, desmarcarParcelaPaga, registrarCobranca, removerVenda, removerCliente, atualizarCliente, navegar, mostrarToast, profile }) {
```

2. Adicionar o import:

```jsx
import BotaoCobranca from '../components/BotaoCobranca.jsx'
```

3. Na renderização de cada parcela (dentro do `venda.parcelas.map(p => { ... })`, perto do label "Parcela {p.numero} — {formatarData(p.vencimento)}"), adicionar o botão passando a venda corrente do `.map`:

```jsx
<BotaoCobranca
  parcela={p}
  cliente={cliente}
  venda={venda}
  onRegistrar={async () => {
    try {
      await registrarCobranca(venda.id, p.numero)
      mostrarToast('✓ Cobrança registrada')
    } catch {
      mostrarToast('Erro ao registrar cobrança.', 'error')
    }
  }}
/>
```

(Posicionar o botão junto aos controles da parcela; seguir o layout `flex items-center gap-2` já usado na linha da parcela.)

- [ ] **Step 4: Integrar em CobrancasHoje.jsx**

Em `src/pages/CobrancasHoje.jsx`:

1. Ler o arquivo para ver como recebe props e como itera as parcelas a receber (cada item precisa saber a `venda` e o `cliente`). Adicionar `registrarCobranca` à desestruturação de props.

2. Adicionar o import:

```jsx
import BotaoCobranca from '../components/BotaoCobranca.jsx'
```

3. Para cada parcela a receber, renderizar (usando a venda e o cliente correspondentes ao item):

```jsx
<BotaoCobranca
  parcela={p}
  cliente={cliente}
  venda={venda}
  onRegistrar={async () => {
    try {
      await registrarCobranca(venda.id, p.numero)
      mostrarToast('✓ Cobrança registrada')
    } catch {
      mostrarToast('Erro ao registrar cobrança.', 'error')
    }
  }}
/>
```

Se a lista já achata as parcelas (ex.: `vendas.flatMap`), garantir que cada item carrega `vendaId`/`clienteId` para localizar `venda` (`vendas.find(...)`) e `cliente` (`clientes.find(...)`). Se `mostrarToast` não estiver nas props desta tela, ler a assinatura e adicioná-la conforme o padrão do App.

- [ ] **Step 5: Verificar build e testes**

Run: `npm run build`
Expected: build sucesso.

Run: `npm test`
Expected: testes de `mensagensCobranca` verdes + pré-existentes.

- [ ] **Step 6: Verificar no navegador**

Run: `npm run dev`
Expected: em PerfilCliente, cada parcela tem botão "WhatsApp". Clicando, abre modal com mensagem editável (cobrança se aberta, recebimento se paga). "Enviar via WhatsApp" salva `ultimaCobrancaEm` na parcela, mostra toast e abre o wa.me. Botão desabilitado se o cliente não tem telefone. Mesma coisa em CobrancasHoje. Tema claro e escuro OK.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useVendas.js src/App.jsx src/pages/PerfilCliente.jsx src/pages/CobrancasHoje.jsx
git commit -m "feat(cobranca): registrarCobranca in useVendas and integrate BotaoCobranca in screens"
```

---

## Verificação final

- [ ] `npm test` — `mensagensCobranca` (mensagem + link) verdes + pré-existentes.
- [ ] `npm run build` — build sucesso.
- [ ] `npm run dev` — botão WhatsApp funcional em PerfilCliente e CobrancasHoje; modal editável; wa.me abre; `ultimaCobrancaEm` persistido no JSONB da parcela; sem migration/endpoint; botão desabilitado sem telefone.

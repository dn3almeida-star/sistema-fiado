# Lembretes de Cobrança por WhatsApp — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir ao usuário gerar uma mensagem de cobrança/recebimento pré-montada e abrir direto no WhatsApp. Guardar timestamp de última tentativa.

**Architecture:** Função pura `gerarMensagemCobranca` monta as 2 variantes (cobranca vs recebimento). Componente `BotaoCobranca` reutilizável abre modal, deixa editar, e gera link wa.me + salva timestamp. Integrado em PerfilCliente e CobrancasHoje.

**Tech Stack:** React 18, Vite, Tailwind, Supabase, vitest (testes da função pura).

## Global Constraints

- **Duas mensagens:** "cobranca" (parcela.pago === false) com valor+vencimento; "recebimento" (parcela.pago === true) com valor+data recebimento.
- **Detalhes:** inclui nome cliente, valor, data (pt-BR), número de parcelas da venda, referência do pedido (se disponível).
- **Link wa.me:** formato `https://wa.me/{telefone}?text={mensagem_encoded}`. Número do cliente é obrigatório (botão desabilitado + tooltip se faltar).
- **Timestamp:** salva `ultima_cobranca_em` em `parcelas.ultima_cobranca_em` (nullable, timestamp with time zone). Atualizado a cada envio.
- **Callback:** componente expõe `onCobrancaEnviada()` pra tela mae refetch (sem refetch automático).
- **Tokens de cor:** botão + modal dark-mode safe (bg-surface, text-ink, border-border).
- **Sem mudança:** fluxos de pagamento/cadastro intactos. Só adiciona atalho.

---

### Task 1: Função pura `gerarMensagemCobranca` com testes

**Files:**
- Create: `src/utils/mensagensCobranca.js`
- Create: `src/utils/mensagensCobranca.test.js`

**Interfaces:**
- Consumes: nada (pura, sem dependências externas).
- Produces: `gerarMensagemCobranca(parcela, cliente, venda) → { mensagem: string, tipo: 'cobranca' | 'recebimento', titulo: string }`

- [ ] **Step 1: Escrever os testes falhando**

Criar `src/utils/mensagensCobranca.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { gerarMensagemCobranca } from './mensagensCobranca.js'

describe('gerarMensagemCobranca', () => {
  const cliente = { id: 'c1', nome: 'João Silva', telefone: '5511999999999' }
  const venda = { id: 'v1', numero: '001' }

  it('cobranca: parcela aberta com valor e vencimento', () => {
    const parcela = { valor: 150, vencimento: '2026-07-15', pago: false, pagoEm: null }
    const result = gerarMensagemCobranca(parcela, cliente, venda)
    expect(result.tipo).toBe('cobranca')
    expect(result.titulo).toBe('Cobrar')
    expect(result.mensagem).toContain('João Silva')
    expect(result.mensagem).toContain('150')
    expect(result.mensagem).toContain('15')
  })

  it('recebimento: parcela paga com valor e data pagamento', () => {
    const parcela = { valor: 150, vencimento: '2026-07-15', pago: true, pagoEm: '2026-07-10' }
    const result = gerarMensagemCobranca(parcela, cliente, venda)
    expect(result.tipo).toBe('recebimento')
    expect(result.titulo).toBe('Confirmar Recebimento')
    expect(result.mensagem).toContain('João Silva')
    expect(result.mensagem).toContain('150')
    expect(result.mensagem).toContain('10')
  })

  it('cobranca: inclui referência do pedido se venda existe', () => {
    const parcela = { valor: 200, vencimento: '2026-08-01', pago: false, pagoEm: null }
    const result = gerarMensagemCobranca(parcela, cliente, venda)
    expect(result.mensagem).toContain('001') // venda.numero
  })

  it('cobranca: sem venda, funciona mesmo assim', () => {
    const parcela = { valor: 100, vencimento: '2026-08-01', pago: false, pagoEm: null }
    const result = gerarMensagemCobranca(parcela, cliente, null)
    expect(result.tipo).toBe('cobranca')
    expect(result.mensagem).toContain('João Silva')
  })

  it('datas formatadas em pt-BR (ex: "15 de julho")', () => {
    const parcela = { valor: 150, vencimento: '2026-07-15', pago: false, pagoEm: null }
    const result = gerarMensagemCobranca(parcela, cliente, venda)
    // Verifica que a data está em pt-BR, não en-US
    expect(result.mensagem).toMatch(/julho|julho/)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FALHA — `gerarMensagemCobranca is not a function`.

- [ ] **Step 3: Implementar `mensagensCobranca.js`**

Criar `src/utils/mensagensCobranca.js`:

```js
export function gerarMensagemCobranca(parcela, cliente, venda) {
  if (parcela.pago) {
    // Recebimento
    const dataRecebimento = new Date(parcela.pagoEm + 'T00:00:00').toLocaleDateString('pt-BR', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    })
    const valor = parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const mensagem = `Oi ${cliente.nome}, recebemos seu pagamento de ${valor} em ${dataRecebimento}. Obrigado!`
    return {
      mensagem,
      tipo: 'recebimento',
      titulo: 'Confirmar Recebimento'
    }
  } else {
    // Cobrança
    const dataVencimento = new Date(parcela.vencimento + 'T00:00:00').toLocaleDateString('pt-BR', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    })
    const valor = parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    let mensagem = `Oi ${cliente.nome}, você tem uma parcela aberta de ${valor} com vencimento em ${dataVencimento}.`
    if (venda?.numero) {
      mensagem += ` (Pedido #${venda.numero})`
    }
    mensagem += ' Pode confirmar?'
    return {
      mensagem,
      tipo: 'cobranca',
      titulo: 'Cobrar'
    }
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASSA (todos os testes verdes + pré-existentes).

- [ ] **Step 5: Commit**

```bash
git add src/utils/mensagensCobranca.js src/utils/mensagensCobranca.test.js
git commit -m "feat(cobranca): add gerarMensagemCobranca with tests"
```

---

### Task 2: Componente `BotaoCobranca` com modal e wa.me

**Files:**
- Create: `src/components/BotaoCobranca.jsx`

**Interfaces:**
- Consumes: `gerarMensagemCobranca` de `../utils/mensagensCobranca.js`; `MessageCircle` (ícone de WhatsApp) de `lucide-react`; `useState` de React.
- Produces: `<BotaoCobranca parcela={parcela} cliente={cliente} venda={venda} onCobrancaEnviada={callback} />`

- [ ] **Step 1: Criar o componente**

Criar `src/components/BotaoCobranca.jsx`:

```jsx
import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { gerarMensagemCobranca } from '../utils/mensagensCobranca.js'

export default function BotaoCobranca({ parcela, cliente, venda, onCobrancaEnviada }) {
  const [abreModal, setAbreModal] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [titulo, setTitulo] = useState('')

  // Abre modal com mensagem pré-gerada
  function abrirModal() {
    if (!cliente?.telefone) return
    const gerada = gerarMensagemCobranca(parcela, cliente, venda)
    setMensagem(gerada.mensagem)
    setTitulo(gerada.titulo)
    setAbreModal(true)
  }

  // Envia via wa.me
  async function enviarWhatsApp() {
    if (!cliente?.telefone) return

    const telefone = cliente.telefone.replace(/\D/g, '')
    const mensagemEncoded = encodeURIComponent(mensagem)
    const waMeUrl = `https://wa.me/${telefone}?text=${mensagemEncoded}`

    // Salva timestamp no Supabase
    try {
      const response = await fetch(`/api/parcelas/${parcela.id}/ultima-cobranca`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ultima_cobranca_em: new Date().toISOString() })
      })
      if (response.ok) {
        setAbreModal(false)
        onCobrancaEnviada?.()
        // Abre wa.me em nova aba
        window.open(waMeUrl, '_blank')
      }
    } catch (err) {
      console.error('Erro ao salvar cobrança:', err)
    }
  }

  const desabilitado = !cliente?.telefone

  return (
    <>
      <button
        onClick={abrirModal}
        disabled={desabilitado}
        title={desabilitado ? 'Número do cliente não cadastrado' : `${titulo || 'Enviar via WhatsApp'}`}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
          desabilitado
            ? 'opacity-50 cursor-not-allowed text-ink-muted'
            : 'bg-primary text-white active:bg-primary-light'
        }`}
      >
        <MessageCircle size={16} />
        {titulo || 'WhatsApp'}
      </button>

      {/* Modal */}
      {abreModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-sm p-4 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">{titulo}</h3>
              <button
                onClick={() => setAbreModal(false)}
                className="text-ink-muted hover:text-ink p-1"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Edite a mensagem aqui..."
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAbreModal(false)}
                className="px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink"
              >
                Cancelar
              </button>
              <button
                onClick={enviarWhatsApp}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white active:bg-primary-light"
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

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build sucesso (componente compila, mesmo não integrado ainda).

- [ ] **Step 3: Commit**

```bash
git add src/components/BotaoCobranca.jsx
git commit -m "feat(cobranca): add BotaoCobranca component with modal"
```

---

### Task 3: Integração em PerfilCliente + CobrancasHoje + Migration Supabase

**Files:**
- Modify: `src/pages/PerfilCliente.jsx`
- Modify: `src/pages/CobrancasHoje.jsx`
- Create: `supabase/migrations/YYYYMMDD_add_ultima_cobranca_em.sql`
- Create: `src/api/parcelas/[id]/ultima-cobranca.js` (ou rota equivalente em Supabase Functions se usar)

**Interfaces:**
- Consumes: `BotaoCobranca` (importa em PerfilCliente + CobrancasHoje); Supabase client pra UPDATE.
- Produces: endpoint PATCH `/api/parcelas/{id}/ultima-cobranca` que atualiza `ultima_cobranca_em`.

- [ ] **Step 1: Criar migration Supabase**

Criar `supabase/migrations/20260701000000_add_ultima_cobranca_em.sql`:

```sql
ALTER TABLE parcelas ADD COLUMN ultima_cobranca_em timestamp with time zone;
CREATE INDEX idx_parcelas_ultima_cobranca_em ON parcelas(ultima_cobranca_em);
```

(Rodar manualmente via Supabase Dashboard ou via `supabase migration up` no CI.)

- [ ] **Step 2: Criar endpoint PATCH**

Opção A (Supabase Functions):
Criar `supabase/functions/parcelas-ultima-cobranca/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

serve(async (req) => {
  const { parcelaId, ultimaCobrancaEm } = await req.json()

  const { error } = await supabase
    .from("parcelas")
    .update({ ultima_cobranca_em: ultimaCobrancaEm })
    .eq("id", parcelaId)

  if (error) return new Response(JSON.stringify({ error }), { status: 400 })
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

Opção B (API local Node.js em App.jsx ou via backend):
Criar `src/api/parcelas.js` (ou integrar em backend):

```js
export async function salvarUltimaCobranca(parcelaId) {
  const { data, error } = await supabase
    .from('parcelas')
    .update({ ultima_cobranca_em: new Date().toISOString() })
    .eq('id', parcelaId)
  
  if (error) throw error
  return data
}
```

Depois, em `BotaoCobranca`, chamar `salvarUltimaCobranca(parcela.id)` no lugar do fetch.

(Recomendo Opção B — mais simples, sem serverless.)

- [ ] **Step 3: Integrar em PerfilCliente.jsx**

Em `src/pages/PerfilCliente.jsx`, na seção de parcelas:

Adicionar import:
```jsx
import BotaoCobranca from '../components/BotaoCobranca.jsx'
```

Depois, na renderização de cada parcela (na linha onde renderiza status/valor), adicionar:

```jsx
<div className="flex items-center gap-2">
  {/* ... existing status badge ... */}
  <BotaoCobranca
    parcela={p}
    cliente={cliente}
    venda={vendas.find(v => v.id === p.vendaId)}
    onCobrancaEnviada={() => refetchParcelas?.()}
  />
</div>
```

Se não tiver refetch, passe um callback vazio ou refetch via `useState` local.

- [ ] **Step 4: Integrar em CobrancasHoje.jsx**

Em `src/pages/CobrancasHoje.jsx`, na seção de parcelas a receber:

Adicionar import:
```jsx
import BotaoCobranca from '../components/BotaoCobranca.jsx'
```

Depois, na renderização de cada parcela:

```jsx
<div className="flex items-center gap-2">
  {/* ... existing status badge ... */}
  <BotaoCobranca
    parcela={p}
    cliente={clientes.find(c => c.id === p.clienteId)}
    venda={vendas.find(v => v.id === p.vendaId)}
    onCobrancaEnviada={() => refetchCobrancas?.()}
  />
</div>
```

- [ ] **Step 5: Verificar build e testes**

Run: `npm run build`
Expected: build sucesso.

Run: `npm test`
Expected: testes de `mensagensCobranca` verdes + pré-existentes intactos.

- [ ] **Step 6: Verificar no navegador**

Run: `npm run dev`
Expected: em PerfilCliente, cada parcela tem um botão WhatsApp. Clicando, abre modal com mensagem editável. Enviando, salva timestamp e abre wa.me. Mesma coisa em CobrancasHoje.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260701000000_add_ultima_cobranca_em.sql src/pages/PerfilCliente.jsx src/pages/CobrancasHoje.jsx src/api/parcelas.js
git commit -m "feat(cobranca): integrate BotaoCobranca in PerfilCliente and CobrancasHoje, add Supabase migration"
```

---

## Verificação final

- [ ] `npm test` — mensagensCobranca tests verdes + pré-existentes.
- [ ] `npm run build` — build sucesso.
- [ ] `npm run dev` — botão WhatsApp funcional em 2 locais, modal editável, wa.me abre, timestamp é salvo.

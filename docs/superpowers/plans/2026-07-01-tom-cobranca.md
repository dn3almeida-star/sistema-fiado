# Tom de Mensagem na Cobrança Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir escolher entre tom Educado (atual) e Formal ao cobrar uma parcela em aberto pelo WhatsApp, com o texto formal se ajustando corretamente a parcelas atrasadas, vencendo hoje, ou a vencer.

**Architecture:** `gerarMensagemCobranca` ganha um parâmetro `tom` (`'educado'` | `'formal'`), usado apenas quando a parcela está em aberto — reaproveita `diasAteVencimento` (já existe em `formatadores.js`) para escolher entre 3 frases formais conforme o status de vencimento. `BotaoCobranca.jsx` ganha um toggle `[Educado] [Formal]` dentro do modal já existente, visível só para cobrança, que regenera o texto ao trocar.

**Tech Stack:** React 18 + Vite + Vitest. Sem novas dependências.

## Global Constraints

- Tom `'educado'` (comportamento atual) não pode mudar — zero regressão nos 4 testes já existentes em `mensagensCobranca.test.js`.
- Reaproveitar `diasAteVencimento` de `formatadores.js` — não duplicar lógica de cálculo de dias.
- Toggle só aparece para cobrança (parcela em aberto), nunca para confirmação de pagamento.
- Sem persistência de preferência de tom — o modal sempre abre com tom Educado selecionado.
- Sem mudanças de banco de dados.
- Comandos rodam dentro de `sistema-fiado/`.

---

## File Structure

**Modify:**
- `src/utils/mensagensCobranca.js` — `gerarMensagemCobranca` ganha parâmetro `tom` com 3 variações formais
- `src/utils/mensagensCobranca.test.js` — novos testes para o tom formal e regressão do educado
- `src/components/BotaoCobranca.jsx` — toggle Educado/Formal no modal

---

## Task 1: Parâmetro `tom` em `gerarMensagemCobranca`

**Files:**
- Modify: `src/utils/mensagensCobranca.js`
- Modify: `src/utils/mensagensCobranca.test.js`

**Interfaces:**
- Consumes: `diasAteVencimento(iso)` de `src/utils/formatadores.js` (já existe — retorna número de dias até o vencimento; negativo = atrasada, `0` = vence hoje, positivo = a vencer)
- Produces: `gerarMensagemCobranca(parcela, cliente, venda, tom = 'educado') → { mensagem: string, tipo: string, titulo: string }` — mesma forma de retorno de antes, `tom` é o único parâmetro novo, com default que preserva o comportamento atual para qualquer chamada existente

- [ ] **Step 1: Escrever os testes novos (falhando)**

Substituir o conteúdo de `src/utils/mensagensCobranca.test.js` por:

```javascript
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

  function diasAPartirDeHoje(dias) {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  it('formal: parcela atrasada menciona "venceu em"', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(-3), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda, 'formal')
    expect(r.tipo).toBe('cobranca')
    expect(r.titulo).toBe('Cobrar')
    expect(r.mensagem).toContain('Prezado(a) João Silva')
    expect(r.mensagem).toContain('venceu em')
  })

  it('formal: parcela vence hoje menciona "hoje vence"', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(0), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda, 'formal')
    expect(r.mensagem).toContain('hoje vence')
  })

  it('formal: parcela a vencer menciona "vence em"', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(10), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda, 'formal')
    expect(r.mensagem).toContain('vence em')
  })

  it('formal: inclui referência do pedido quando a venda tem numero', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(0), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda, 'formal')
    expect(r.mensagem).toContain('001')
  })

  it('parcela paga ignora o parâmetro tom (recebimento não muda)', () => {
    const parcela = { numero: 1, valor: 150, vencimento: '2026-07-15', pago: true, pagoEm: '2026-07-10T12:00:00.000Z' }
    const educado = gerarMensagemCobranca(parcela, cliente, venda, 'educado')
    const formal = gerarMensagemCobranca(parcela, cliente, venda, 'formal')
    expect(formal.mensagem).toBe(educado.mensagem)
    expect(formal.tipo).toBe('recebimento')
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

- [ ] **Step 2: Rodar os testes e confirmar que os novos falham**

```bash
cd c:/Users/Daniel-PC/Desktop/Jose\ Iran/sistema-fiado
npm test -- src/utils/mensagensCobranca.test.js
```

Expected: os 4 testes originais (cobranca/recebimento/pedido/sem-venda) continuam passando; os 5 novos testes de tom formal e o de "parcela paga ignora tom" FALHAM (a função ainda não aceita o parâmetro `tom`, então os textos formais não existem).

- [ ] **Step 3: Implementar `gerarMensagemCobranca` com o parâmetro `tom`**

Substituir o conteúdo de `src/utils/mensagensCobranca.js` por:

```javascript
import { formatarData, formatarMoeda, diasAteVencimento } from './formatadores.js'

export function gerarMensagemCobranca(parcela, cliente, venda, tom = 'educado') {
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

  if (tom === 'formal') {
    const dias = diasAteVencimento(parcela.vencimento)
    let mensagem
    if (dias < 0) {
      mensagem = `Prezado(a) ${cliente.nome}, informamos que uma parcela de ${valor} venceu em ${dataVencimento}.`
    } else if (dias === 0) {
      mensagem = `Prezado(a) ${cliente.nome}, informamos que hoje vence uma parcela de ${valor}.`
    } else {
      mensagem = `Prezado(a) ${cliente.nome}, informamos que vence em ${dataVencimento} uma parcela de ${valor}.`
    }
    if (venda?.numero) {
      mensagem += ` (Pedido #${venda.numero})`
    }
    mensagem += ' Podemos regularizar o pagamento?'
    return { mensagem, tipo: 'cobranca', titulo: 'Cobrar' }
  }

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

- [ ] **Step 4: Rodar os testes e confirmar que todos passam**

```bash
npm test -- src/utils/mensagensCobranca.test.js
```

Expected: PASS (9 testes: 4 originais + 5 novos)

- [ ] **Step 5: Commit**

```bash
git add src/utils/mensagensCobranca.js src/utils/mensagensCobranca.test.js
git commit -m "feat(cobranca): add tom formal/educado to gerarMensagemCobranca"
```

---

## Task 2: Toggle Educado/Formal em `BotaoCobranca.jsx`

**Files:**
- Modify: `src/components/BotaoCobranca.jsx`

**Interfaces:**
- Consumes: `gerarMensagemCobranca(parcela, cliente, venda, tom)` (Task 1) — chamado com `tom = 'educado'` ou `tom = 'formal'`
- Produces: nenhuma interface nova exposta — `BotaoCobranca` continua recebendo as mesmas props (`parcela`, `cliente`, `venda`, `onRegistrar`) e nenhum consumidor (`CobrancasHoje.jsx`, `PerfilCliente.jsx`) precisa mudar

- [ ] **Step 1: Substituir o conteúdo de `src/components/BotaoCobranca.jsx`**

```jsx
import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { gerarMensagemCobranca, linkWhatsApp } from '../utils/mensagensCobranca.js'

export default function BotaoCobranca({ parcela, cliente, venda, onRegistrar }) {
  const [aberto, setAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [titulo, setTitulo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [tom, setTom] = useState('educado')

  const semTelefone = !cliente?.telefone

  function abrir() {
    if (semTelefone) return
    setTom('educado')
    const g = gerarMensagemCobranca(parcela, cliente, venda, 'educado')
    setMensagem(g.mensagem)
    setTitulo(g.titulo)
    setAberto(true)
  }

  function trocarTom(novoTom) {
    setTom(novoTom)
    const g = gerarMensagemCobranca(parcela, cliente, venda, novoTom)
    setMensagem(g.mensagem)
    setTitulo(g.titulo)
  }

  async function enviar() {
    if (semTelefone || enviando) return
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

            {!parcela.pago && (
              <div className="flex gap-2 bg-surface-2 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => trocarTom('educado')}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-colors ${
                    tom === 'educado' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
                  }`}
                >
                  Educado
                </button>
                <button
                  type="button"
                  onClick={() => trocarTom('formal')}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-colors ${
                    tom === 'formal' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
                  }`}
                >
                  Formal
                </button>
              </div>
            )}

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

- [ ] **Step 2: Rodar a suíte completa (regressão)**

```bash
cd c:/Users/Daniel-PC/Desktop/Jose\ Iran/sistema-fiado
npm test
```

Expected: PASS (todos os testes existentes + os 9 de `mensagensCobranca.test.js`; não há teste automatizado para `BotaoCobranca.jsx`, mesma situação de antes desta mudança — componente com efeito colateral de abrir link externo)

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build sem erros

- [ ] **Step 4: Teste manual**

```bash
npm run dev
```

No navegador, abra o perfil de um cliente com parcelas em situações diferentes (atrasada, vencendo hoje, futura) e teste o botão WhatsApp de cada uma:
- Toggle `[Educado] [Formal]` aparece só quando a parcela está em aberto (some quando a parcela já está paga)
- Modal sempre abre com "Educado" selecionado
- Trocar pra "Formal" numa parcela atrasada gera texto com "venceu em"
- Trocar pra "Formal" numa parcela vencendo hoje gera texto com "hoje vence"
- Trocar pra "Formal" numa parcela futura gera texto com "vence em"
- Editar o texto manualmente depois de escolher o tom continua funcionando (textarea editável)
- Voltar pra "Educado" restaura o texto educado original

- [ ] **Step 5: Commit**

```bash
git add src/components/BotaoCobranca.jsx
git commit -m "feat(cobranca): add Educado/Formal toggle to WhatsApp modal"
```

---

## Summary of Changes

| File | Type | Purpose |
|------|------|---------|
| `src/utils/mensagensCobranca.js` | Modify | Parâmetro `tom`, 3 variações formais por status de vencimento |
| `src/utils/mensagensCobranca.test.js` | Modify | 5 novos testes (formal atrasada/hoje/futura/pedido + parcela paga ignora tom) |
| `src/components/BotaoCobranca.jsx` | Modify | Toggle Educado/Formal no modal, visível só para cobrança |

**Total:** 3 arquivos modificados, nenhum arquivo novo.

---

## Testing Checklist

Após completar todas as tasks:

- [ ] `npm test` — todos os testes passam (existentes + 5 novos de tom formal)
- [ ] `npm run build` — sem erros
- [ ] Toggle aparece só para cobrança (parcela em aberto), nunca para confirmação de pagamento
- [ ] Modal sempre abre em "Educado"
- [ ] Texto formal correto nos 3 casos: atrasada, vence hoje, a vencer
- [ ] Referência "(Pedido #N)" preservada no tom formal quando a venda tem número
- [ ] Tom educado (comportamento atual) sem nenhuma mudança de texto

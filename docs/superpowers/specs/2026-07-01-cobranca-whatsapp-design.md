# Design: Lembretes de Cobrança por WhatsApp

**Data:** 2026-07-01
**App:** sistema-fiado (Crediário Digital)
**Stack:** React 18 + Vite + Tailwind + Supabase

## Objetivo

Permitir ao usuário gerar uma mensagem pré-montada de cobrança (ou confirmação
de recebimento) e abrir direto no WhatsApp via link wa.me. Guardar quando foi
feita a última tentativa de cobrança por parcela.

## Estado atual

[PerfilCliente.jsx](../../../src/pages/PerfilCliente.jsx) mostra lista de
parcelas de um cliente. [CobrancasHoje.jsx](../../../src/pages/CobrancasHoje.jsx)
mostra parcelas a receber do dia. Não há integração com WhatsApp. Parcelas têm
`{ valor, vencimento, pago, pagoEm }`.

## Escopo

Adicionar dois tipos de mensagens (cobrança p/ aberta, recebimento p/ paga),
componente reutilizável, persistência de timestamp. **Fora de escopo:**
agendamento automático de mensagens, integração com API WhatsApp Business,
templates customizáveis, histórico de todas as cobranças enviadas.

## Abordagem

Componente reutilizável `BotaoCobranca` que encapsula a lógica de gerar
mensagem, abrir modal de edição, e salvar timestamp. Integrado em dois
entry points: PerfilCliente (por parcela) e CobrancasHoje (por parcela).

---

## Componentes

### 1. Função pura: `gerarMensagemCobranca`

**Arquivo:** `src/utils/mensagensCobranca.js`

Assinatura:
```
gerarMensagemCobranca(parcela, cliente, venda) → {
  mensagem: string,
  tipo: 'cobranca' | 'recebimento',
  titulo: string
}
```

**Lógica:**
- Se `parcela.pago === false` → tipo `'cobranca'`, título "Cobrar"
  - Template: "Oi {cliente.nome}, você tem uma parcela aberta de R$ {valor} com vencimento em {vencimento}. Pode confirmar?"
  - Detalhes adicionais (se disponíveis): número de parcelas da venda, referência do pedido
- Se `parcela.pago === true` → tipo `'recebimento'`, título "Confirmar Recebimento"
  - Template: "Oi {cliente.nome}, recebemos seu pagamento de R$ {valor} em {pagoEm}. Obrigado!"

Datas formatadas em pt-BR (ex.: "15 de junho de 2026").

Testável (sem DOM, sem `Date` global — `hoje()` injetada se necessária).

### 2. Componente: `BotaoCobranca`

**Arquivo:** `src/components/BotaoCobranca.jsx`

Props:
- `parcela` — objeto `{ valor, vencimento, pago, pagoEm }`
- `cliente` — objeto `{ id, nome, telefone }`
- `venda` — (opcional) referência da venda (número/ID) para contexto
- `onCobrancaEnviada` — callback `() => void` após salvar timestamp

Comportamento:
1. Renderiza botão com ícone WhatsApp + título dinâmico ("Cobrar" ou "Receber")
2. Desabilitado se `cliente.telefone` faltar (tooltip: "Número não cadastrado")
3. Ao clicar:
   - Gera mensagem via `gerarMensagemCobranca`
   - Abre modal com textarea editável + botões "Cancelar" e "Enviar via WhatsApp"
4. Ao clicar "Enviar via WhatsApp":
   - Salva `ultima_cobranca_em: agora()` na parcela (Supabase UPDATE)
   - Gera link wa.me: `https://wa.me/{numero}?text={mensagem_encoded}`
   - Abre link em nova aba
   - Fecha modal, chama `onCobrancaEnviada()`, mostra toast de sucesso
5. Opcionalmente mostra timestamp: "Última cobrança: há 2 horas" se `ultima_cobranca_em` existe

Styling:
- Botão: `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-white active:bg-primary-light`
- Modal: reusa card-padrão `bg-surface rounded-2xl shadow-sm p-4` com título e textarea
- Dark mode: tokens semânticos (text-ink, bg-surface, border-border)

### 3. Persistência: campo dentro da parcela (JSONB)

**Importante:** parcelas NÃO são uma tabela — são um array JSONB dentro da tabela
`vendas` (coluna `parcelas`), identificadas por `numero`. Portanto **não há
migration SQL nem endpoint REST**.

- O campo `ultimaCobrancaEm` (ISO completo) é adicionado ao objeto da parcela.
- Novo `registrarCobranca(vendaId, numeroParcela)` no hook `useVendas` mapeia as
  parcelas, seta `ultimaCobrancaEm` na parcela do `numero`, e chama
  `atualizarParcelas(vendaId, novas)` — espelhando o `marcarParcelaPaga` já
  existente.

---

## Fluxo de dados

1. Usuário clica `<BotaoCobranca parcela={p} cliente={c} />`
2. Componente chama `gerarMensagemCobranca(p, c, v)` → retorna mensagem padrão
3. Modal abre, usuário pode editar
4. Clica "Enviar via WhatsApp":
   - Atualiza `parcelas.ultima_cobranca_em` no Supabase
   - Gera link wa.me e abre em nova aba
   - Chama `onCobrancaEnviada()` (callback da tela mae) pra refresh local (ex.: atualizar lista)
5. Usuário vê o WhatsApp abrir, copia/edita a mensagem lá e envia manualmente

---

## Integração nas telas

### PerfilCliente.jsx
- Na seção de parcelas, cada linha tem: status · valor · vencimento · `<BotaoCobranca />`
- Callback `onCobrancaEnviada={() => refetchParcelas()}`

### CobrancasHoje.jsx
- Mesma estrutura: lista de parcelas a receber, cada linha com botão
- Callback `onCobrancaEnviada={() => refetchCobrancas()}`

---

## Critérios de sucesso

1. Mensagem é gerada corretamente (cobrança vs. recebimento), com nome, valor, data
2. Modal permite edição, abre wa.me com texto codificado
3. Número do cliente é validado (desabilita botão se faltar)
4. Timestamp é salvo no Supabase após envio
5. Testes cobrem `gerarMensagemCobranca` (TDD)
6. Funciona em tema claro e escuro
7. Sem mudança nos fluxos de pagamento/cadastro — só adiciona atalho

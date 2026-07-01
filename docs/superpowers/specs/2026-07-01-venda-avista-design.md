# Venda à Vista — Design Spec

**Goal:** Permitir que o vendedor registre uma venda paga integralmente no ato (à vista), para ter controle de todas as suas vendas — não só as fiado/parceladas — em um único sistema.

**Contexto:** Hoje, toda venda cadastrada em `NovaVenda.jsx` passa pelo fluxo de parcelamento (mesmo que com 1 parcela). Não existe um jeito explícito de registrar uma venda já quitada na hora. O modelo de dados (`vendas.parcelas`, array JSONB) já é genérico o suficiente para representar isso sem mudanças de schema.

---

## Abordagem escolhida

Reaproveitar o modelo de dados existente: uma venda à vista é uma venda comum com **uma única parcela que já nasce paga**. Um toggle na tela Nova Venda ativa esse modo e simplifica o formulário.

**Alternativas consideradas e descartadas:**
- Coluna `tipo_venda` nova (via migration): mais explícito para relatórios futuros, mas exige migration e não foi pedido — YAGNI por agora.
- Tela separada "Nova Venda à Vista": evita branching na tela atual, mas duplica lógica e cria dois pontos de entrada de cadastro.

---

## Modelo de dados (sem migration)

Ao salvar uma venda à vista, `adicionarVenda` recebe:

```js
{
  clienteId,
  itens,
  valorTotal: total,
  entrada: 0,
  parcelas: [
    { numero: 1, valor: total, vencimento: hoje(), pago: true, pagoEm: new Date().toISOString() }
  ]
}
```

Essa parcela sintética, por já ter `pago: true`, integra automaticamente com toda a lógica existente que já opera por parcela:

- `resumoCliente` → saldo = 0, situação = `quitado`
- `Relatorio` (`metricasRelatorio`, stats inline) → conta em "Recebido no mês" e "Parcelas quitadas"
- `PerfilCliente` → badge "1 paga" no card da venda
- `Timeline` (`gerarEventosTimeline`) → gera eventos de `compra`, `vencimento` e `pagamento`, todos na mesma data

Nenhuma mudança necessária em `useVendas.js`, `Timeline.jsx`, `Relatorio.jsx`, `FiltroSituacao.jsx` ou no banco de dados.

---

## UI — Nova Venda

Na Etapa 2 (dados da venda), adicionar um toggle segmentado no topo:

```
[ Fiado ]  [ À Vista ]
```

- Padrão: **Fiado** (preserva 100% do comportamento atual)
- Ao selecionar **À Vista**:
  - Esconde os campos: Entrada, Nº de Parcelas, 1ª Parcela em, Preview de Parcelas
  - Mostra apenas: Itens/Descrição, Valor Total
  - Validação simplificada: só exige cliente + itens + valor total > 0
  - Ao salvar, monta a parcela única já paga (ver seção acima) e chama `adicionarVenda` normalmente

---

## Decisões de detalhe

**Timeline com 3 eventos no mesmo dia:** para uma venda à vista, a Timeline mostrará `Compra`, `Vencimento` e `Pagamento` todos na mesma data. Decisão: **deixar como está** — tecnicamente correto, sem código extra, e o usuário pode filtrar por tipo de evento se achar verboso.

**Badge visual "À Vista":** ao invés de mostrar apenas "1 paga" (como uma venda fiado quitada mostraria), o card da venda em `PerfilCliente` mostrará uma tag "À Vista" quando a heurística `ehVendaAvista(venda)` for verdadeira:

```js
venda.parcelas.length === 1
  && venda.parcelas[0].pago
  && venda.entrada === 0
  && venda.parcelas[0].vencimento === venda.criadaEm.slice(0, 10)
```

**Trade-off aceito:** uma venda fiado de 1 parcela, paga no mesmo dia em que foi criada, também seria rotulada como "À Vista" por esta heurística. Caso considerado raro e economicamente equivalente (a venda foi, de fato, quitada no mesmo dia), portanto aceitável sem precisar de uma coluna nova no banco.

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/vendaAvista.js` (novo) | `criarParcelaAvista(valorTotal, dataVenda)` + `ehVendaAvista(venda)`, com testes unitários |
| `src/pages/NovaVenda.jsx` | Toggle Fiado/À Vista, formulário simplificado, monta parcela ao salvar |
| `src/pages/PerfilCliente.jsx` | Badge "À Vista" no card da venda (usa `ehVendaAvista`) |

**Sem mudanças em:** `useVendas.js`, `Timeline.jsx`, `Relatorio.jsx`, `FiltroSituacao.jsx`, banco de dados/migrations.

---

## Testes

- `criarParcelaAvista`: gera parcela com `numero: 1`, `pago: true`, `pagoEm` preenchido, `vencimento` = data passada
- `ehVendaAvista`: casos de borda — 1 parcela paga mesmo dia (true), múltiplas parcelas (false), 1 parcela paga em dia diferente da criação (false), 1 parcela não paga (false)
- Reaproveita testes já existentes (`resumoCliente`, `gerarEventosTimeline`) sem alteração

## Global Constraints

- Tokens semânticos de cor (dark-mode safe), consistentes com o resto do app
- Mobile-friendly (~360px)
- Sem migrations, sem novos endpoints
- Fluxo "Fiado" (padrão) deve continuar 100% igual ao atual — zero regressão

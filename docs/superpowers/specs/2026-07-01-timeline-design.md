# Design: Timeline de Histórico do Cliente

**Data:** 2026-07-01
**App:** sistema-fiado (Crediário Digital)
**Stack:** React 18 + Vite + Tailwind + Supabase

## Objetivo

Exibir o histórico completo de um cliente em uma aba dedicada: compras criadas, parcelas vencidas, pagamentos recebidos e tentativas de cobrança por WhatsApp. Usuário consegue visualizar a trajetória da relação com o cliente e filtrar por tipo de evento.

## Estado Atual

[PerfilCliente.jsx](../../../src/pages/PerfilCliente.jsx) mostra dados do cliente e lista de vendas com parcelas. Não existe visualização histórica ou timeline. Dados disponíveis:
- Venda: `id`, `clienteId`, `criadaEm`, `parcelas` (array JSONB)
- Parcela: `numero`, `valor`, `vencimento`, `pago`, `pagoEm`, `ultimaCobrancaEm`

## Escopo

Adicionar aba "Timeline" com eventos históricos (compras, pagamentos, vencimentos, cobranças), agrupamento por mês, filtro por tipo, e expansão de compras pra detalhar parcelas. **Fora de escopo:** estatísticas, gráficos, exportação CSV, notificações baseadas em timeline.

## Abordagem

Nova aba "Timeline" no PerfilCliente (ao lado de "Perfil"). Timeline é uma lista vertical agrupada por mês (colapsíveis), com filtro por tipo de evento. Eventos derivados de dados já persistidos (não requer nova persistência). Visual: barra lateral colorida + ícone por tipo.

---

## Componentes

### 1. Aba no PerfilCliente

**Arquivo:** `src/pages/PerfilCliente.jsx` (modificado)

Adicionar estado `abaSelecionada` (string: "perfil" | "timeline").

Renderizar dois tabs acima do conteúdo:
- Tab "Perfil": exibe dados do cliente, vendas, parcelas (comportamento atual)
- Tab "Timeline": renderiza `<Timeline />`

Ambas compartilham o mesmo `clienteId`.

### 2. Função pura: `gerarEventosTimeline`

**Arquivo:** `src/utils/timelineHelpers.js`

Assinatura:
```javascript
gerarEventosTimeline(vendas) → evento[]
```

Onde `evento` é:
```javascript
{
  id: string,              // "venda_<id>" ou "parcela_<vendaId>_<numero>_<tipo>"
  tipo: 'compra' | 'pagamento' | 'vencimento' | 'cobranca',
  data: string,            // ISO 8601
  valor: number,
  descricao: string,
  vendaId: string,
  numeroParc: number | null, // null pra compra
  venda: object            // ref à venda (pra expandir depois)
}
```

**Lógica:**
- Para cada venda:
  - Gera evento "compra" com `data = venda.criadaEm`, `descricao = "Compra: N parcelas, total R$ XXX"`
  - Para cada parcela:
    - Se `parcela.vencimento`: gera evento "vencimento" com `data = parcela.vencimento`, `descricao = "Parcela N/M vence: R$ XXX"`
    - Se `parcela.pagoEm`: gera evento "pagamento" com `data = parcela.pagoEm`, `descricao = "Parcela N/M recebida: R$ XXX"`
    - Se `parcela.ultimaCobrancaEm`: gera evento "cobranca" com `data = parcela.ultimaCobrancaEm`, `descricao = "Tentativa de cobrança: Parcela N/M"`
- Retorna array de eventos

Testável (sem DOM, sem `Date` global).

### 3. Componente: `Timeline.jsx`

**Arquivo:** `src/components/Timeline.jsx`

Props:
- `vendas` — array de vendas do cliente
- `clientes` — array de clientes (pra lookup rápido se necessário)

Estado:
- `filtrosTipo` — object `{ compra: bool, pagamento: bool, vencimento: bool, cobranca: bool }`
- `mesesExpandidos` — Set de strings "YYYY-MM"

Comportamento:
1. Chama `gerarEventosTimeline(vendas)` pra construir lista de eventos
2. Agrupa eventos por `evento.data` → mês (formato "YYYY-MM", label "Julho 2026")
3. Filtra eventos conforme `filtrosTipo`
4. Renderiza:
   - `<FiltrosTimeline filtros={filtrosTipo} onChange={setFiltrosTipo} />`
   - Para cada mês (desc order, mais recente no topo):
     - Header colapsível (ex: "Julho 2026") com count de eventos
     - Se expandido: lista de `<EventoTimeline />` daquele mês

### 4. Componente: `EventoTimeline.jsx`

**Arquivo:** `src/components/EventoTimeline.jsx`

Props:
- `evento` — objeto evento (ver acima)
- `expandido` — boolean (se evento.tipo === 'compra')
- `onToggle` — callback pra abrir/fechar expansão de compra

Renderiza:
- Barra lateral colorida (width 4px, altura 100%)
- Ícone + data + tipo (label) + valor (moeда) + descrição
- Se `evento.tipo === 'compra'` e `expandido`: mostra parcelas em sub-lista indentada

Styling:
- Barra lateral: verde pra pagamento, laranja pra vencimento, azul pra compra, roxo pra cobrança
- Tokens semânticos: `bg-surface`, `text-ink`, `border-border`, etc.

### 5. Componente: `FiltrosTimeline.jsx`

**Arquivo:** `src/components/FiltrosTimeline.jsx`

Props:
- `filtros` — object `{ compra, pagamento, vencimento, cobranca }` (todos boolean)
- `onChange` — callback `(novosFiltros) => void`

Renderiza:
- 4 checkboxes (um por tipo)
- Label descritivo (ex: "Pagamentos", "Vencimentos")
- Ícone + cor do tipo ao lado de cada checkbox

---

## Fluxo de Dados

```
PerfilCliente (clienteId, vendas, clientes)
  ↓ abaSelecionada === 'timeline'
  ↓
Timeline (vendas, clientes)
  ↓ gerarEventosTimeline(vendas)
  ↓
eventos brutos
  ↓ agrupar por mês
  ↓
meses com eventos
  ↓ filtrar por tipo (filtrosTipo)
  ↓
meses filtrados
  ↓
EventoTimeline[] (renderiza cada evento)
  ↓ clique em compra
  ↓
mesesExpandidos.add("YYYY-MM")
  ↓
parcelas da venda aparecem
```

---

## Integração com PerfilCliente

1. Importar `Timeline` em PerfilCliente
2. Adicionar estado `abaSelecionada`
3. Renderizar dois tabs (ex: com `<button>` ou similar)
4. Condicionar conteúdo: se `abaSelecionada === 'timeline'`, renderizar `<Timeline vendas={vendasCliente} clientes={clientes} />`; senão, renderizar seção de perfil/vendas (atual)

---

## Tipos de Eventos

| Tipo | Ícone | Cor | Condição | Descrição Template |
|------|-------|-----|----------|-------------------|
| **Compra** | 📦 | Azul (`info`) | venda.criadaEm | "Compra: N parcelas, total R$ XXXX,XX" |
| **Pagamento** | ✓ | Verde (`success`) | parcela.pagoEm | "Parcela N/M recebida: R$ XXXX,XX" |
| **Vencimento** | ⏰ | Laranja (`warning`) | parcela.vencimento | "Parcela N/M vence: R$ XXXX,XX" |
| **Cobrança** | 💬 | Roxo (`accent`) | parcela.ultimaCobrancaEm | "Tentativa de cobrança: Parcela N/M" |

---

## Critérios de Sucesso

1. Aba "Timeline" aparece no PerfilCliente (ao lado de "Perfil")
2. Eventos são agrupados por mês, mais recentes no topo, colapsíveis
3. Cada evento exibe data (DD MMM), tipo, valor, descrição
4. Visual: barra lateral colorida (4px) + ícone + cor por tipo
5. Filtro por tipo funciona (checkboxes controlam exibição)
6. Compras são clicáveis pra expandir e mostrar suas parcelas
7. Funciona em tema claro e escuro (tokens semânticos)
8. Mobile-friendly: timeline reduz bem em telas estreitas (~360px)
9. Sem regressões: aba "Perfil" continua funcionando igual

---

## Notas de Implementação

- **Timestamps:** `vencimento` é YYYY-MM-DD, `pagoEm` e `ultimaCobrancaEm` são ISO completo. Usar `formatarData` existente.
- **Parcelas incompletas:** se `vencimento` ou `pagoEm` for null/inválido, evento não é gerado (graceful degrada).
- **Performance:** com 10 vendas × 3 parcelas = ~30 eventos, performance é trivial. Meses colapsíveis evitam render de tudo.
- **Testes:** `gerarEventosTimeline` é função pura, testável com TDD. Componentes testáveis via comportamento (cliques, filtros).

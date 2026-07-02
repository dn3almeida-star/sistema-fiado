# Lista de Vendas na Aba Nova Venda — Design Spec

**Goal:** Dar ao lojista uma visão de todas as vendas já feitas, acessível na mesma aba do botão central (Nova Venda), sem precisar entrar no perfil de cada cliente.

**Contexto:** Hoje as vendas só são visíveis dentro de `PerfilCliente.jsx` (entrando em cada cliente). A aba central "Nova Venda" (`NovaVenda.jsx`) só serve pra criar uma venda. O usuário quer ver a lista de vendas já feitas nessa mesma aba, mantendo a criação de venda tão rápida quanto hoje.

---

## Escopo

**Dentro do escopo:**
- Toggle `[Nova Venda] [Vendas]` no topo da aba central, no mesmo padrão visual dos toggles já usados no app (Fiado/À Vista em `NovaVenda`, Educado/Formal em `BotaoCobranca`).
- A aba sempre abre no lado **Nova Venda** (criar continua imediato ao tocar no botão +).
- Uma tela de lista de vendas (`Vendas`) com busca por cliente, ordenada da mais recente pra mais antiga.
- Cada venda na lista mostra: inicial do cliente em círculo, nome do cliente, itens, valor total + data, e um badge de situação (À Vista / Quitada / Em aberto).
- Tocar numa venda abre o perfil do cliente correspondente (`navegar('perfil', { clienteId })`).

**Fora do escopo:**
- Tela de detalhe de venda isolada (os detalhes continuam no perfil do cliente).
- Editar/excluir venda a partir da lista (excluir já existe dentro do perfil do cliente).
- Filtros por situação/data ou ordenação configurável (só ordenação fixa por data desc nesta rodada).
- Mudanças de schema/banco de dados.

---

## 1. Arquitetura

Novo componente wrapper `VendasTab.jsx` assume o lugar que hoje é ocupado por `NovaVenda` na aba central:

- Segura o estado do toggle (`aba`: `'nova'` | `'lista'`, default `'nova'`).
- Renderiza o toggle segmentado no topo e, abaixo dele, um dos dois:
  - `aba === 'nova'` → `<NovaVenda {...props} />` (fluxo de criar, **inalterado**).
  - `aba === 'lista'` → `<ListaVendas {...props} />` (lista nova).
- Quando `clientePreSelecionado` está definido (criar venda a partir do perfil de um cliente), força `aba = 'nova'` e não mostra o toggle — o usuário veio explicitamente pra criar.

`App.jsx` passa a renderizar `<VendasTab ... />` no lugar de `<NovaVenda ... />` para `paginaAtiva === 'nova-venda'`.

**Nota sobre reset do toggle:** no `App.jsx`, cada página é renderizada com `paginaAtiva === 'nova-venda' && <VendasTab .../>` dentro de um `AnimatePresence` com `key={paginaAtiva}`, então o `VendasTab` **desmonta ao sair da aba e remonta ao voltar**. Como o estado inicia em `useState('nova')`, o toggle sempre volta pra "Nova Venda" quando o usuário reabre a aba central pelo botão +. Não é preciso nenhum reset manual — o remonte já garante isso. Dentro da mesma sessão da aba (sem sair), o estado do toggle é preservado normalmente.

## 2. Componentes

### `VendasTab.jsx` (novo)
- **Responsabilidade:** orquestrar o toggle e escolher entre criar (`NovaVenda`) e listar (`ListaVendas`).
- **Props:** recebe todas as props que hoje vão pro `NovaVenda` (via `{...props}` do `App.jsx`), incluindo `clientes`, `vendas`, `adicionarVenda`, `navegar`, `clientePreSelecionado`, `mostrarToast`.
- **Estado:** `const [aba, setAba] = useState('nova')`.
- **Toggle:** só renderizado quando `!clientePreSelecionado`. Mesmo estilo do toggle Fiado/À Vista de `NovaVenda`: wrapper `flex gap-2 bg-surface-2 p-1 rounded-2xl`, botão ativo `bg-primary text-white shadow-sm`, inativo `text-ink-muted`.

### `ListaVendas.jsx` (novo)
- **Responsabilidade:** renderizar a lista de vendas com busca.
- **Props consumidas:** `vendas` (array), `clientes` (array, pra resolver nome/inicial do cliente a partir de `venda.clienteId`), `navegar`.
- **Estado:** `const [busca, setBusca] = useState('')`.
- **Lógica:**
  - Mapeia cada venda pro seu cliente via `clientes.find(c => c.id === venda.clienteId)`.
  - Filtra por `busca` no nome do cliente (case-insensitive).
  - Ordena por `criadaEm` desc (mais recente primeiro).
  - Estado vazio: quando não há vendas, mensagem tipo "Nenhuma venda ainda"; quando a busca não acha nada, "Nenhuma venda encontrada".
- **Cada linha (venda):**
  - Círculo com a inicial do nome do cliente (mesmo estilo de `Clientes.jsx`: `w-11 h-11 rounded-full bg-primary-50`, letra `text-primary font-bold`).
  - Nome do cliente (negrito), itens (`venda.itens`), valor total (`formatarMoeda(venda.valorTotal)`) + data (`formatarData(venda.criadaEm)`).
  - Badge de situação (ver seção 3).
  - `onClick` → `navegar('perfil', { clienteId: venda.clienteId })`.
  - Se o cliente não for encontrado (venda órfã), a linha ainda renderiza com nome de fallback "Cliente removido" e sem navegação (ou navegação desabilitada). Caso raro, mas não pode quebrar a lista.

## 3. Badge de situação

Um único badge por venda, derivado dos dados que já existem (sem novo helper de banco):

| Situação | Condição | Estilo |
|----------|----------|--------|
| À Vista | `ehVendaAvista(venda) === true` | `bg-blue-50 text-blue-700` |
| Quitada | não à vista E todas as parcelas com `pago === true` | `bg-green-50 text-green-700` |
| Em aberto | não à vista E existe parcela com `pago !== true` | `bg-red-50 text-red-600` |

Reaproveita `ehVendaAvista` de `src/utils/vendaAvista.js` (já existe) e a contagem de parcelas pagas (mesma lógica já usada em `PerfilCliente.jsx`). As classes de cor seguem exatamente os badges que `PerfilCliente.jsx` já usa, por consistência visual.

A derivação do rótulo/estilo do badge vai numa função pura pequena e testável — `statusVenda(venda) → { label, classe }` — em `src/utils/statusVenda.js`, pra permitir teste unitário sem renderizar componente.

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/statusVenda.js` | **Criar.** Função pura `statusVenda(venda)` retornando `{ label, classe }` (À Vista / Quitada / Em aberto). |
| `src/utils/statusVenda.test.js` | **Criar.** Testes das 3 situações + venda com 0 parcelas (defensivo). |
| `src/components/ListaVendas.jsx` | **Criar.** Lista de vendas com busca por cliente, badge e navegação pro perfil. |
| `src/components/VendasTab.jsx` | **Criar.** Wrapper com toggle Nova Venda / Vendas. |
| `src/App.jsx` | **Modificar.** Renderizar `VendasTab` no lugar de `NovaVenda` para `paginaAtiva === 'nova-venda'`. |

Nenhuma mudança em: `NovaVenda.jsx` (usado como está pelo wrapper), `PerfilCliente.jsx`, banco de dados.

---

## Testes

- `statusVenda.test.js` (novo):
  - venda à vista → `{ label: 'À Vista' }`
  - venda não à vista, todas as parcelas pagas → `{ label: 'Quitada' }`
  - venda não à vista, com parcela em aberto → `{ label: 'Em aberto' }`
  - venda com `parcelas` vazio/undefined (defensivo) → não quebra
- `ListaVendas.jsx` e `VendasTab.jsx`: sem teste automatizado (componentes de apresentação/navegação, seguindo a convenção atual do projeto de não testar `.jsx` de página). Verificação manual: abrir a aba, alternar o toggle, buscar por cliente, conferir badges nas 3 situações, tocar numa venda e confirmar que abre o perfil certo.

## Global Constraints

- O fluxo de criar venda (`NovaVenda.jsx`) não pode mudar de comportamento — é reaproveitado como está.
- A aba central sempre abre em "Nova Venda"; criação a partir do perfil do cliente (`clientePreSelecionado`) força o lado de criar e esconde o toggle.
- Reaproveitar `ehVendaAvista` (`src/utils/vendaAvista.js`), `formatarMoeda`/`formatarData` (`src/utils/formatadores.js`) e os estilos de badge já usados em `PerfilCliente.jsx` — não duplicar lógica nem inventar cores novas.
- Toggle no mesmo padrão visual dos toggles existentes (Fiado/À Vista).
- Sem mudanças de banco de dados.

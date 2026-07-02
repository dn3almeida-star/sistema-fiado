# Filtro na Lista de Vendas — Design Spec

**Goal:** Dar ao lojista um jeito de buscar vendas por período (dia/mês/ano) ou por produto, além da busca por nome de cliente que já existe na aba Vendas.

**Contexto:** `src/components/ListaVendas.jsx` (criado na feature "Lista de Vendas na Aba Nova Venda") tem hoje uma única caixa de busca que filtra só pelo nome do cliente. O usuário quer um ícone de filtro que permita escolher o critério de busca: Cliente (como já é), Produto, ou Período (dia, mês ou ano).

---

## Escopo

**Dentro do escopo:**
- Ícone de filtro ao lado da caixa de busca em `ListaVendas.jsx`, abrindo um menu com 3 modos: **Cliente** / **Produto** / **Período**.
- Quando **Período** é escolhido, uma segunda escolha aparece: **Dia** / **Mês** / **Ano**.
- A caixa de busca única muda de tipo conforme o modo ativo (texto para Cliente/Produto; seletor de data/mês/ano para Período).
- Indicador visual no ícone de filtro quando um modo diferente de "Cliente" (o padrão) está ativo.
- Função pura testável `vendaNoPeriodo` para a lógica de correspondência de período.

**Fora do escopo:**
- Intervalo livre "de/até" (só dia exato, mês inteiro, ou ano inteiro).
- Persistir o modo/filtro escolhido entre sessões — sempre abre no modo Cliente por padrão.
- Combinar múltiplos filtros ao mesmo tempo (ex: cliente E período simultaneamente) — é um modo por vez.
- Mudanças de schema/banco de dados.

---

## 1. Interface (`ListaVendas.jsx`)

- Um botão de ícone (funil, `lucide-react` `Filter` ou `SlidersHorizontal`) fica à direita da caixa de busca existente.
- Tocar no ícone abre um menu (dropdown ou modal simples) com as opções: **Cliente**, **Produto**, **Período**.
- Se **Período** for escolhido, o menu mostra uma segunda camada de opções: **Dia**, **Mês**, **Ano**. Escolher uma delas fecha o menu e ativa o modo.
- Escolher **Cliente** ou **Produto** fecha o menu direto (sem segunda camada).
- Estado: `const [modo, setModo] = useState('cliente')` (`'cliente' | 'produto' | 'dia' | 'mes' | 'ano'`).
- O ícone de filtro exibe um indicador (ex: ponto colorido ou preenchimento diferente) quando `modo !== 'cliente'`.
- Abrir o menu novamente e escolher **Cliente** reseta ao padrão.

### A caixa de busca, por modo:

| Modo | Controle | Placeholder/label |
|------|----------|---------------------|
| `cliente` (padrão) | `<input type="text">` | "Buscar por cliente…" (como já é hoje) |
| `produto` | `<input type="text">` | "Buscar por produto…" |
| `dia` | `<input type="date">` | — |
| `mes` | `<input type="month">` | — |
| `ano` | `<input type="number">` (4 dígitos, ex: `2026`) | — |

Ao trocar de modo, o valor da busca anterior é descartado (`useState` de valor de busca reseta para vazio) — trocar de "Produto" pra "Cliente" não deixa resíduo de busca do modo anterior.

## 2. Lógica de filtragem

**Cliente** (já existe, sem mudança): `cliente?.nome.toLowerCase().includes(busca.toLowerCase())`.

**Produto** (novo, mesmo padrão de correspondência): `venda.itens.toLowerCase().includes(busca.toLowerCase())`.

**Período** (novo): usa `venda.criadaEm` (mesmo campo já exibido/ordenado na lista) e a função pura:

```
vendaNoPeriodo(venda, granularidade, valor) → boolean
```

- `granularidade`: `'dia' | 'mes' | 'ano'`
- `valor`: string no formato correspondente ao `<input>` (`'dia'` → `'YYYY-MM-DD'`, `'mes'` → `'YYYY-MM'`, `'ano'` → `'YYYY'`)
- Compara a data local de `venda.criadaEm` (mesmo padrão de conversão ISO→local já usado em `vendaAvista.js`, para não reintroduzir bug de fuso horário) contra o `valor`:
  - `'dia'`: a data local da venda é exatamente igual a `valor`.
  - `'mes'`: os 7 primeiros caracteres da data local (`YYYY-MM`) são iguais a `valor`.
  - `'ano'`: os 4 primeiros caracteres da data local (`YYYY`) são iguais a `valor`.
- Sem `valor` (campo vazio): a função retorna `true` para toda venda (nenhum filtro aplicado ainda) — a lista mostra tudo, igual ao estado inicial dos outros modos com busca vazia.

## 3. Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/filtroVendas.js` (novo) | `vendaNoPeriodo(venda, granularidade, valor)` — função pura. |
| `src/utils/filtroVendas.test.js` (novo) | Testes: dia exato, mês certo, ano certo, fora do período, valor vazio (retorna tudo). |
| `src/components/ListaVendas.jsx` (modificar) | Ícone de filtro + menu de modos; caixa de busca troca de tipo conforme `modo`; lógica de filtragem por produto e por período. |

Nenhuma mudança em: `statusVenda.js`, `VendasTab.jsx`, `NovaVenda.jsx`, banco de dados.

---

## Testes

`filtroVendas.test.js` (novo, TDD):
- Dia exato: venda com `criadaEm` no dia buscado → `true`; dia diferente → `false`.
- Mês: vendas em dias diferentes do mesmo mês/ano → `true`; mês diferente → `false`.
- Ano: vendas em meses diferentes do mesmo ano → `true`; ano diferente → `false`.
- Valor vazio (`''`) → `true` para qualquer venda (sem filtro).
- Usa o padrão `process.env.TZ = 'America/Sao_Paulo'` + conversão local, mesmo padrão de `vendaAvista.test.js`, para não ficar sensível a fuso horário.

`ListaVendas.jsx`: sem teste automatizado (componente de apresentação, mesma convenção do projeto). Verificação manual: alternar entre os 3 modos, buscar por produto, filtrar por dia/mês/ano com vendas conhecidas e conferir que só as esperadas aparecem; conferir que o indicador do ícone aparece/some corretamente; conferir que trocar de modo limpa a busca anterior.

## Global Constraints

- Busca por Cliente mantém o comportamento atual exatamente como está (regressão zero).
- Período usa o mesmo campo `criadaEm` já exibido na lista, com conversão de data local consistente com `vendaAvista.js` (evitar bug de fuso horário já corrigido em feature anterior).
- Um modo de busca ativo por vez — sem combinação de filtros nesta rodada.
- Sem persistência entre sessões — sempre abre em modo Cliente.
- Sem mudanças de banco de dados.

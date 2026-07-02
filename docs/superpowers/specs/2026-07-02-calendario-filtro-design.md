# Calendário Visual no Filtro de Período — Design Spec

**Goal:** Substituir os campos nativos de data/mês/ano do modo Período (na aba Vendas) por um calendário visual com abas Dia/Mês/Ano, navegável por mês/ano/década.

**Contexto:** A feature "Filtro na Lista de Vendas" (já em produção) tem um modo Período que, ao escolher Dia/Mês/Ano num submenu, troca a caixa de busca por um `<input type="date"|"month"|"number">` nativo do navegador. O usuário quer, em vez disso, um calendário visual com grades de dias/meses/anos.

---

## Escopo

**Dentro do escopo:**
- Componente `SeletorPeriodo.jsx`: calendário com 3 abas (Dia/Mês/Ano), cada uma com sua própria grade e navegação.
- Substituir os `<input type="date"|"month"|"number">` do modo Período em `ListaVendas.jsx` por este componente.
- O calendário fica sempre visível enquanto o modo Período está ativo (não é um popup).
- Tocar no mesmo dia/mês/ano já selecionado desmarca o filtro (volta a mostrar todas as vendas).

**Fora do escopo:**
- Mudar o menu de escolha Cliente/Produto/Período (continua igual — só o que acontece *depois* de escolher Período muda).
- Seleção de intervalo (de/até) — continua sendo um valor por vez (um dia, um mês, ou um ano).
- Adicionar biblioteca de datas (`dayjs`, `date-fns`, etc.) — construir com `Date` nativo, seguindo o padrão já usado em `formatadores.js` e `vendaAvista.js`.
- Indicar visualmente, na grade, quais dias/meses/anos têm vendas (fora do escopo desta rodada — a grade é um seletor de data puro, não um mapa de vendas).

---

## 1. Interface (`SeletorPeriodo.jsx`)

Estrutura visual, de cima pra baixo:

```
[ Dia ] [ Mês ] [ Ano ]      ← abas
‹   Julho 2026   ›            ← navegação (muda de formato por aba)
D  S  T  Q  Q  S  S           ← grade (dias, meses, ou anos)
...
```

### Aba Dia (padrão ao entrar em Período)
- Cabeçalho: `‹ {Mês por extenso} {Ano} ›`, com setas pra mês anterior/próximo.
- Grade de 7 colunas (Dom-Sáb), células vazias antes do dia 1 conforme o dia da semana em que o mês começa.
- Dia selecionado com fundo verde (`bg-primary text-white`); dia de hoje com um contorno sutil se não for o selecionado.
- Tocar num dia → aplica o filtro (aquele dia exato). Tocar de novo no mesmo dia → desmarca.

### Aba Mês
- Cabeçalho: `‹ {Ano} ›`, com setas pra ano anterior/próximo.
- Grade de 3 colunas × 4 linhas com os 12 meses (Jan–Dez) daquele ano.
- Mês selecionado com fundo verde. Tocar num mês → aplica o filtro (aquele mês inteiro). Tocar de novo → desmarca.

### Aba Ano
- Cabeçalho: `‹ {década, ex: 2020–2029} ›`, com setas pra década anterior/seguinte.
- Grade de 3 colunas × 4 linhas com os 12 anos daquela década.
- Ano selecionado com fundo verde. Tocar num ano → aplica o filtro (aquele ano inteiro). Tocar de novo → desmarca.

### Trocar de aba
- Trocar entre Dia/Mês/Ano **não limpa** a navegação de cada uma — cada aba lembra em que mês/ano/década está posicionada (estado independente por aba).
- Trocar de aba **não muda** o filtro já aplicado por outra aba — só uma seleção (de qualquer aba) vale por vez; escolher em uma aba diferente substitui a seleção anterior (mesma regra de "um modo de busca ativo por vez" já usada no filtro).
- Ao entrar no modo Período pela primeira vez (ou reabrir depois de trocar pra outro modo), abre na aba **Dia**, no mês atual, sem nada selecionado.

## 2. Lógica pura (`src/utils/calendario.js`)

Funções puras e testáveis, sem dependência de React:

- `diasDoMes(ano, mes) → Array<number | null>`: retorna os "slots" da grade do mês na ordem de exibição — `null` para os espaços vazios antes do dia 1 (conforme o dia da semana em que o mês começa), e o número do dia (`1, 2, 3, ...`) para o resto. O array tem `offsetInicial + totalDeDiasNoMes` posições. `mes` é 1-indexado (1=Janeiro), consistente com o resto do projeto (`formatarData`, etc. já tratam mês assim).
- `nomeDoMes(mes) → string`: nome do mês por extenso em português (ex: `"Julho"`).
- `decadaDoAno(ano) → number`: início da década daquele ano (ex: `2026` → `2020`).

## 3. Integração com `ListaVendas.jsx`

- Quando `modo` é `'dia'`, `'mes'`, ou `'ano'`, o espaço onde hoje fica o `<input>` nativo passa a renderizar `<SeletorPeriodo modo={modo} valor={busca} onSelecionar={setBusca} />`.
- `SeletorPeriodo` já entrega o `valor` no MESMO formato que `vendaNoPeriodo` espera (`'YYYY-MM-DD'` para dia, `'YYYY-MM'` para mês, `'YYYY'` para ano) — a função de filtragem (`vendaNoPeriodo`, já existente) não muda.
- Tocar no mesmo valor já selecionado chama `onSelecionar('')`, que já é o "sem filtro" que `vendaNoPeriodo` trata (retorna `true` pra tudo).

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/calendario.js` (novo) | Funções puras: `diasDoMes`, `nomeDoMes`, `decadaDoAno`. |
| `src/utils/calendario.test.js` (novo) | Testes: grade de um mês de 31 dias começando numa quarta, mês de 28 dias (fevereiro não-bissexto), nomes dos 12 meses, década de anos variados. |
| `src/components/SeletorPeriodo.jsx` (novo) | Calendário com as 3 abas, navegação, e seleção/desseleção. |
| `src/components/ListaVendas.jsx` (modificar) | Troca os 3 `<input>` nativos (date/month/number) por `<SeletorPeriodo>`. |

Nenhuma mudança em: `src/utils/filtroVendas.js` (a função `vendaNoPeriodo` já recebe o formato certo), `src/utils/vendaAvista.js`, banco de dados.

---

## Testes

`calendario.test.js` (TDD):
- `diasDoMes`: julho/2026 (31 dias, começa numa quarta) — confere o número de slots vazios antes do dia 1 e a contagem total de dias.
- `diasDoMes`: fevereiro/2026 (28 dias, ano não-bissexto).
- `diasDoMes`: fevereiro/2028 (29 dias, ano bissexto) — garante que o cálculo de dias no mês usa o `Date` nativo corretamente (não uma tabela fixa que erraria bissextos).
- `nomeDoMes`: os 12 meses retornam o nome certo em português.
- `decadaDoAno`: anos no meio e nas bordas de uma década (ex: 2020, 2026, 2029) retornam o mesmo início de década (2020).

`SeletorPeriodo.jsx`: sem teste automatizado (componente de apresentação, mesma convenção do projeto). Verificação manual: navegar meses/anos/décadas nas 3 abas, selecionar e desselecionar, confirmar que o filtro realmente aplica (comparar com vendas de datas conhecidas).

## Global Constraints

- Sem biblioteca de datas nova — só `Date` nativo, mesmo padrão de `formatadores.js`/`vendaAvista.js`.
- `vendaNoPeriodo` (já existente, `src/utils/filtroVendas.js`) não muda — `SeletorPeriodo` entrega o valor no formato que ela já espera.
- Trocar de aba (Dia/Mês/Ano) preserva a navegação de cada aba independentemente.
- Entrar no modo Período sempre abre na aba Dia, mês atual, sem seleção.
- Tocar no valor já selecionado desmarca o filtro.
- Sem mudanças de banco de dados.

# Design: Relatório com gráficos

**Data:** 2026-07-01
**App:** sistema-fiado (Crediário Digital)
**Stack:** React 18 + Vite + Tailwind + Supabase

## Objetivo

Transformar a tela de Relatório num painel visual, com 4 gráficos construídos
"à mão" (CSS/SVG, sem biblioteca), reaproveitando a paleta e o dark mode do app.

## Estado atual

[Relatorio.jsx](../../../src/pages/Relatorio.jsx) mostra 4 cartões de resumo
(`CardResumo`) e um bloco "Resumo Geral" em texto. Cada parcela tem
`{ valor, vencimento, pago, pagoEm }` (datas ISO `YYYY-MM-DD`).

## Escopo

Adicionar 4 gráficos. Manter os cartões de resumo existentes. **Fora de escopo:**
exportar gráfico, filtros de período customizados, comparação ano-a-ano,
biblioteca de gráficos.

## Abordagem

Gráficos "à mão" com CSS/SVG (Opção A) — leves, sem dependência nova, com a cara
custom do app. Barras = divs com altura/largura proporcionais; donut = SVG com
`stroke-dasharray`.

## Os 4 gráficos

### 1. Recebido por mês (últimos 6 meses)
- Barras verticais, uma por mês (mês atual + 5 anteriores), em ordem crescente.
- Valor = soma das parcelas pagas cujo `pagoEm` cai naquele mês.
- Parcelas pagas sem `pagoEm` são ignoradas (não há como posicioná-las) —
  consistente com o cálculo atual de "recebido no mês".
- Altura proporcional ao maior valor da janela. Mês atual destacado (cor primary
  cheia; demais em primary translúcido).

### 2. A receber por mês (mês atual + próximos 5)
- Barras verticais em âmbar (accent), uma por mês.
- Valor = soma das parcelas **não pagas** cujo `vencimento` cai naquele mês.
- Parcelas vencidas (vencimento anterior ao mês atual) são somadas ao **mês
  atual** (para não perder valor do total).

### 3. Top devedores
- Barras horizontais dos 5 clientes com maior saldo devedor (`saldo > 0`),
  ordem decrescente. Cada linha: nome do cliente + valor; largura da barra
  proporcional ao maior devedor.
- Reaproveita `resumoCliente(vendas, clienteId, hojeISO)` (já existe) para o saldo.

### 4. Pago vs em aberto
- Donut (SVG) com a proporção entre total pago e total em aberto (soma de todas
  as parcelas, tempo todo). Legenda com os dois valores e o percentual pago.

## Estrutura técnica

### Função pura testável

`metricasRelatorio(vendas, clientes, hojeISO)` em
`src/utils/metricasRelatorio.js` → objeto:

```
{
  recebidoPorMes:  [{ mes: 'YYYY-MM', label: 'jul', valor }...],  // 6, crescente
  aReceberPorMes:  [{ mes: 'YYYY-MM', label: 'jul', valor }...],  // 6, crescente
  topDevedores:    [{ cliente, saldo }...],                       // até 5, desc
  pagoVsAberto:    { pago, aberto }
}
```

- `hojeISO` (`YYYY-MM-DD`) injetada para testabilidade.
- Janela de meses derivada por aritmética de ano/mês inteiros (sem `Date` global
  nas contas), a partir do mês atual (`hojeISO.slice(0,7)`).
- `label` = mês abreviado pt-BR de uma tabela fixa
  `['jan','fev',...,'dez']` (sem locale/timezone), indexado por mês-1.

### Formatação compacta

Helper `formatarCompacto(valor)` em `src/utils/formatadores.js` para rótulos de
barra (ex.: `1234` → "1,2k"; `350` → "350"). Testável.

### Componentes de gráfico (presentacionais, dark-mode safe)

- `src/components/GraficoBarras.jsx` — barras verticais. Props: `dados`
  (`[{ label, valor }]`), `cor` (classe/estilo), `destacarUltimo` (bool, p/ mês
  atual). Escala pelo maior valor; barra some/placeholder quando valor 0.
- `src/components/BarrasHorizontais.jsx` — lista de barras horizontais. Props:
  `itens` (`[{ label, valor }]`), escala pelo maior valor.
- `src/components/Donut.jsx` — SVG donut. Props: `partes`
  (`[{ valor, cor }]`) e conteúdo central opcional.

Cada gráfico entra num "card" (`bg-surface rounded-2xl shadow-sm p-4`) com título,
seguindo o padrão visual da tela.

### Integração em Relatorio.jsx

- Chama `metricasRelatorio` via `useMemo`.
- Renderiza os cartões de resumo existentes + os 4 gráficos, cada um no seu card
  com título. Estado vazio (`vendas.length === 0`) permanece.

## Critérios de sucesso

1. Os 4 gráficos aparecem com dados corretos, no tema claro e escuro.
2. Recebido/A receber agrupam por mês corretamente (parcelas vencidas somadas ao
   mês atual em "A receber").
3. Top devedores mostra os 5 maiores saldos em ordem decrescente.
4. Donut reflete a proporção pago/aberto.
5. `metricasRelatorio` e `formatarCompacto` cobertos por testes.
6. Sem mudança nos dados/fluxos; cartões de resumo existentes preservados.

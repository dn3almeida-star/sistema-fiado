# Design: Valor editável ao confirmar pagamento de parcela

**Data:** 2026-07-03
**App:** sistema-fiado (Crediário Digital / Iran Utilidades)
**Stack:** React 18 + Vite + Tailwind 3 + Framer Motion + Supabase

## Objetivo

Permitir que o lojista registre o valor **realmente pago** por uma parcela,
quando o cliente paga um valor diferente do combinado. A diferença (falta ou
sobra) é redistribuída automaticamente para a próxima parcela em aberto, de
modo que o saldo devedor total permaneça correto.

## Comportamento decidido

- **Pagou MENOS que a parcela:** a parcela fecha (paga) com o valor recebido; a
  diferença que faltou é **somada na próxima parcela ainda não paga**.
- **Pagou MAIS que a parcela:** a parcela fecha com o valor recebido; o
  excedente **abate da próxima parcela ainda não paga**.
- **Não há próxima parcela em aberto** (era a última):
  - Faltou (diferença > 0): cria uma **parcela extra nova**, com vencimento
    **1 mês após a última parcela** e valor igual à diferença. O `valorTotal`
    da venda **aumenta** para refletir essa parcela.
  - Sobrou (diferença < 0): apenas registra o pagamento maior. **Não** gera
    crédito nem parcela negativa.
- **Pagou exatamente o valor combinado:** `diferença = 0`, nenhuma outra
  parcela é tocada — comportamento idêntico ao atual.

## Fora de escopo (não faremos agora)

- **Pagamento parcial que reabre o restante** (deixar parte da parcela em
  aberto em vez de fechá-la) — descartado, muda o cálculo de saldo em todo o app.
- **Reverter a redistribuição ao desmarcar pagamento** — ver Casos de borda.
- **Crédito/haver do cliente** quando paga a mais na última parcela.

---

## Arquitetura

A lógica de redistribuição é uma **função pura testável**, separada da UI,
seguindo o padrão do projeto (`calcularParcelas.js`, `resumoCliente.js`, cada
um com seu `.test.js`).

### 1. `src/utils/pagamentoParcela.js` (novo)

```
aplicarPagamentoParcela(parcelas, numeroParcela, valorPago, agoraISO)
  → { parcelas: Parcela[], parcelaExtraCriada: boolean, diferenca: number }
```

Algoritmo:

1. Localiza a parcela pelo `numero`. `diferenca = parcela.valor - valorPago`.
2. Marca a parcela paga: `valor = valorPago`, `pago = true`, `pagoEm = agoraISO`.
3. Se `diferenca !== 0`, localiza a **próxima parcela não paga** com
   `numero > numeroParcela` (a de menor número entre as não pagas seguintes):
   - **Encontrou:** `proxima.valor = max(0, proxima.valor + diferenca)`.
     (falta soma; sobra, como `diferenca` é negativa, subtrai.) O `max(0, …)`
     protege o caso raro de pagar tanto a mais que zeraria a próxima parcela:
     ela vai a 0 (não fica negativa); qualquer excedente além disso é
     **ignorado nesta versão** (não cascateia para parcelas seguintes).
   - **Não encontrou** e `diferenca > 0`: cria parcela extra:
     - `numero` = maior número atual + 1
     - `vencimento` = 1 mês após o maior vencimento existente
     - `valor` = `diferenca`, `pago = false`, `pagoEm = null`
   - **Não encontrou** e `diferenca < 0`: nada a fazer.
4. Retorna as parcelas novas (ordenadas por número) e os flags.

Observações:
- Trabalha sobre cópias (imutável); não muta a entrada.
- Usa `agoraISO` como parâmetro (não `new Date()` interno) para ser testável.
- Arredonda valores a 2 casas para evitar lixo de ponto flutuante.

### 2. `src/hooks/useVendas.js` (modificado)

`marcarParcelaPaga(vendaId, numeroParcela, valorPago)` — novo terceiro
parâmetro:

- Se `valorPago` for `undefined`, assume o valor atual da parcela
  (retrocompatível com qualquer chamada existente).
- Chama `aplicarPagamentoParcela(...)`.
- Persiste as novas parcelas via `atualizarParcelas`.
- Se `parcelaExtraCriada`, também atualiza `valor_total` da venda
  (`valorTotal + diferenca`) na mesma escrita ao Supabase.

### 3. `src/components/ModalConfirmarPagamento.jsx` (novo)

Modal dedicado, com campo de valor **editável** pré-preenchido com o valor da
parcela. Não altera o `ModalConfirmar.jsx` genérico (usado também para "remover
venda" e "excluir cliente"), para não misturar responsabilidades.

- Props: `aberto`, `parcela`, `onConfirmar(valorPago)`, `onCancelar`.
- Campo numérico (inputMode decimal), botões Cancelar / Confirmar.
- Segue a identidade visual atual (mono nos valores, tokens de tema).
- Dispara `haptic()` ao confirmar, como o modal genérico.

### 4. `src/pages/PerfilCliente.jsx` (modificado)

Troca o `ModalConfirmar` de pagamento pelo novo
`ModalConfirmarPagamento`, repassando o valor editado para
`marcarParcelaPaga(vendaId, numero, valorPago)`. Os outros dois usos do
`ModalConfirmar` (remover venda, excluir cliente) permanecem intactos.

---

## Casos de borda

- **Desfazer pagamento** (`desmarcarParcelaPaga`, já existe): desfaz apenas
  `pago`/`pagoEm` daquela parcela. **Não reverte** a redistribuição já feita na
  parcela seguinte — rastrear e desfazer o encadeamento é arriscado e fora de
  escopo. **Limitação conhecida e documentada.**
- **Valor pago = combinado:** `diferença = 0`, nenhuma parcela tocada.
- **Valor pago inválido** (vazio, ≤ 0): bloqueia a confirmação, como as demais
  validações do app.
- **Pagamento fora de ordem:** a "próxima em aberto" é por `numero`, não
  posicional — funciona mesmo se parcelas anteriores ainda estiverem abertas.

## Impacto downstream (verificado, sem mudança necessária)

- **Relatórios** (`metricasRelatorio.js`): usam `p.valor` da parcela paga como
  valor recebido → passam a refletir o valor real pago automaticamente. ✓
- **PDF do carnê** (`gerarPDF.js`) e **saldo do cliente** (`resumoCliente.js`):
  somam `p.valor` → continuam corretos com os valores redistribuídos. ✓

## Testes

`src/utils/pagamentoParcela.test.js` cobrindo:

1. Valor exato → nenhuma parcela além da paga muda.
2. Pagou menos → diferença soma na próxima em aberto.
3. Pagou mais → excedente abate da próxima em aberto.
4. Faltou na última parcela → cria parcela extra (vencimento +1 mês, valor = diferença).
5. Sobrou na última parcela → sem crédito, sem parcela nova.
6. Pagamento fora de ordem → escolhe a próxima por número, não posicional.
7. Imutabilidade → a entrada não é mutada.

## Princípios

- **Lógica pura isolada e testada** antes de tocar na UI.
- **Retrocompatível:** `marcarParcelaPaga` sem `valorPago` mantém o comportamento atual.
- **Soma total consistente:** a diferença nunca "some" — só se desloca; a
  única exceção é a parcela extra, que aumenta o total de propósito.

## Critérios de sucesso

1. Confirmar pagamento abre modal com valor editável pré-preenchido.
2. Pagar menos → parcela fecha com o valor pago e a próxima aumenta pela diferença.
3. Pagar mais → parcela fecha com o valor pago e a próxima diminui.
4. Falta na última parcela → nova parcela criada com vencimento +1 mês e total atualizado.
5. Pagar o valor exato → comportamento idêntico ao de hoje.
6. Todos os testes da nova função passam; build e suíte existente continuam verdes.

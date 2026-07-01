# Design: Filtros de situação na tela de Clientes

**Data:** 2026-07-01
**App:** sistema-fiado (Crediário Digital)
**Stack:** React 18 + Vite + Tailwind + Supabase

## Objetivo

Adicionar filtros por situação do cliente na tela de Clientes, sobre a busca
por texto que já existe, e ordenar a lista pelo maior devedor. Ajuda o lojista
a priorizar quem cobrar.

## Estado atual

- [Clientes.jsx](../../../src/pages/Clientes.jsx) já tem busca por texto (nome,
  bairro, endereço) via estado `busca` e `clientesFiltrados`.
- `debitoCliente(clienteId)` já soma as parcelas não pagas de um cliente.
- A lista renderiza cada cliente com nome, bairro e saldo devedor.

## Escopo

Adicionar: filtros de situação (pílulas), contagem por filtro, ordenação fixa
por maior devedor. **Fora de escopo:** seletor de ordenação (só maior devedor),
mudanças no cadastro, gráficos, WhatsApp.

## Comportamento

- Abaixo da busca, uma fileira horizontal de pílulas de filtro:
  **Todos · Em atraso · Em dia · Quitados**.
- Cada pílula exibe a contagem de clientes naquela situação (ex.: "Em atraso 3").
- Tocar numa pílula filtra a lista; a pílula ativa fica destacada (verde/primary),
  as inativas discretas (tokens de superfície/borda). Padrão inicial: **Todos**.
- A lista é sempre ordenada por **maior saldo devedor primeiro**, dentro do
  filtro selecionado.
- Busca por texto e filtro de situação atuam em conjunto (AND).
- Estado vazio adapta ao filtro ativo (ex.: "Nenhum cliente em atraso").

## Definição das situações

Calculadas a partir das vendas/parcelas do cliente:

- **Quitado** — nenhuma parcela em aberto (saldo devedor = 0).
- **Em atraso** — existe ao menos uma parcela não paga cujo vencimento já passou
  (`diasAteVencimento(vencimento) < 0`).
- **Em dia** — tem saldo em aberto, mas nenhuma parcela vencida.

Ordem de precedência ao classificar: se saldo = 0 → Quitado; senão, se há
parcela vencida → Em atraso; senão → Em dia.

## Estrutura técnica

### Função pura testável

Criar `resumoCliente(vendas, clienteId, hojeISO)` em
`src/utils/resumoCliente.js`:

- Entrada: array de vendas, id do cliente, data de hoje (ISO `YYYY-MM-DD`,
  injetada para testabilidade).
- Saída: `{ saldo: number, emAtraso: boolean, situacao: 'quitado' | 'atraso' | 'em_dia' }`.
- `saldo` = soma das parcelas não pagas do cliente.
- `emAtraso` = existe parcela não paga com vencimento < hoje.
- `situacao` derivada pela precedência acima.

Testes unitários (Vitest) cobrindo: cliente sem vendas (quitado, saldo 0);
cliente com parcela futura não paga (em_dia); cliente com parcela vencida não
paga (atraso); cliente com todas pagas (quitado).

### Integração em Clientes.jsx

- Novo estado `filtro` ('todos' padrão).
- `useMemo` que, a partir de `clientes` e `vendas`, monta um array
  `[{ cliente, saldo, situacao }]` chamando `resumoCliente` uma vez por cliente.
- A partir desse array: calcular as contagens por situação (para as pílulas),
  aplicar busca de texto + filtro de situação, e ordenar por `saldo` desc.
- Componente de pílulas de filtro: renderiza as 4 opções com rótulo + contagem;
  usa tokens de cor (dark-mode safe) e `whileTap` consistente com o resto.
- Estado vazio (`EstadoVazio` já existente) com texto conforme o filtro.

### Reaproveitamento

- Usa `diasAteVencimento` de `formatadores.js`.
- Usa `EstadoVazio`, tokens de cor, e `staggerContainer/fadeInUp` já existentes.

## Critérios de sucesso

1. As 4 pílulas aparecem com contagens corretas.
2. Selecionar um filtro mostra só os clientes daquela situação.
3. Busca + filtro funcionam juntos.
4. Lista ordenada por maior devedor.
5. `resumoCliente` classifica corretamente as 3 situações (testes passando).
6. Sem mudança nos fluxos de cadastro; dark mode e visual consistentes.

# Spec — Paywall / enforcement do plano (Grátis × Pago)

## Contexto
O cadastro já cria conta com `profiles.plano = 'teste'` e `teste_termina_em`
(= data SP + 30). Mas **nada é gateado**: `plano`/`teste_termina_em` nem vêm no
SELECT do `useProfile`, e todas as features estão liberadas pra todo mundo. Sem
enforcement não há como monetizar. O modelo de preço está fechado no
`gtm-sistema-fiado.md` (seção 3).

## Modelo (do GTM)
| | Grátis "Caderno" | Pago "Caderno + Cobrador" — R$ 19,90/mês |
|---|---|---|
| Clientes cadastrados | até **20** | ilimitados |
| Anotar vendas/pagamentos, total na rua, histórico | ✅ | ✅ |
| Cobrança pronta 1-toque no WhatsApp | ❌ | ✅ |
| Comprovante PDF | ❌ | ✅ |
| Relatório do dia | ❌ | ✅ |

- **Teste = 30 dias do plano pago, sem cartão.** Ao acabar sem pagar → vira
  **Grátis** (não é bloqueio total; mantém os dados).
- **Pagamento = Pix manual** nesta versão: o app trava e mostra "Assine — Pix";
  o dono confirma o Pix e marca `plano='pago'` na mão. Sem gateway (decisão de
  produto: no volume atual, 8-12 pagantes/mês, é o certo).

## Decisões travadas (com o usuário)
1. **Pagamento por gateway (não Pix manual).** O usuário recusou expor o Pix
   pessoal. A cobrança será por checkout de gateway (Mercado Pago/Stripe) em
   **spec própria**. Nesta entrega o modal de upgrade só mostra benefícios +
   preço; o botão "Assinar" é placeholder (`onAssinar` → toast) até o gateway.
   *(Decisão anterior de "Pix manual" foi revertida.)*
2. **Expira com >20 clientes** (o teste dava ilimitado): **manter tudo visível e
   editável, só bloquear cadastrar o 21º+** enquanto acima do limite. Nunca
   esconder/apagar dado.
3. **Contas reais → `pago` permanente.** Conta do pai (`joseiram02@hotmail.com`,
   `3093bd55…`) e conta do fundador (`dn3almeida@gmail.com`, `c69e3937…`) marcadas
   `pago` via MCP. A conta de teste "Mariana fiado" (`773a79d3…`) foi **excluída**
   a pedido do usuário (dados + auth user). Resultado: só existem 2 contas, ambas
   `pago` → ninguém é travado quando o enforcement for pro ar.

## Objetivos
- Função pura `src/utils/planos.js` (TDD) que traduz `profile`+`hojeISO` em
  estado e entitlements — a lógica toda mora aqui; UI é casca (regra 3).
- `useProfile` passa a trazer `plano` e `testeTerminaEm` no SELECT.
- Gatear na UI: cobrança 1-toque, comprovante PDF, relatório do dia, e o
  cadastro do 21º cliente no Grátis.
- Banner de contagem do teste ("faltam N dias") e, no Grátis, chamada pra
  assinar.
- Modal de upgrade reusável com benefícios + preço (checkout do gateway virá
  em spec própria).
- Ajustar contas reais para `pago` e remover a conta de teste, via Supabase MCP.

## Não-objetivos
- Integração de pagamento automática (gateway Pix, webhooks). Spec futura.
- Cobrança recorrente / controle de vencimento da assinatura paga (por ora
  `pago` é booleano-estado, sem data de expiração do pago).
- Âncora anual R$199 (só o mensal R$19,90 aparece na tela de upgrade por ora).
- Push. Mudanças no lembrete-diario.
- Nenhuma migração de schema nova: `plano` é `text`, os valores `'gratis'` e
  `'pago'` já cabem; nada a alterar no banco além do UPDATE da conta do pai.

## Design por componente
- **`src/utils/planos.js`** (puras):
  - `statusPlano(profile, hojeISO) → { estado, diasRestantesTeste, entitlements }`
    - `estado`: `'teste' | 'gratis' | 'pago'` (efetivo).
    - `diasRestantesTeste`: inteiro ≥0 quando `estado==='teste'`, senão `null`.
    - `entitlements`: `{ cobranca, pdf, relatorio, clientesIlimitados, limiteClientes }`.
    - Regras (comparação de datas ISO por string + `diasEntre` no padrão
      `filaCobranca`):
      | `profile.plano` | condição | estado | pagas | limiteClientes |
      |---|---|---|---|---|
      | `'pago'` | — | pago | ON | `null` |
      | `'teste'` | `hoje ≤ teste_termina_em` | teste | ON | `null` |
      | `'teste'` | `hoje > teste_termina_em` | gratis | OFF | 20 |
      | `'gratis'` | — | gratis | OFF | 20 |
      | ausente/desconhecido | fallback seguro | gratis | OFF | 20 |
  - `podeAdicionarCliente(status, qtdAtual) → bool` (ilimitado → sempre true;
    senão `qtdAtual < limiteClientes`).
  - Constantes exportadas: `LIMITE_CLIENTES_GRATIS = 20`, `PRECO_MENSAL_LABEL`.
- **`useProfile.js`** — adicionar `plano, testeTerminaEm:teste_termina_em` aos
  dois SELECTs (recarregar + salvarProfile) e ao upsert quando aplicável.
- **`App.jsx`** — computa `planoStatus = statusPlano(profile, hojeISO())`
  (reusar o helper de "hoje" já existente no front) e injeta em `props`
  (`planoStatus`, e um `abrirUpgrade()` que seta um estado de modal global).
- **Gates** (UI, decidindo por `planoStatus.entitlements`):
  - `BotaoCobranca.jsx` — prop `bloqueado` (= `!cobranca`); quando bloqueado, o
    clique chama `onUpgrade()` em vez de compor a mensagem. Usado em
    `PerfilCliente`, `CobrancasHoje`, `ModoCobranca`.
  - `PerfilCliente.jsx` — botão de comprovante PDF chama `onUpgrade()` se `!pdf`.
  - `Relatorio.jsx` — se `!relatorio`, renderiza estado bloqueado (cadeado +
    CTA assinar) no lugar dos gráficos.
  - `Clientes.jsx` — se `!podeAdicionarCliente(status, clientes.length)`, o botão
    "novo cliente" vira CTA de upgrade; mostra "20/20 clientes no Grátis".
- **`BannerPlano.jsx`** (novo) — no topo do Dashboard: em `teste` mostra "Teste
  grátis: faltam N dias"; em `gratis` mostra "Plano Grátis — assine pra
  desbloquear a cobrança"; em `pago` não aparece.
- **`ModalUpgrade.jsx`** (novo) — benefícios do pago + preço; botão "Assinar"
  chama `onAssinar` (placeholder → toast; será o checkout do gateway). Sem Pix.
  Reusado por todos os gates.
- **Contas (Supabase MCP)** — `update profiles set plano='pago'` para
  `3093bd55…` (pai) e `c69e3937…` (fundador); `delete` completo da conta
  `773a79d3…` (Mariana, teste) em vendas→clientes→profiles→auth.users.

## Critérios de aceite
1. `statusPlano`/`podeAdicionarCliente` cobertos por testes (trial ativo, trial
   expirado→grátis, grátis, pago, fallback, limite de clientes, dias restantes,
   dia-limite inclusivo). Suíte inteira verde.
2. Conta em `teste` dentro do prazo: tudo liberado; banner com dias corretos.
3. Conta `gratis` (ou teste expirado): cobrança/PDF/relatório mostram upgrade;
   cadastro do 21º cliente bloqueado; clientes existentes intactos.
4. Conta `pago`: nada travado, sem banner.
5. Conta do pai marcada `pago` e verificada por SQL.
6. `npm run build` limpo; deploy não faz parte desta spec (fica pro usuário
   pedir).

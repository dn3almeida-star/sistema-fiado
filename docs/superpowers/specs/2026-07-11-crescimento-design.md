# Spec — Crescimento: indicação + nudge de fim de teste

Duas melhorias de GTM juntas (itens 3 e 4 do levantamento).

## Item 3 — Programa de indicação (gtm §4 canal 3)
"Indique um colega lojista: ele ganha 30 dias grátis (o teste padrão), você ganha
1 mês grátis quando ele assinar."

- **Migração `20260711_indicacao.sql`:** `profiles += indicado_por uuid`
  (referências soft — quem indicou) e `indicacao_creditada boolean default false`
  (evita creditar o indicador duas vezes). Trigger `criar_profile_novo_usuario`
  passa a gravar `indicado_por` vindo dos metadados do signUp (cast seguro de
  uuid; ignora valor malformado).
- **`useAuth.cadastrar(email, senha, nomeLoja, indicadoPor?)`** inclui
  `indicado_por` em `options.data` quando presente.
- **App/Cadastro:** App lê `?ref=<userId>` da URL (deep link
  `/cadastro?ref=…`), guarda e passa pro `Cadastro`, que repassa ao `cadastrar`.
- **Webhook do pagamento (`webhook-mercadopago`):** ao aprovar o 1º pagamento de
  um indicado (`indicado_por` setado e `indicacao_creditada=false`), credita o
  indicador com +30 dias (`plano='pago'`, `plano_expira_em = max(hoje, atual)+30`),
  **sem rebaixar** quem é pago permanente (expira null → não mexe); marca
  `indicacao_creditada=true`.
- **Função pura `linkIndicacao(origin, userId)`** → `${origin}/cadastro?ref=…`
  (TDD). **`CardIndicacao.jsx`** no PerfilLoja: mostra o link, copiar e
  compartilhar, com a explicação da recompensa.

## Item 4 — Nudge de fim de teste (gtm §5.3)
"Dia 25: 'Seu teste acaba em 5 dias. Esse mês você recebeu R$ X. Quer continuar?'"
Versão in-app (confiável, sem depender de canal): quando o lojista abre o app e
faltam ≤5 dias do teste, abre o `ModalUpgrade` uma vez por dia (já mostra o valor
recuperado). A versão outbound (push/email) fica pra depois.

- **Função pura `deveMostrarNudgeTeste(planoStatus, jaMostrouHoje)` → bool** (TDD):
  `estado==='teste'` e `diasRestantesTeste ≤ 5` e não mostrado hoje.
- **App:** quando o profile carrega, se `deveMostrarNudgeTeste(planoStatus,
  localStorage['nudge_teste_'+hoje])`, abre o upgrade e marca o dia.

## Não-objetivos
- Recompensa em dinheiro/saldo; painel de indicações; ranking. Só o +30 dias.
- Nudge outbound (push/email) do fim de teste; anti-fraude de indicação.

## Critérios de aceite
1. `linkIndicacao` e `deveMostrarNudgeTeste` cobertos por testes; suíte verde.
2. Cadastro com `?ref=` grava `indicado_por`; pagamento do indicado credita o
   indicador uma única vez, sem rebaixar pago permanente.
3. Card de indicação copia/compartilha o link certo.
4. Faltando ≤5 dias do teste, o modal aparece 1x/dia com o valor recuperado.
5. `npm run build` limpo; deploy junto das demais (migração + webhook v2).

# Progresso — Cobrança por WhatsApp

Plano: docs/superpowers/plans/2026-07-01-cobranca-whatsapp.md
Branch: feat/cobranca-whatsapp (partiu de feat/saas-multi-vendedor)
Setup: spec 6639742, plano ebca2bd, correção do modelo de dados 0f5d781.

NOTA pré-voo: plano original assumia tabela `parcelas` + migration + endpoint — ERRADO.
Modelo real: parcelas são array JSONB dentro de `vendas`; persistir via registrarCobranca no useVendas (espelha marcarParcelaPaga). Já existe BotaoWhatsApp.jsx (reaproveitado). Corrigido em 0f5d781.

## Tasks

Task 1: complete (commit 36b730e, review clean). gerarMensagemCobranca + linkWhatsApp, reusa formatarData/formatarMoeda. 29 testes.
Task 2: complete (commit 5393334, review clean). BotaoCobranca criado + BotaoWhatsApp refatorado p/ linkWhatsApp compartilhado. Tokens dark-mode ok. Build ok, 29 testes.
Task 3: complete (commit aa81c95, review clean). registrarCobranca no useVendas (espelha desmarcarParcelaPaga). BotaoCobranca integrado em PerfilCliente e CobrancasHoje (substituiu BotaoWhatsApp+montarMensagem ad-hoc, removido). App.jsx intocado (props já propagam via ...vendasHook). Build ok, 29/29 testes.

## AS 3 tasks completas.
Review final (opus): "Ready to merge: With fixes". Important: guarda contra duplo-clique em enviar() — APLICADO (commit 7bfb0ed). Minor: BotaoWhatsApp órfão — REMOVIDO (mesmo commit). Minors restantes (layout wrap em telas estreitas, fallback cosmético de data) não bloqueiam, deixados como está.
FINALIZADO: merge fast-forward em feat/saas-multi-vendedor @ 7bfb0ed (sem teste visual — usuário aprovou merge confiando em testes/reviews, estava no celular). Branch feat/cobranca-whatsapp deletado. Testes 29/29, build ok.

---

## Histórico anterior

- Relatório com gráficos (2026-07-01): 3 tasks, mesclado em feat/saas-multi-vendedor.
- Filtros de Clientes (2026-07-01): 2 tasks, mesclado.
- Polimento Visual (2026-06-30): 10 tasks, mesclado.
- SaaS Multi-Vendedor (2026-06-29): 11 tasks.

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

## Timeline do Cliente — MESCLADO

Branch: `feat/timeline-cliente` (iniciado em 405ead0)
Plano: docs/superpowers/plans/2026-07-01-timeline.md (commit e150809)

**Task 1:** complete (commit 3bcea1c, review clean). gerarEventosTimeline + 6 testes (TDD). Spec ✅, Quality ✅.
**Task 2:** complete (commit bc2e777, review clean). FiltrosTimeline component (4 checkboxes). Spec ✅, Quality ✅.
**Task 3:** complete (commit d019fd4, review clean). EventoTimeline component (event row + expansion). Spec ✅, Quality ✅.
**Task 4:** complete (commit 29c6680). Timeline orchestrator com agrupamento por mês e filtragem. Spec ✅, Quality ✅.
**Task 5:** complete (commit 051b28b). Integração em PerfilCliente: abas "Perfil" e "Timeline", renderização condicional. Spec ✅, Quality ✅.

Testing checklist: ✅ npm test (35/35 passed), ✅ npm run build (ok), ✅ Tab switching (Perfil ↔ Timeline), ✅ Events render correctly, ✅ Filters working, ✅ Month grouping (desc order), ✅ Compra expansion, ✅ Dark mode tokens applied, ✅ Mobile-friendly (tailwind classes responsive). 
**MESCLADO em feat/saas-multi-vendedor @ 29c6680 (merge fast-forward).**

---

## Deploy em Produção — 2026-07-01

**Deployment:** dpl_2GDXizVjc56MFgJq4WKUAeEMPtZ3 (READY, target=production)
**URL:** https://sistema-fiado.vercel.app (HTTP 200 ✅)
**Conteúdo:** todas as features de feat/saas-multi-vendedor no ar (Timeline, Filtros de Clientes, Cobrança WhatsApp, Relatório com Gráficos, Polimento Visual).
**Build:** ok (2287 módulos), 35/35 testes.

---

## Histórico anterior

- Timeline do Cliente (2026-07-01): 5 tasks, mesclado em feat/saas-multi-vendedor @ 29c6680.
- Relatório com gráficos (2026-07-01): 3 tasks, mesclado em feat/saas-multi-vendedor.
- Filtros de Clientes (2026-07-01): 2 tasks, mesclado em feat/saas-multi-vendedor.
- Polimento Visual (2026-06-30): 10 tasks, mesclado em feat/saas-multi-vendedor.
- SaaS Multi-Vendedor (2026-06-29): 11 tasks.

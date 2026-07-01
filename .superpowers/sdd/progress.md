# Progresso — Venda à Vista — MESCLADO

Plano: docs/superpowers/plans/2026-07-01-venda-avista.md (commit 2cfb00c)
Spec: docs/superpowers/specs/2026-07-01-venda-avista-design.md
Branch: feat/venda-avista (partiu de feat/saas-multi-vendedor)
Pre-flight: corrigida duplicação de JSX (campo Valor Total) na Task 2 do plano antes de despachar (commit f85f4b1).

## Tasks

Task 1: complete (commit adc9e2f, review clean). criarParcelaAvista + ehVendaAvista, 6 testes (TDD). Spec ✅, Quality ✅. Minors (não bloqueiam, ver review): ehVendaAvista não trata parcelas/criadaEm malformados (mesmo gap do pseudocódigo do brief); sem teste de valorTotal=0.
Task 2: complete (commit d2d6d76, review clean). Toggle Fiado/À Vista em NovaVenda, campoValorTotal IIFE evita duplicação JSX. Fluxo fiado intocado (verificado linha a linha pelo reviewer). Spec ✅, Quality ✅. Minor: campos entrada/parcelas não resetam ao trocar de modo (cosmético, sem impacto no payload). ⚠️ apontado pelo reviewer: verificar manualmente se hoje() e criadaEm (timestamp do servidor) batem na integração com ehVendaAvista (Task 3) — sem visual/browser testing feito ainda nesta task (implementer não tinha display).
Task 3: complete (commit fdeb9ad, review clean). Badge "À Vista" em PerfilCliente, shape do venda compatível com ehVendaAvista confirmado via linhas de contexto. Fiado badges preservados byte-a-byte. Spec ✅, Quality ✅. Minor (para revisão final de branch): badges usam cores Tailwind literais (bg-blue-50 etc) em vez de tokens semânticos — mas segue convenção já existente nos badges vermelho/verde (não introduzido por esta task). Visual/dark-mode ainda não verificado manualmente por nenhum subagente (sem display).

## Revisão Final de Branch (opus)
Encontrou 1 Critical + 1 Important (achado só visível olhando a branch inteira, nenhuma task isolada revelaria):
- CRITICAL: ehVendaAvista comparava vencimento local (hoje(), setado no NovaVenda) com criadaEm.slice(0,10) (UTC, timestamptz default now() do Postgres). Em horário noturno no Brasil (UTC-3), o dia UTC vira o dia seguinte → badge "À Vista" falhava silenciosamente.
- IMPORTANT: ehVendaAvista sem guarda para dado malformado (parcelas undefined, criadaEm ausente) → TypeError no render do histórico do cliente.
FIX aplicado (commit 6bb2c75): dataLocal() converte criadaEm pra data local (mesma lógica do hoje()) antes de comparar; guardas com optional chaining. 3 testes novos (regressão de fuso horário com TZ forçado America/Sao_Paulo + 2 de dado malformado). 44/44 testes, build ok.
RE-REVIEW (opus): ambos os achados confirmados como resolvidos, sem novos problemas. **Ready to merge: Yes.**

**MESCLADO em feat/saas-multi-vendedor @ 336b990 (fast-forward). Branch feat/venda-avista deletada. 44/44 testes, build ok.**

---

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

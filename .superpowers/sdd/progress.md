# Progresso — Lista de Vendas na Aba Nova Venda

Plano: docs/superpowers/plans/2026-07-02-lista-vendas.md (base 3a6f509)
Spec: docs/superpowers/specs/2026-07-02-lista-vendas-design.md
Branch: feat/saas-multi-vendedor (mesma das features anteriores da sessão)
Pre-flight: scan limpo, sem conflitos no plano.

## Tasks

Task 1: complete (commit 3d747d2, review clean). statusVenda(venda) → { label, classe } (À Vista/Quitada/Em aberto), reusa ehVendaAvista, cores idênticas às de PerfilCliente.jsx. Reviewer traçou as 5 fixtures contra ehVendaAvista e confirmou que o caso Quitada é genuinamente não-à-vista (trip no length!==1). 5 testes focados + 56 na suíte. Spec ✅, Quality ✅. Minor: cobertura de pago:undefined e entrada>0 poderia ser mais ampla (comportamento correto, baixo risco).
Task 2: complete (commit 0735003, review clean). ListaVendas.jsx: busca por cliente (case-insensitive, null-safe), ordenação criadaEm desc (comparador confirmado correto), badge via statusVenda, tocar → navegar('perfil', {clienteId}) do cliente da própria venda (disabled se cliente removido), 2 estados vazios distintos. Pipeline map/filter/sort sem mutar props. Reviewer traçou tudo à mão (sem browser). Build ok, 56 testes. Spec ✅, Quality ✅. Minors: find() em map O(n·m) aceitável na escala; criadaEm inválido geraria NaN no sort (brief assume ISO válido). Visual ainda não verificado por ninguém.
Task 3: complete (commit 379ddc5, review clean). VendasTab.jsx wrapper com toggle Nova Venda/Vendas (default 'nova'), clientePreSelecionado curto-circuita pra NovaVenda sem toggle. App.jsx: lazy import de NovaVenda removido, VendasTab adicionado, render trocado — grep confirma zero referência órfã a NovaVenda. NovaVenda.jsx intocado (não aparece no diff). Code-splitting preservado (chunk VendasTab). Reviewer verificou props batendo com as assinaturas reais de NovaVenda/ListaVendas/hooks. Build ok, 56 testes. Spec ✅, Quality ✅. Sem achados. Visual (toggle/reset ao trocar aba) ainda não verificado por ninguém.

## AS 3 tasks completas.

## Revisão Final de Branch (opus)
Ready to merge: Yes. Sem críticas/importantes. Verificou os 4 riscos de integração cross-task, todos limpos no código:
- Data-join: useVendas aliaseia cliente_id→clienteId etc, então o find() resolve clientes de verdade (não vira "Cliente removido" em massa).
- statusVenda compõe certo com todo shape de venda (fiado multi/single c/ entrada, à vista) — sempre 1 badge sensato.
- Reset do toggle garantido estruturalmente pelo remount (motion.div key={paginaAtiva} + AnimatePresence).
- Code-splitting intacto: NovaVenda só importado por VendasTab, sem outro consumidor órfão.
Minors deixados como estão (NaN em criadaEm inválido teórico, O(n·m) aceitável, cobertura de teste opcional, empilhamento cosmético do toggle). 56/56 testes.
**Checklist de QA manual pro humano (nada testado em browser):** + abre em Nova Venda e cria venda; toggle Vendas lista ordenada; badges (à vista=azul, fiado pago=verde, fiado aberto=vermelho); busca filtra; tocar venda abre perfil do cliente certo; trocar de aba e voltar reseta pra Nova Venda; criar a partir do perfil (clientePreSelecionado) vai direto sem toggle; conta zerada mostra "Nenhuma venda ainda".

---

# Progresso — Tom de Cobrança — MESCLADO (feature anterior)

MESCLADO em feat/saas-multi-vendedor. Toggle Educado/Formal depois REMOVIDO a pedido do usuário (só formal editável). Ver git log.

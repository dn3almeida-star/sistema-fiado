# Progresso — Filtro na Lista de Vendas

Plano: docs/superpowers/plans/2026-07-02-filtro-vendas.md (base f4ddd6d)
Spec: docs/superpowers/specs/2026-07-02-filtro-vendas-design.md
Branch: feat/saas-multi-vendedor
Pre-flight: scan limpo, sem conflitos no plano.

## Tasks

Task 1: complete (commit 864eb17, review clean). dataLocal exportado de vendaAvista.js (1 linha, sem outra mudança). vendaNoPeriodo(venda, granularidade, valor) delega 100% pra dataLocal (zero duplicação de lógica de data). Reviewer confirmou o teste de fronteira de fuso horário (2026-07-16T01:00:00Z) é genuíno, não tautológico. 8 testes focados + 9 regressão vendaAvista + 64 na suíte completa. Spec ✅, Quality ✅. Minor: fallback `return true` pra granularidade desconhecida é código morto na prática (inofensivo, bate com o brief).
Task 2: complete (commit 951b8e1, review clean). Ícone de filtro + menu Cliente/Produto/Período→Dia/Mês/Ano em ListaVendas.jsx. escolherModo() centraliza reset atômico (modo+busca+menus). Reviewer cruzou o contrato de string entre escolherModo e vendaNoPeriodo (granularidade bate exatamente). Input único por modo (renderização mutuamente exclusiva, sem estado obsoleto). Comportamento do modo Cliente confirmado byte-a-byte inalterado. Build ok, 64 testes. Spec ✅, Quality ✅. Minor: input de Ano sem limite de dígitos (no-op seguro, não crash). Visual/interação ainda não verificado por ninguém.

## AS 2 tasks completas.

## Revisão Final de Branch (opus)
1ª rodada: Important encontrado — submenu Período "grudava" (abrir menu → Período → fechar sem escolher → reabrir cai direto no Dia/Mês/Ano sem volta pro Cliente/Produto). Achado só visível olhando a interação completa do estado do componente, nenhuma task isolada revelaria.
FIX aplicado (commit d674384): onClick do ícone de filtro agora reseta submenuPeriodo também, além de menuAberto. 1 linha, build+64 testes ok.
RE-REVIEW (opus): fix confirmado, escopo de 1 linha, botão "Período" intocado, sem regressão. **Ready to merge: Yes.**
Minors aceitos como estão: fallback código-morto em vendaNoPeriodo, input Ano sem limite de dígitos, sem clique-fora pra fechar menu (aceito no plano), <input type="month"> sem suporte nativo em Firefox/Safari desktop (limitação do controle, não defeito).
**Checklist de QA manual pro humano:** testar o fluxo completo do menu de filtro (abrir/Período/fechar/reabrir agora deve voltar ao topo); trocar de modo limpa a busca; filtrar por dia/mês/ano com vendas de datas conhecidas incluindo um caso de fronteira de fuso horário (venda criada tarde da noite local); campo vazio em modo período mostra tudo.

---

# Progresso — Lista de Vendas na Aba Nova Venda — MESCLADO (feature anterior, mesma branch)
Ready to merge: Yes (revisão final ok). Deploy feito. Depois: header unificado (toggle dentro do cabeçalho verde) a pedido do usuário, commit 8b69b18.

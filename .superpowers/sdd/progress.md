# Progresso — Calendário Visual no Filtro de Período

Plano: docs/superpowers/plans/2026-07-02-calendario-filtro.md (base e973cca)
Spec: docs/superpowers/specs/2026-07-02-calendario-filtro-design.md (grade de Ano corrigida pra 2x5/10 anos antes do plano)
Branch: feat/saas-multi-vendedor
Pre-flight: scan limpo, sem conflitos no plano.

## Tasks

Task 1: complete (commit 532a2f4, review clean). diasDoMes/nomeDoMes/decadaDoAno — só Date nativo, sem lib de datas. Reviewer traçou à mão o cálculo de dia da semana (1º julho/2026 = quarta, confirmado por contagem manual) e bissexto (fev/2028=29 via new Date(ano,2,0), fev/2026=28). 9 testes focados + 73 na suíte completa (64+9). Spec ✅, Quality ✅. Nota: o plano dizia "12 testes" no texto (contagem errada minha, contando asserts como testes) — não é defeito real, só imprecisão de documentação no plano.
Task 2: complete (commit 3ad0de3, review clean). SeletorPeriodo.jsx: 3 abas (Dia/Mês/Ano) com estado de navegação independente por aba (confirmado sem cross-read entre elas), Dia default no mês atual, Ano com grade exata 2x5/10 anos, rollover de mês/ano em ambas direções traçado à mão, seleção/desseleção constrói o valor certo. Build ok, 73 testes. Spec ✅, Quality ✅. Minors: key={i} em vez de valor estável na grade de Dia (Ano já faz certo); condição de rollover lê estado fechado em vez de updater funcional (sem bug real na prática); new Date() não memoizado (barato, inofensivo). Visual/interação ainda não verificado por ninguém.
Task 3: complete (commit 5d785d3, review clean). ListaVendas.jsx: modo restrito a cliente/produto/periodo, menu volta a 1 nível, novo granularidadePeriodo (default 'dia') alimentado só pelo onSelecionar do SeletorPeriodo. vendaNoPeriodo recebe granularidadePeriodo (não modo) — reviewer confirmou não é o bug clássico de argumento errado. useMemo com deps completas. Reviewer confirmou (grep + leitura completa) zero resíduo do submenuPeriodo antigo. Build ok, 73 testes. Spec ✅, Quality ✅. Nota de tooling: o script review-package truncou o diff no meio de um hunk — reviewer contornou lendo o arquivo completo, sem impacto na revisão (é limitação da ferramenta do skill, fora do escopo desta feature).

## AS 3 tasks completas.

## Revisão Final de Branch (opus)
Ready to merge: Yes. Sem críticas/importantes. Verificou o contrato de string granularidade ponta a ponta com vendaNoPeriodo (fora do diff) — sem drift de case/grafia. Formatos de valor batem exatamente (YYYY-MM-DD/YYYY-MM/YYYY). Confirmou consistência de fuso horário (dataLocal usa getters locais, calendário semeia de new Date() local — sem risco de virada de dia). Reset-por-remontagem confirmado (sem key, sem atalho pra modo='periodo' que pule o reset do busca). Desseleção limpa. Zero código órfão do menu antigo (grep confirma). Sem migração de banco. 73 testes, build ok.
Minors triados como aceitáveis: key={i} na grade de Dia (Ano/Mês já usam key estável); rollover lê estado fechado em vez de updater funcional (sem bug real); new Date() não memoizado; sem JSDoc (convenção do projeto).
**Checklist de QA manual pro humano:** entrar fresco (abre em Dia, mês atual, nada selecionado); selecionar/desselecionar dia com venda de horário tarde da noite (fronteira de fuso); navegação com virada de ano (dez→jan e jan→dez); aba Mês (navegar anos, selecionar mês); aba Ano (grade 2x5/10 anos, navegar décadas); navegação independente por aba (Dia em mar/2025, Mês em 2023, Ano nos 2010s, voltar pra Dia deve manter mar/2025); reset ao trocar pra Cliente e voltar pra Período; troca de aba com seleção ativa não mostra destaque errado no outro formato.

## Deploy pendente.

---

# Progresso — Filtro na Lista de Vendas — MESCLADO (feature anterior, mesma branch)
Ready to merge: Yes (revisão final + fix do submenu preso). Deploy feito.

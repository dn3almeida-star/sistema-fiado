# Progresso — Valor Editável ao Confirmar Pagamento

Plano: docs/superpowers/plans/2026-07-03-pagamento-valor-editavel.md (base 0642c33)
Spec: docs/superpowers/specs/2026-07-03-pagamento-valor-editavel-design.md
Branch: feat/saas-multi-vendedor
Pre-flight: scan limpo. Auto-revisão do plano já corrigiu inconsistência de tipo
(parcela.numero → parcela.numeroParcela, pra bater com o shape real de modalPago
em PerfilCliente.jsx) antes de qualquer dispatch.

**Nota:** este projeto já tem um ledger de features anteriores abaixo (mescladas).
Este bloco no topo é o que vale pra sessão atual.

## Tasks

Task 1: complete (commits b48d1fe + ee3622c, review clean). `aplicarPagamentoParcela` implementada exatamente conforme o brief, 9/9 testes passando. Revisor achou bug real de fuso horário em `somarUmMes` (usava `.toISOString()`, rolava a data 1 dia pra trás em fusos à frente do UTC — mandado pelo próprio plano, copiado do padrão já existente em `calcularParcelas.js`); usuário optou por corrigir agora, só neste arquivo novo (sem tocar `calcularParcelas.js`). Fix dispatch inicial (5210ccf) acidentalmente arrastou arquivos não relacionados soltos no working dir desde antes da sessão (.agents/skills/improve, dependência sharp, skills-lock.json) — reviewer pegou pelo diffstat. Corrigido via `git reset --soft` + recommit seletivo: fix isolado (ee3622c, só pagamentoParcela.js) + docs separado (f4e1974, só progress.md); arquivos não relacionados devolvidos ao estado solto de antes. Re-revisão final: Spec ✅, Quality ✅, escopo confirmado limpo (2 arquivos, 179 inserções).
Task 2: complete (commit adb9d3c, review clean). useVendas.marcarParcelaPaga integrado com aplicarPagamentoParcela; retrocompatibilidade confirmada (sem 3º argumento → diferença=0 → comportamento idêntico ao anterior); branch de valor_total só ativa quando parcelaExtraCriada; erro propaga igual às outras funções do hook. Build verde, 82/82 testes. Spec ✅, Quality ✅. Minor: arredondamento duplicado inline em vez de reusar helper de pagamentoParcela.js (fora de escopo, exigiria exportar de outro arquivo de outra task).
Task 3: complete (commit 0f64633, review clean). ModalConfirmarPagamento.jsx criado, dedicado (ModalConfirmar.jsx genérico intocado), usa parcela.numeroParcela (não numero), validação de valor vazio/zero/negativo/não-numérico desabilita Confirmar, haptic() no confirmar, visual consistente com o modal genérico. Build verde, 82/82 testes. Spec ✅, Quality ✅. Minor: texto informativo do valor combinado sem font-mono (herdado do brief verbatim, inconsistência já existente em outras partes do app, não é regressão desta task).
Task 4: complete (commit 75ab022, review clean). PerfilCliente.jsx: import de ModalConfirmarPagamento adicionado (ModalConfirmar mantido, ainda usado por remover-venda/excluir-cliente); confirmarMarcarPago(valorPago) encaminha pra marcarParcelaPaga; modal de pagamento trocado, os outros dois usos de ModalConfirmar confirmados intocados (revisor leu o arquivo ao vivo, não só o diff). Build verde, 82/82 testes. Spec ✅, Quality ✅. Sem achados.

## AS 4 tasks completas.

## Revisão Final de Branch

Ready to merge: Yes. Sem críticos/importantes. Subagente de revisão final (Opus)
foi interrompido por limite de sessão da API (resetava 22:40 -03:00) antes de
terminar — a revisão final foi feita diretamente pelo controlador (eu), lendo
o pacote de diff completo (0642c33..75ab022, 6 commits, 293 inserções/12
remoções) com o mesmo rigor do template. Confirmado: retrocompatibilidade
(`valorPago ?? parcelaAtual.valor` → diferenca=0 sem 3º argumento), itens fora
de escopo genuinamente ausentes (sem reabertura parcial, sem reversão no
desfazer, sem crédito no excedente da última parcela), somarUmMes usa a maior
data (não o maior número) pra achar a "última parcela", higiene de git limpa
nos 6 commits. Minor: `??` em vez de checagem explícita de `> 0` no hook
(teórico, sem chamador atual que exponha o risco).

## Deploy feito (2026-07-03).
Produção em https://sistema-fiado.vercel.app (deploy Vercel `--prod`,
readyState READY, dpl_2gbLBb7RSbohfAFKf67sE7BuCZZz). 82/82 testes verdes
antes do deploy. Feature "valor editável ao confirmar pagamento" no ar.

---

# Progresso — Calendário como Popup + Polimento Visual

Plano: docs/superpowers/plans/2026-07-02-calendario-popup.md (base aab2fae)
Spec: docs/superpowers/specs/2026-07-02-calendario-popup-design.md
Branch: feat/saas-multi-vendedor
Pre-flight: scan limpo, sem conflitos no plano.

**Nota:** esta feature usa numeração de Task 1/2/3 igual à feature anterior ("Calendário Visual no Filtro de Período", já mesclada — ver histórico abaixo). São tasks DIFERENTES. Este bloco no topo é o que vale pra sessão atual.

## Tasks

Task 1: complete (commits 1e8b5f9 + 9e75bfc, review clean). Corrigido defeito de sequenciamento no plano (decadaDoAno é usada por SeletorPeriodo.jsx atual até a Task 2 rodar — removê-la na Task 1 quebrava o build). Plano ajustado: Task 1 só adiciona rotuloPeriodo; remoção de decadaDoAno migrou pra Task 2. rotuloPeriodo reusa nomeDoMes, sem duplicar tabela de meses. Reviewer confirmou (via diff) decadaDoAno 100% intocada. 77 testes (73+4). Spec ✅, Quality ✅. Minor: rotuloPeriodo não valida formato malformado de valor (aceitável, bate com o brief).
Task 2: complete (commit 9534ef4, review clean). SeletorPeriodo.jsx: novo contrato {aberto, onFechar, valor, onSelecionar}, popup via AnimatePresence (sem early return — hooks ficam incondicionais no topo), timer de 5min traçado à mão nos 3 casos (primeira abertura/<5min/>=5min) via par de refs (ultimoFechamento + abertoAnterior, ordem leitura-antes-escrita confirmada correta). Aba Ano começa no ano atual (Math.max + disabled redundantes no limite inferior). decadaDoAno removida de vez (grep confirma zero referência). Dias circulares, anel de "hoje" só quando não selecionado, pílula deslizante via layoutId, transições de entrada/saída do modal. Build ok, 73 testes (77-4). Spec ✅, Quality ✅. Minor: hoje/anoAtual não reativo a virada de ano com popup aberto (edge case extremo, já assim no brief).
Task 3: complete (commit 90c0ea7, review clean). ListaVendas.jsx: botão clicável no lugar do texto estático "Filtrando por período", mostra rotuloPeriodo(granularidadePeriodo, busca) ou placeholder. SeletorPeriodo continua renderizado condicionado só a modo==='periodo' (reviewer confirmou via linha de contexto — não ficou adicionalmente condicionado a calendarioAberto, o que destruiria a memória de 5min da Task 2). onFechar só fecha; onSelecionar fecha E atualiza o filtro. Diffstat reconciliado (17/-4), zero mudança fora do esperado. Build ok, 73 testes. Spec ✅, Quality ✅. Sem achados.

## AS 3 tasks completas.

## Revisão Final de Branch (opus)
Ready to merge: Yes. Sem críticas/importantes. Verificou a garantia mais crítica: SeletorPeriodo continua renderizado condicionado só a modo==='periodo' (não a calendarioAberto) — a memória de 5min sobrevive de verdade ao fechar/reabrir o popup. Traçou o round-trip completo (botão→popup→seleção→fecha→rótulo atualiza) nos arquivos reais. decadaDoAno sem consumidor órfão em lugar nenhum (grep em src/ inteiro). Zero resíduo do design antigo (inline, sem popup). framer-motion confirmado pré-existente no package.json, sem lib nova, sem migração. Ano trava no ano atual (seta desabilitada), Dia/Mês navegam livre pro passado.
Minors aceitos como estão: botão X sem type="button" (sem form ao redor, inofensivo); desselecionar fecha o popup e limpa o filtro (comportamento do próprio contrato de toggle, não um bug); rotuloPeriodo sem validação de formato malformado; reset-effect não reativo a virada real de ano/mês com popup aberto (edge case extremo).
**Checklist de QA manual pro humano:** round-trip abrir→escolher→rótulo atualiza (nos 3 modos); pílula deslizando ao trocar aba (sem corte abrupto); dias circulares + anel de hoje (distinto do selecionado); trava no ano atual na aba Ano; Dia/Mês navegam pro passado normalmente; memória de 5min mantém posição em reabertura rápida SEM sair do modo Período; memória reseta depois de 5+ min (ou fast-forward no DevTools); fechar sem selecionar nunca muda o filtro/lista já aplicados.

## Deploy feito (2026-07-03, junto com a feature de valor editável).
Commits desta feature (90c0ea7, ed761c3) são ancestrais do estado publicado
em produção no deploy Vercel `--prod` de 2026-07-03. Já no ar em
https://sistema-fiado.vercel.app.

---

# Progresso — Calendário Visual no Filtro de Período — MESCLADO (feature anterior, mesma branch)

Plano: docs/superpowers/plans/2026-07-02-calendario-filtro.md (base e973cca)
3 tasks completas, revisão final "Ready to merge: Yes", deploy feito.
Ledger detalhado desta feature arquivado — ver `git log` nos commits de docs entre e973cca e 5d785d3 se precisar dos detalhes de cada task/review.

---

# Progresso — Filtro na Lista de Vendas — MESCLADO (feature anterior, mesma branch)
Ready to merge: Yes (revisão final + fix do submenu preso). Deploy feito.

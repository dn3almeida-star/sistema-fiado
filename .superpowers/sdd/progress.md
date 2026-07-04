# Progresso — Profissionalização (bugs + polish + a11y)

Plano: docs/superpowers/plans/2026-07-04-profissionalizacao.md (base 839d70a)
Branch: feat/saas-multi-vendedor
Fase 0 (RLS): CONCLUÍDA — auditoria confirmou RLS correto no Supabase
(clientes/vendas com relrowsecurity=true, policies *_all_own cmd ALL,
qual `user_id = auth.uid()`, coluna user_id existe). S1 e S2 resolvidos, sem
migração. Isolamento por loja é imposto pelo banco.
Pre-flight do plano: scan limpo.

## Tasks

Task 1: complete (commit 67bff9a, review clean). calcularParcelas.js: helper dataVencimento monta 'YYYY-MM-DD' local (sem toISOString) e fixa o dia ao último dia do mês-alvo (dia 31 → Fev 28), normaliza índice de mês p/ virar o ano. calcularParcelas.test.js novo com 6 casos. 6/6 + suíte 97/97. Revisor (Sonnet) rodou a suíte e verificou a aritmética à mão (dia 31→Fev28, virada de ano, arredondamento, saldo<=0). Spec ✅, Quality ✅. Sem achados.
Task 2: complete (commits ed3bec6 + fix 2d60c07, review clean). cobrancaSelo.js: rotuloUltimaCobranca(ultimaCobrancaEm, agoraISO) → null / 'Cobrado hoje'/'Cobrado ontem'/'Cobrado há Nd', comparando por dia de calendário local. 4 casos de teste. Revisor achou Important: teste não fixava TZ (convenção do projeto — quebrava em fuso à frente do BR); reproduziu a falha. Fix (2d60c07): add `process.env.TZ='America/Sao_Paulo'` como 1ª linha, igual statusVenda/filtroVendas/vendaAvista. Re-review: Spec ✅, Quality ✅. Suíte 101/101.
Task 3: complete (commit ccaefa1, review clean). Relatorio.jsx (2) + Donut.jsx (2): verdes hardcoded (#154e30/#16a34a) → rgb(var(--brand-bright)) (token de tema, verde único, legível no dark). Laranja #c97c1a ("A receber") intocado. build + 101/101. Spec ✅, Quality ✅. MINOR (não-bloqueante, fora de escopo): defaults `cor='#154e30'` em GraficoBarras/BarrasHorizontais são código morto (consumidores sempre passam cor) — deixado como está.
Task 4: complete (commit defc530, review clean). mensagensCobranca.js: removido o bloco morto `if(venda?.numero)` (Pedido #N nunca dispara — SELECT de vendas não traz numero); param venda mantido na assinatura. Teste do numero sintético removido, demais mantidos. 7 no arquivo + suíte 100/100. Spec ✅, Quality ✅. Sem achados (revisor notou que o teste "sem venda" ficou levemente redundante, mas não incorreto — fora de escopo).
Task 5: complete (commit 23ba57d, review clean). PerfilCliente.jsx: confirmarExcluirCliente virou async com try/catch (navega+toast só em sucesso; erro → toast, modal fica aberto p/ retry, igual confirmarRemoverVenda). Modal "Excluir Cliente" com mensagem condicional avisando totalDevido via formatarMoeda quando >0. Outros 2 modais intocados. build + 100/100. Spec ✅, Quality ✅. Sem achados.
Task 6: complete (commit 5807d8d, review clean). CobrancasHoje.jsx (selo rotuloUltimaCobranca + Parcela x/y), Dashboard.jsx (Parcela x/y), NovaVenda.jsx (busca por CPF com guarda qDigits!==''). build + 100/100. REVISÃO FEITA PELO CONTROLADOR (Opus): subagente de review bateu no limite de sessão da API (reset 12:40 -03:00). Verifiquei à mão: escopos de `venda` corretos nos dois cartões, badge só quando selo truthy, guarda de busca correta. Exatamente 3 mudanças. Spec ✅, Quality ✅. Sem achados.
Task 7: complete (commit e9fe07a). IMPLEMENTADA DIRETO PELO CONTROLADOR (subagentes bloqueados pelo limite de API). ModalConfirmar.jsx + BotaoCobranca.jsx: useEffect de Escape fecha o modal (em ModalConfirmar o hook fica ANTES do `if(!aberto) return null` p/ respeitar regra de hooks), role="dialog"/aria-modal nos dois. build + 100/100. Self-review: diff = exatamente o plano. Revisão final da branch pendente.

## AS 7 tasks completas.

## Revisão Final de Branch (Opus)
Ready to merge: Yes. Zero achados. Subagente Opus verificou os 7 invariantes end-to-end: (1) useEffect antes do early return em ModalConfirmar (hooks OK); (2) listeners de Escape com cleanup e deps corretos; (3) venda.parcelas.length em escopo nos 2 cartões; (4) selo integra o helper task-2, badge só quando não-null; (5) guarda qDigits!=='' na busca CPF; (6) calcularParcelas sem toISOString, clamp de dia correto, assinatura inalterada (NovaVenda preview intacto); (7) sem scope creep — 8 commits tocam só os arquivos previstos. Fora-de-escopo respeitado (sem automação, sem troca de fonte). Testes novos com TZ fixado. build + 100/100.

## Deploy feito (2026-07-04).
Produção em https://sistema-fiado.vercel.app (Vercel --prod, aliased). 100/100
testes + build verdes antes do deploy. As 7 tasks no ar.

---

# Progresso — Campo CPF em Clientes

Plano: docs/superpowers/plans/2026-07-04-cpf-cliente.md (base 6d5b330)
Spec: docs/superpowers/specs/2026-07-04-cpf-cliente-design.md
Branch: feat/saas-multi-vendedor
Pre-flight: scan limpo. Pré-requisito manual (usuário roda no Supabase antes do
deploy): `ALTER TABLE clientes ADD COLUMN cpf text;` + constraint UNIQUE.

## Tasks

Task 1: complete (commit 348e80c, review clean). mascaraCPF + validarCPF puras em formatadores.js, cpf.test.js com 9 casos (formatação progressiva, ignora não-dígitos, corta em 11, vazio→válido, dígito verificador, comprimento errado, sequência repetida). 9/9 + suíte 91/91. Revisor (Sonnet) verificou o algoritmo à mão: 529.982.247-25 válido, os rejeitados genuinamente inválidos, regra %11==10→0 correta. Spec ✅, Quality ✅. Sem achados.
Task 2: complete (commit 828afb8, review clean). useClientes.js: select inclui cpf; adicionarCliente/atualizarCliente normalizam cpf→dígitos-ou-null (nunca ''), checagem proativa de unicidade global lança Error{tipo:'cpf_duplicado', nome}, rede de segurança para 23505 do Postgres (nome:null) nos dois; atualizarCliente exclui o próprio id (.neq) e só checa se 'cpf' in patch. build + 91/91. Revisor confirmou: nenhum caminho grava '', estado otimista usa valor normalizado, gate 'cpf' in patchFinal correto. Spec ✅, Quality ✅. Sem achados.
Task 3: complete (commit efb32f4, review clean). Clientes.jsx: import mascaraCPF/validarCPF, FORM_INICIAL.cpf, salvarCliente valida CPF não-vazio (setErro 'CPF inválido') e trata cpf_duplicado com setErro nome-aware, campo CPF entre Telefone e Endereço (inputMode numeric, mascaraCPF no onChange), busca com qDigits guardado por !== '' contra c.cpf. build + 91/91. Spec ✅, Quality ✅. Revisor levantou ⚠️ cross-task (formato do cpf gravado) — RESOLVIDO pelo controlador: Task 2 grava dígitos puros (cpfDigitos||null), select retorna dígitos, então busca digit-vs-digit está correta. Sem gap.
Task 4: complete (commit 0fa7f1b, review clean). PerfilCliente.jsx: import mascaraCPF/validarCPF, abrirEdicao pré-preenche cpf mascarado, salvarEdicao valida (toast 'CPF inválido') e trata cpf_duplicado com toast nome-aware, input CPF entre Telefone e Endereço, pastilha de leitura com FileText+mascaraCPF só quando cliente.cpf, condição do wrapper alargada com || cliente.cpf. build + 91/91. Revisor confirmou guard da pastilha E wrapper alargado juntos (cliente só-CPF mostra pastilha), FileText reusado. Spec ✅, Quality ✅. Sem achados.
Task 5: complete (commit 966c04b, review clean). gerarPDF.js: mascaraCPF adicionado ao import existente de formatadores.js, linha "CPF: mascaraCPF(cliente.cpf)" no cabeçalho do carnê guardada por if(cliente.cpf) — sem placeholder "CPF: -" quando ausente (assimetria intencional vs Telefone/Bairro), posição (110,50) abaixo de Bairro sem colisão. build + 91/91. Spec ✅, Quality ✅. Sem achados.

## AS 5 tasks completas.

## Revisão Final de Branch (Opus)
Ready to merge: Yes. Sem críticos/importantes. Revisor rodou suíte (91/91) e build (limpo), traçou o fluxo end-to-end na fonte (não só no diff). Confirmou os 5 invariantes cross-task: (1) formato de armazenamento consistente — hook é o único ponto de normalização (dígitos-ou-null), pastilha/PDF exibem via mascaraCPF (idempotente sobre dígitos), busca compara qDigits vs c.cpf dígito-a-dígito, query de 11 dígitos completa funciona; (2) CPF vazio nunca vira '' no DB (empty/whitespace/não-dígito → null), UNIQUE seguro pra múltiplos sem-CPF; (3) unicidade coerente — check proativo nome-aware + rede 23505 genérica nos dois, update auto-exclui via .neq, ambos callers surfaceiam cpf_duplicado; (4) validação opcional consistente (validarCPF true no vazio); (5) sem regressão nos campos existentes. YAGNI ok (nada especulativo, fora-de-escopo não construído), test hygiene sólida.
Minors aceitos como estão (não-bloqueantes): placeholder da busca ainda diz "nome ou bairro" (busca por CPF funciona mas não é anunciada — cosmético); nome do arquivo de teste cpf.test.js diverge do spec §Testes que citava formatadores.test.js (mas bate com o plano Task 1, que escolheu cpf.test.js); quirk pré-existente da pastilha (cliente só-bairro não mostra linha de pastilha) — inalterado por esta feature.

## Deploy feito (2026-07-04).
Usuário confirmou ter rodado o SQL no Supabase (ADD COLUMN cpf + constraint
UNIQUE clientes_cpf_unique). Deploy Vercel --prod: dpl_BEA7SgdHGbTErjTRpGt3Z7joFgbG,
ready, target production (sistema-fiado-x8mmd9iml-daniel621.vercel.app →
sistema-fiado.vercel.app). 91/91 testes + build verdes antes do deploy.

---

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

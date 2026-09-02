# Progresso - Desmarcar parcela reverte o valor (2026-09-02)

Commit `7d64f0e`, 224/224 testes.

**O bug:** pagar uma parcela com valor diferente repassa a diferenca pra proxima
em aberto (ou cria parcela nova). Desmarcar so limpava `pago`/`pagoEm` — o valor
mexido ficava mexido pra sempre, nos dois lados.

**A correcao:** `aplicarPagamentoParcela` passa a gravar na parcela paga de onde
veio (`valorOriginal`) e pra onde foi o ajuste (`ajuste: {numero, valor,
valorEsperado, criouParcela}`). `desfazerPagamentoParcela` le isso e reverte os
dois lados, ou remove a parcela extra e devolve o `valor_total`.

Decisoes que valem lembrar:

- **Guarda `valorEsperado`, nao so a diferenca bruta.** O excedente trava em 0
  (`Math.max(0, ...)`) quando passaria do valor da proxima parcela — nesses
  casos o delta aplicado difere da diferenca, e somar a diferenca de volta
  levaria a um valor errado. Ha teste cobrindo esse clamp.
- **So reverte a outra parcela se ela estiver exatamente como o ajuste deixou**
  (nao paga e com `valor === valorEsperado`). Se foi paga ou editada nesse meio
  tempo, reverte so a parcela alvo — melhor deixar uma parcela sobrando mexida
  do que desfazer um pagamento real.
- Metadado so e gravado quando `diferenca !== 0`: o caminho comum (pagar o valor
  cheio) segue sem campo extra nenhum.

**Armadilha que me custou dois ciclos de teste do usuario:** desmarcar devolve o
valor **imediatamente anterior ao pagamento**, nao o valor original da venda. Se
o dado ja estava corrompido de antes, marcar+desmarcar restaura a corrupcao — e
isso e o comportamento certo. Eu li isso errado e afirmei que o conserto nao
tinha rodado; o que distingue os dois casos: com o codigo antigo o valor **pago**
fica travado na parcela; com o conserto, volta o valor de antes do pagamento.
Dados ja corrompidos precisam de correcao manual (foi feita por SQL na venda
`f801b4c4`, de teste, restaurando 93,33 / 93,33 / 93,34).

---

# Progresso - Botao Pix no cartao + investigacao encerrada (2026-09-02)

Commit `fb45601`, 215/215 testes. Fecha o assunto "codigo Pix no WhatsApp".

**Estado final:** botao `Pix` no cartao de cobranca (e na parcela do
PerfilCliente, e no ModoCobranca), ao lado do WhatsApp. Manda o codigo numa
mensagem so dele; a cliente segura e copia limpo. `BotaoPix.jsx` some sozinho
quando nao ha chave Pix ou telefone.

**O que NAO deu, testado e nao suposto** — o usuario queria uma mensagem so com
botao de copiar, como o print de cobranca de boleto que ele recebe:

- **O WhatsApp NAO reconhece codigo Pix em texto.** Testado em uso real: codigo
  sozinho na mensagem, nenhum botao apareceu. Ele reconhece *linha digitavel de
  boleto* (formato numerico fixo), nao BR Code. Fonte tecnica confirma que nao
  ha como forcar.
- **Bloco de codigo (tres crases) nao da copia isolada** — so muda a fonte pra
  monoespacada. Eu tinha apostado que sim, baseado em blogs; estava errado.
- **Botao de copiar em mensagem so existe via WhatsApp Business API**, que exige
  numero dedicado — o numero **deixa de funcionar no WhatsApp normal**. Inviavel
  pra quem vende conversando. Alem de template aprovado pela Meta e custo por
  mensagem.
- **O WhatsApp Business (app gratis) TEM cobranca Pix nativa** com botao "Pagar
  com Pix" e QR: Configuracoes > Cobrancas > Pix, e no chat clipe > Pagamentos >
  Cobrar com Pix (ou `/pix`). **Mas nao ha deeplink** — so funciona tocando
  dentro do WhatsApp, o app nao dispara. Anotado como saida manual pro lojista.
- **Nenhum app pode enviar mensagem no WhatsApp pelo usuario** (protecao
  anti-spam). Logo duas mensagens custam sempre dois toques do lojista.
- **Concorrentes** resolvem com QR: Fiado Pago mostra na tela (presencial),
  GesCredi poe QR + copia-e-cola em cada parcela do carne. Nosso app ja gera
  carne PDF — daria pra fazer igual, se um dia valer.

**Descartado tambem:** pagina publica `/pix` com botao copiar (1 toque do
lojista, 1 mensagem) — funcionaria, mas o usuario nao quis link.

**Bug corrigido no caminho:** o passo "Falta o codigo Pix" apos o envio sumia ao
voltar do WhatsApp — saindo do PWA o iOS descarrega o app e recarrega do zero.
Por isso o envio virou botao proprio, sem estado entre idas ao WhatsApp.

---

# Progresso - Pix em mensagem separada (2026-09-02)

Commit `94d3c7c`, 215/215 testes, build limpo.

**Correcao de uma hipotese minha que estava errada.** Na entrada anterior eu
tinha posto o codigo Pix entre tres crases apostando que o bloco de codigo do
WhatsApp seria copiavel isoladamente — varias fontes de tecnologia afirmam
isso. **Nao e verdade**, comprovado em uso real: o WhatsApp renderiza em
monoespacado, mas segurar continua selecionando a mensagem INTEIRA. A cliente
copiaria "Prezado(a)..." junto e o banco recusa. Licao: nao tratar como fato o
que so consigo confirmar por blog; se nao da pra testar, ir direto pro caminho
que sabidamente funciona.

O print de uso mostrou ainda um efeito colateral que eu nao tinha previsto: o
final do codigo (`*63046928`) era detectado pelo WhatsApp como **numero de
telefone** — virava link verde clicavel no meio do texto.

**A solucao:** `gerarMensagemCobranca` passa a devolver `codigoPix` a parte, e a
mensagem de texto volta a nao carregar o codigo. As telas enviam em dois passos
— a cobranca, e depois o codigo sozinho. **Sozinho na mensagem, segurar copia
exatamente o codigo**, porque a mensagem inteira e o codigo. Resolve tambem a
deteccao de telefone: sem texto em volta, nao ha o que confundir.

- `BotaoCobranca`: apos enviar, o modal fica aberto no passo 2 ("Falta o codigo
  Pix") em vez de fechar. Sem chave cadastrada, `codigoPix` vem null e o
  comportamento e o de antes — um envio so.
- `ModoCobranca`: segura a fila num passo extra antes de avancar pro proximo
  cliente. Tem "Pular" pra nao travar quem quiser tocar rapido.
- Custo aceito: **dois envios do lojista** por cobranca. E o unico jeito de a
  cliente copiar limpo.

**Nome do cliente: `text-lg` -> `text-xl`.** O primeiro aumento ficou sutil
demais (o usuario reportou "continua igual") porque `text-lg` ainda era menor
que o valor em `text-xl`. Agora empata em tamanho e ganha em peso (bold vs
semibold), virando o elemento dominante do cartao.

---

# Progresso - Nome em destaque + Pix em bloco de codigo (2026-09-02)

Commit `c577fb1`, 216/216 testes, build limpo. Duas coisas pedidas a partir de
prints de uso real.

**Nome do cliente nos cartoes de cobranca** (`CobrancasHoje.jsx`): de
`font-semibold` no tamanho base para `text-lg font-bold` — vira o elemento mais
forte do cartao, na frente do valor; e o nome e o que o lojista bate o olho pra
reconhecer quem cobrar. Junto: `leading-tight` (nome longo agora quebra em duas
linhas) e `truncate` no bairro, que e secundario e estava roubando duas linhas
("Jd Tiradente [ ap de.goiania]"). **Nome nao trunca de proposito** — nessa tela
ele precisa ler o nome inteiro; "Valdirene Braz da..." atrapalharia mais que uma
linha a mais. Um componente so serve Vencidas e A vencer.

**Pix entre tres crases (bloco de codigo do WhatsApp).** Descoberto em uso real:
na mensagem corrida, segurar no WhatsApp seleciona a mensagem INTEIRA — a
cliente copiava "Prezado(a)..." junto e o banco recusa. Ou seja, o copia e cola
nao funcionava na pratica. O bloco de codigo tambem evita a quebra no meio dos
digitos (com hifen) que aparecia no print.

- **Hipotese nao verificada por mim:** fontes de tecnologia dizem que o bloco de
  codigo do WhatsApp e copiavel isoladamente (diferente de negrito/italico, que
  sao so visuais). Nao consigo testar daqui — **o usuario confirma**. Se copiar
  a mensagem toda, o plano B ja esta desenhado: **duas mensagens** (cobranca, e
  o codigo sozinho depois), que resolve 100% ao custo de dois envios.
- **Teste trava o essencial:** dentro do bloco vai so o codigo — sem 'Prezado',
  sem 'Pague por', sem quebra de linha. Se alguem vazar texto pra dentro, quebra.
- Um teste meu nasceu errado assumindo que o codigo nao tem espaco: "IRAM
  UTILIDADES" (campo 59) tem. O codigo estava certo, a assercao e que estava.

---

# Progresso - Aviso antes de recobrar (2026-09-02)

Commit `0dcacb1`, 215/215 testes, build limpo.

**Contexto: e a alternativa barata a automatizar a baixa do pagamento.** O
usuario perguntou como o app poderia identificar o Pix e marcar a parcela
sozinho. Investigado e **descartado por ora**: a conta PJ do lojista e Nubank,
que nao oferece API Pix de recebimento com webhook (pedido em aberto no forum
deles; nas discussoes do bacen/pix-api o status aparece indefinido). As
solucoes de comunidade leem e-mail de aviso — nao confiaveis pra dinheiro.
Alternativas exigiriam intermediario (Mercado Pago, ja integrado mas com taxa
e dinheiro fora do banco dele) ou conta nova (Asaas: 100 recebimentos/mes
gratis, depois R$ 1,99 — mas a isencao citada e pra chave/QR estatico, nao
confirmado se cobre cobranca via API). Regra geral do mercado: **o Pix comum e
gratis, a API de Cobranca — a que avisa — e a que cobra**.

Decisao: **a dor nao e o tempo de marcar (30s), e cobrar quem ja pagou.** Esse
risco da pra atacar sem banco nenhum, e foi o que se fez aqui. Reavaliar
automacao depois de ~1 mes, com o dado real de se as clientes pagam por Pix
(termometro: `total_recebido`, R$ 8.695 em 02/09/2026).

- **`avisoRecobranca(parcela, agoraISO)`** em `cobrancaSelo.js` (nao virou
  arquivo novo — e o mesmo assunto e o mesmo dado do `rotuloUltimaCobranca`).
  Usa o `ultimaCobrancaEm` que ja era gravado; zero mudanca de schema.
- **Janela de 7 dias:** cobrou ha 2 dias, provavelmente pagou e ele nao marcou;
  cobrou ha um mes, e cobranca nova legitima e o aviso so atrapalharia.
- **Alerta, nao bloqueia** — as vezes recobrar e o certo. Banner no topo do
  modal do `BotaoCobranca`; o botao de enviar segue funcionando.
- Parcela paga nao avisa: a mensagem naquele caso e recibo, nao cobranca.
- **Fora de escopo:** botao "ja pagou, marcar agora" dentro do aviso —
  marcar como paga abre o fluxo de confirmacao de valor (pagamento parcial),
  o que triplicaria o diff. Acrescentar se ele reclamar de sair e voltar.

---

# Progresso - Pix Copia e Cola na cobranca (2026-09-02)

Commit `812d2c0`, 208/208 testes, deploy verificado no ar e **codigo validado
num banco real** (colado no Pix Copia e Cola: nome do titular e valor corretos).

**Por que essa feature e nao outra.** O usuario pediu ideias pra ajudar nas
vendas do pai (loja Iram Utilidades, revendedor de utilidades/moveis no fiado).
Olhando os dados dele, a primeira hipotese — "vender de novo pra quem ja pagou
bem" — foi *refutada*: 54 dos 69 clientes ainda devem 3+ parcelas (media 5,1
restantes), entao nao voltam a comprar porque ainda estao pagando, nao por
falta de oferta. O que os numeros mostram e outra coisa: R$ 63.648 vendidos,
R$ 53.633 na rua, R$ 8.695 recebidos, ~100% sem entrada, 5-12 parcelas, atraso
de so 3%. Os clientes pagam — o dinheiro e que demora a voltar. E o teto dele e
o credito do fornecedor. Logo a alavanca e **giro**, nao volume: fazer a cliente
pagar no momento em que le a cobranca.

- **`pixBrCode.js`** (novo): monta o BR Code do padrao BCB. Funcao pura, sem
  rede. Campos TLV + CRC-16/CCITT-FALSE.
- **Como o CRC foi garantido:** CRC errado faz o banco recusar o codigo inteiro
  e a cliente desiste sem ninguem saber. Duas travas: teste contra o vetor
  canonico do algoritmo (`crc16('123456789') === '29B1'`) e, na revisao, uma
  checagem cruzada com implementacao independente por tabela — as duas
  concordaram.
- **`profiles` ganhou `chave_pix` e `cidade`** (migration aplicada pelo usuario
  no SQL Editor; o classificador do modo auto barra escrita em banco por aqui).
  Nome do recebedor sai de `nome_loja` — nao pede campo novo, e o campo 59 e
  informativo (o banco destino mostra o titular real pela chave).
- **Sem chave preenchida, a mensagem sai identica a de antes.** Recibo de
  pagamento nao leva Pix; so a cobranca.
- **Chave CPF/CNPJ vai sem pontuacao** — o DICT guarda so digitos. A do lojista
  e CNPJ (14 digitos).
- **Fora de escopo, decidido junto:** QR Code (vale mais no presencial que no
  WhatsApp, e a cliente nao escaneia a propria tela — fica pra quando souber se
  usam Pix) e baixa automatica da parcela (exigiria integrar com banco).
- **Como medir:** isso NAO sobe o numero de vendas. O termometro e o
  `total_recebido` (R$ 8.695 na data) subir mais rapido.

---

# Progresso - Alterar vencimento de parcela (2026-08-30)

Pedido do usuario a partir de um print: poder mudar a data de vencimento de
uma parcela em aberto. Commits `6372caf` + `d40c995`, 192/192 testes verdes,
build limpo. Deploy verificado no ar e confirmado pelo usuario no iPhone.

- **Formato da data (`d40c995`):** o input date nativo formata pelo locale do
  aparelho ("1 de ago. de 2026" no iOS) e isso NAO e estilizavel por CSS. A
  saida foi manter o input (e o toque que ja funcionava) com o texto dele
  `text-transparent` e desenhar o `formatarData` por cima num span com
  `pointer-events-none`. Chip fixado em `w-[104px]` — sem isso ele esticava
  meia linha por causa do texto longo do iOS. O calendario aberto continua no
  idioma do sistema; so o campo fechado e nosso.

- **`alterarVencimento(vendaId, numeroParcela, novoVencimento)`** no
  `useVendas.js`, no mesmo molde de `desmarcarParcelaPaga` (map + o
  `atualizarParcelas` que ja existia). Chega no `PerfilCliente` sozinho pelo
  `...vendasHook` do App.jsx.
- **UI: `<input type="date">` nativo** no lugar do texto da data, so na
  parcela nao paga (paga continua texto). O campo `vencimento` ja e
  'YYYY-MM-DD', exatamente o formato que o input le e devolve — zero
  conversao de data, zero risco de fuso. Primeira tentativa foi um input
  transparente sobreposto ao texto com `showPicker()`; nao era clicavel no
  iPhone, trocado pelo input visivel.
- **`color-scheme: light/dark`** no `index.css`. Sem isso o widget nativo de
  data renderiza claro dentro do dark mode e fica ilegivel — pega todos os
  inputs nativos do app, nao so esse.
- **Sem util pura + teste novo**: e um map de uma linha, igual aos irmaos
  `desmarcarParcelaPaga`/`registrarCobranca`, que tambem nao tem teste.
- **Deploy:** o app e git-conectado no Vercel, entao o `git push` ja dispara.
  O `npx vercel --prod` falhou com "Not authorized" — o CLI esta deslogado
  (`vercel whoami` = "Logged out."); so importa pra landing, que e CLI manual.

---

# Progresso — Prompt de carrossel Instagram pra ChatGPT (2026-07-14)

Quarto material de marketing. Sonnet. Usuário trouxe um template genérico
("Instagram Carousel Generator") pra ser colado no ChatGPT (gera as imagens
lá, fora deste projeto). Adaptei preenchendo tudo: marca, paleta, fonte e o
conteúdo real dos 7 slides — nada fica em aberto pro ChatGPT perguntar.
Entregável: `marketing/prompt-carrossel-instagram.md`.

- **Paleta reaproveitada** dos outros materiais pra consistência total:
  BRAND_PRIMARY #0f7a4d, BRAND_DARK #0b5c3a (já usados em todo PDF), LIGHT_BG
  #F5F6F2 (= --ground da landing/guia), LIGHT_BORDER #E3E6E1 (= --line),
  DARK_BG #161D18 (= --ink). Só BRAND_LIGHT (#4CAF7D) é novo, derivado.
- **Fonte:** Lora (heading) + Nunito Sans (body) — pairing "warm/approachable"
  do template, alinhado ao tom "confiável, popular, acolhedor" da
  landing-page-spec.md §5.
- **Logo:** emoji 📓 (mesmo usado em todos os PDFs) num badge verde, já que
  não existe SVG de logo no repo.
- **7 slides com copy final:** hero → problema (caderno/vergonha) → solução
  (mensagem pronta, honestidade "você aperta enviar") → features → detalhes
  (sem baixar da loja, 30 dias grátis) → como funciona (3 passos) → CTA.
- Público ampliado e regra de honestidade mantidas em todo o texto.
- Escopo do arquivo: só o prompt-texto pra colar no ChatGPT — nenhuma imagem
  foi gerada por aqui, e não é esperado rodar Playwright neste projeto.

**Fix (mesmo dia):** usuário esclareceu que vai colar isso como instrução
PERMANENTE de um Projeto no ChatGPT (não uso único). Corrigido um problema
real: os 7 slides estavam marcados como "use exactly this copy", o que faria
todo pedido futuro repetir o mesmo carrossel genérico. Reestruturado: marca/
paleta/fonte/regras continuam permanentes; os 7 slides agora são só o
"carrossel de lançamento" (default se o usuário não especificar tema); pra
qualquer outro pedido, a instrução manda o ChatGPT escrever conteúdo novo
pro tema, seguindo as mesmas regras de marca/honestidade/público.

**Update (mesmo dia):** usuário trouxe de novo o template — desta vez com a
seção completa de exportação (Python + Playwright, 420px→1080×1350px PNG por
slide), deixando claro que o entregável final tem que ser **imagem pronta
pra baixar e postar**, não só o preview HTML. A seção de exportação já
existia no arquivo (script, regras críticas), mas faltava o detalhe de
robustez do template novo: explicação do "why this works" e a tabela de
"common export mistakes to avoid" — ambos adicionados. Também: intro do
arquivo agora deixa explícito que a saída são PNGs prontos (com fallback pra
HTML manual se o Projeto do ChatGPT não tiver ambiente Playwright), e
"Layout best practices" ganhou o aviso de imagens JPEG com extensão .png.
Nenhuma mudança na identidade de marca/paleta/fonte — só reforço do pipeline
de exportação.

---

# Progresso — Kit WhatsApp Business + bios das redes (2026-07-13)

Terceiro material de marketing (fecha o combo inicial). Opus (usuário trocou
de volta e pediu). Entregável: `marketing/kit-whatsapp-redes.md` — formato
markdown de propósito (é pra copiar-e-colar nas configs, PDF atrapalharia).

Conteúdo: (1) bios TikTok/Instagram/YouTube com limites de caractere + @ e
link da landing; (2) WhatsApp Business — saudação automática, ausência, 9
respostas rápidas (/link /guia /comofunciona /preco /instalar /tecnologia
/caro /parcelar /indicacao), 5 etiquetas; (3) sequência de follow-up do funil
(momentos 0→4, do "comenta FIADO" ao pagante + indicação). Tudo com o público
ampliado e a regra de honestidade.

Combo inicial de marketing agora completo: landing (no ar) + guia (PDF) +
roteiros (PDF) + kit WhatsApp/bios (md + PDF). Próximo trabalho é do usuário:
gravar/postar. Nada commitado no git ainda.

**Update:** kit também gerado em PDF (`marketing/kit-whatsapp-redes.pdf`,
~1 MB) a pedido — mas o .md continua sendo a fonte recomendada pra copiar-e-colar
(PDF é só referência de leitura). Blocos de mensagem/bio estilizados (bubble
WhatsApp + code mono). Layout verificado via Playwright.

---

# Progresso — 10 roteiros de vídeo (2026-07-12)

Segundo material de conteúdo do marketing. Sonnet. Entregável:
`marketing/roteiros-video.md` — os 10 ganchos do gtm §6 transformados em
roteiros completos (fala + o que mostrar na tela + virada + CTA + dica de
gravação), já com o público ampliado ("quem vive de vendas").

- CTA único e consistente em todos: "Comenta FIADO que eu te mando o app pra
  testar 30 dias grátis."
- Honestidade mantida: nunca "envia sozinho"/"automático" — sempre "o app
  escreve, você aperta enviar".
- Roteiro 6 (depoimento do pai) e Roteiro 5 (a "mágica" da cobrança em lote)
  marcados como os mais importantes pra prova social e demonstração central.
- Cadência e ordem de gravação replicada do gtm §8 (semana 1: 1,2,5,7,9).

Próximo material sugerido na fila: kit WhatsApp Business + bios das redes.

**Update:** também salvo em PDF (`marketing/roteiros-video.pdf`, ~968 KB,
mesma identidade visual do guia). Fonte: `marketing/roteiros-video.html`
(convertido via Edge headless, mesmo processo do guia). Layout verificado via
Playwright screenshot.

---

# Progresso — Público ampliado: "quem vive de vendas" (2026-07-12)

Correção de posicionamento do fundador: o público-alvo não é só mercadinho,
é **quem vive de vendas** (loja de roupa, sacoleira, autopeças, feirante,
revendedora, salão, etc. — qualquer um que vende fiado). Opus.

- **Guia** (`marketing/guia-fiado-sem-calote.*`): removido viés de mercado
  ("Feito pra quem vive de vendas", "cobrar cara a cara", "Loja do Zé"). PDF
  regerado.
- **Landing** (`landing/src/App.jsx`): mesma revisão (herói selo, prova social
  "não por gente de escritório", fecho da dor, exemplos). Rebuild + redeploy
  CLI → https://crediario-digital.vercel.app (verificado no bundle: "vive de
  vendas" presente, "mercadinho/mercearia" ausente).
- **GTM doc** (`gtm-sistema-fiado.md`): persona renomeada de "Seu Marcos do
  Mercadinho" → "Quem vive de vendas"; lista de ramos ampliada; header com nota
  de revisão. Notas internas de gravação ("balcão de loja") mantidas.
- Memória [[publico-alvo-vendas]] salva pra valer em todo material futuro.

---

# Progresso — Lead magnet "Guia do Fiado Sem Calote" (2026-07-12)

Primeiro material de conteúdo do marketing (a "isca" do gtm §7). Opus.
Entregável: `marketing/guia-fiado-sem-calote.pdf` (5 páginas, PT-BR de balcão).

- **Fonte:** `marketing/guia-fiado-sem-calote.html` (self-contained, print A4,
  identidade da marca: verde-esmeralda, serif nos títulos + sans no corpo).
- **5 páginas:** capa · "A conta que ninguém faz" (fórmula p/ ele calcular o
  custo do fiado esquecido) · "As 3 mensagens que funcionam" (copiar-e-colar,
  balões de WhatsApp) · "A regra dos 7 dias" + checklist do fiado saudável ·
  CTA c/ QR code da landing (`crediario-digital.vercel.app`) + WhatsApp.
- **QR gerado** com `npx qrcode -t svg` e embutido inline no HTML.
- **PDF gerado** via Edge headless (`msedge --headless --print-to-pdf`,
  perfil isolado em user-data-dir temp — instância aberta do Edge bloqueava).
  Regenerar: reabrir o HTML no Edge headless igual. Verificado visualmente
  via Playwright (screenshot da capa + páginas) — layout, QR e cores ok.
- **Honestidade:** nada de "envia sozinho"; sempre "o app escreve, você envia".
- Design hook (impeccable) tratado: removido side-tab do callout, adicionado
  par de fontes (Georgia display + sans corpo), em-dashes do corpo reduzidos.

Próximo material sugerido na fila: os 10 roteiros de vídeo, ou o kit
WhatsApp Business + bios das redes.

---

# Progresso — Landing page no ar (2026-07-12)

Primeira peça de marketing publicada. Opus. A landing já estava 100% codada
(pasta `landing/`, projeto Vite isolado do app) e com `src/config.js` preenchido
com valores reais — só faltava publicar.

- **WhatsApp confirmado** com o usuário: `5562993395736` (DDD 62/Goiás) — é o
  contato de leads na landing.
- **Link "Começar grátis"** → `https://sistema-fiado.vercel.app/cadastro`
  (rota `/cadastro` confirmada existente em src/App.jsx, abre o cadastro deslogado).
- **Build local ok** (vite, 164 kB JS / 52 kB gzip).
- **Deploy via CLI** (`npx vercel`, projeto NOVO e separado `crediario-digital`,
  scope `daniel621` — não mexe no `sistema-fiado` do app). `project add` +
  `link --project crediario-digital` + `--prod --yes`.
- **No ar:** https://crediario-digital.vercel.app (HTTP 200, título + bundle
  com URL do app e WhatsApp corretos verificados via curl).
- Deploy é **manual** (CLI, não conectado ao git). Redeploy: `cd landing &&
  npx vercel --prod --yes`. `.vercel/` e `.env.local` (token OIDC) gitignored.
- README da landing atualizado (removido aviso obsoleto de placeholder + URL no ar).

**É a porta de entrada única do marketing** — todo canal (vídeo/bio/anúncio/guia)
aponta pra cá; o botão dela leva ao app. Próximo material de marketing na fila:
o "Guia do Fiado Sem Calote" (lead magnet PDF) apontando pra esta URL.

---

# Progresso — Push (PWA) totalmente ligado em produção (2026-07-12)

Fechou a última pendência do go-live: notificação push configurada ponta-a-ponta.
Sonnet, guiado (usuário confirmou explicitamente o redeploy de produção antes de
executar — bloqueado 1x pelo classificador por falta de confirmação explícita,
correto, refeito com autorização).

- **Chaves VAPID geradas** (`npx web-push generate-vapid-keys`).
- **Secrets no Supabase** (CLI): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT=mailto:contato@crediariodigital.app`.
- **Migração `push_subscriptions` aplicada** (MCP) — tabela + RLS (dono
  gerencia as suas).
- **Edge Function `push-diario` publicada** (MCP `deploy_edge_function`,
  verify_jwt=false, com `resumoPush.ts` + `../_shared/datas.ts` inclusos).
- **Cron `push-diario` agendado** (mesmo padrão do `lembrete-diario`: 11:00 UTC
  = 08:00 BRT, reusa o segredo `lembrete_cron_secret` de `app_config`, mesma
  publishable key). Confirmado por SQL: os 2 jobs (`lembrete-diario` id 2,
  `push-diario` id 3) ativos.
- **`VITE_VAPID_PUBLIC_KEY` configurada na Vercel** (production) via
  `vercel env add`.
- **Redeploy de produção** (`vercel --prod`, com confirmação explícita do
  usuário) — pegou a env nova. Verificado: site 200, `sw.js` servindo
  `CACHE_NAME v4` com o handler `push` presente.

Push (PWA) está **100% funcional em produção** agora: qualquer lojista pode
ativar "Avisos no celular" no Perfil da Loja e recebe o resumo diário de
cobranças às 08h, mesmo sem CallMeBot.

## Pendências restantes do projeto
- Teste de aceite do primeiro push real (ativar em um device e confirmar o
  recebimento — só se prova no primeiro cron real ou testando manualmente).
- "Pagamento aprovado→libera plano" só validado com Pix real (ver entrada
  anterior).
- Marketing/conteúdo (fora de código).

---

# Progresso — GO-LIVE: front no ar com paywall + checkout + tudo (2026-07-12)

Push dos 9 commits locais → deploy automático na Vercel (projeto git-connected
`sistema-fiado`). Deploy Ready. Rotas verificadas 200: /, /cadastro,
/cadastro?ref=, /cobrancas. **O app está no ar** em https://sistema-fiado.vercel.app
com: paywall (Grátis×Pago), checkout Pix (token de PRODUÇÃO ativo), indicação,
onboarding, prompt de instalar, valor recuperado, nudge de fim de teste, métricas.

- Segurança: nenhum token real commitado (só o prefixo `APP_USR-...` de exemplo
  no ledger). Verificado por git grep dos hashes reais antes do push.
- Estado seguro no go-live: só 2 contas (fundador + pai), ambas `pago` permanente
  → ninguém é travado. O 1º cadastro real ganha trial 30d; ao expirar/estourar
  limite, o "Assinar" gera Pix REAL (token de produção).

## Ainda pendente (não bloqueia o que está no ar)
- ~~Push (PWA) inerte~~ — **resolvido**, ver entrada seguinte (push totalmente
  configurado e ligado em produção no mesmo dia).
- Teste de aceite do "pagamento aprovado→libera plano" só com Pix real (sandbox
  do MP não simula aprovação de Pix) — usuário optou por pular; validar no 1º
  pagamento real.
- Marketing/conteúdo (fora de código): guia PDF, vídeos, depoimento, WhatsApp
  Business, grupos.

---

# Progresso — Checkout Pix (Mercado Pago) deployado e testado (2026-07-12)

Backend do pagamento (spec 2026-07-11-pagamento-pix) publicado em produção no
projeto Supabase sactjyyildfmycndujoz. Sonnet, guiado passo a passo com o usuário
na criação da conta/credenciais Mercado Pago.

- **Migrações aplicadas (MCP):** `pagamento_pix` (profiles.plano_expira_em +
  tabela `pagamentos`) e `indicacao` (profiles.indicado_por/indicacao_creditada +
  trigger). Confirmado por SQL: colunas e tabela existem.
- **Secret `MP_ACCESS_TOKEN`** configurado via Supabase CLI (`supabase secrets
  set`, projeto linkado). Não existe MCP tool para secrets — só CLI/dashboard.
- **Edge Functions publicadas (MCP `deploy_edge_function`):**
  `criar-pagamento-pix` (verify_jwt=true) e `webhook-mercadopago`
  (verify_jwt=false; import relativo `../_shared/datas.ts` incluído explicitamente
  no payload de deploy).
- **Teste ponta-a-ponta em sandbox:** criada conta descartável via signup direto
  (confirmação de email já estava desligada — configuração pendente anterior foi
  feita). Chamada real a `criar-pagamento-pix` com JWT dessa conta: retornou
  payment_id, QR code e copia-e-cola do Mercado Pago (ambiente sandbox). O MP já
  disparou o webhook na criação (mesmo pending) e confirmei a linha gravada em
  `pagamentos` (id, user_id, valor 19.90, status pending) — prova que
  auth→MP→webhook→banco funciona ponta a ponta.
- **Limitação documentada:** Pix em sandbox do Mercado Pago **não tem simulação
  de aprovação** (confirmado na doc oficial) — só é possível verificar o branch
  "approved" (libera plano) com um Pix real. Conta de teste e pagamento de teste
  foram **apagados** do banco depois (0 restantes).
- **⚠️ Troca para credenciais de PRODUÇÃO:** usuário criou a aplicação no Mercado
  Pago (ativou credenciais de produção com site https://sistema-fiado.vercel.app)
  e pegou o Access Token `APP_USR-...`. Secret `MP_ACCESS_TOKEN` **já foi trocado
  para o valor de produção** — qualquer novo Pix criado a partir de agora é
  dinheiro real. Front ainda NÃO foi deployado (branch só local, ahead da
  origin), então não há exposição pública do checkout ainda.

## Pendente pra fechar o go-live
1. Decidir: fazer 1 Pix real de R$19,90 como teste final de aceite (única forma
   de provar o branch "approved"/liberação de plano com o Mercado Pago real), ou
   pular pra confiar no code review + teste de criação já feito.
2. Push do front (`git push`) — publica os ~9 commits locais de uma vez
   (paywall, checkout, indicação, onboarding, instalar, valor recuperado,
   nudge, métricas). Push (PWA) fica inerte até as chaves VAPID existirem, mas
   não quebra nada.
3. Chaves VAPID pro push, quando o usuário quiser ativar aquele fluxo.

---

# Progresso — GTM item 5: painel de métricas do fundador (2026-07-11)

Instrumentação das 5 métricas do funil (gtm §9), nível A (interno, sobre o banco;
sem ferramenta externa). Spec docs/superpowers/specs/2026-07-11-metricas-design.md.
Opus + TDD. **NÃO deployado.** Fecha o código de GTM (só falta marketing/conteúdo).

- **Migração `20260711_metricas.sql`:** função `metricas_funil()` security definer
  → json com cadastros, ativados (parcela com ultimaCobrancaEm), pagantes, emTeste,
  gratis, indicacoes, indicacoesConvertidas. Trava dura por `auth.uid()` == id do
  fundador (RLS impede ler dados alheios; a função agrega mas só responde pra ele).
  grant execute só a authenticated.
- **`taxasFunil` pura (TDD +3, suíte 192/192 em 32 arq.):** taxaAtivacao/
  taxaPagantes (% sobre cadastros, sem div/0).
- **`admin.js`** (`ID_FUNDADOR`/`ehFundador`), **`useMetricas.js`** (rpc),
  **`Metricas.jsx`** (cards via CardResumo; alerta quando ativação <40% = sinal
  do §9; nota das 2 contas semente + FIADO externo).
- **App:** rota `metricas` (lazy). **PerfilLoja:** link só pra `ehFundador`.

## GTM — código 100% coberto. Aberto só: marketing/conteúdo (guia PDF, vídeos,
## depoimento, WhatsApp Business, grupos) e o deploy de tudo.

---

# Progresso — GTM: indicação + nudge de fim de teste (itens 3 e 4) (2026-07-11)

Duas features de crescimento. Spec docs/superpowers/specs/2026-07-11-crescimento-design.md.
Opus + TDD. **NÃO deployado** (vai junto; item 3 usa o webhook de pagamento).

## Item 3 — Programa de indicação
- **Migração `20260711_indicacao.sql`:** `profiles += indicado_por uuid,
  indicacao_creditada boolean default false`; trigger passa a gravar
  `indicado_por` dos metadados do signUp (cast uuid seguro; ignora auto-indicação).
- **`linkIndicacao(origin, userId)` pura (TDD).** `useAuth.cadastrar` ganhou 4º
  arg `indicadoPor` (metadata). App lê `?ref=` da URL e passa pro `Cadastro`.
- **Webhook `webhook-mercadopago`:** ao aprovar o pagamento do indicado (1ª vez,
  `indicacao_creditada=false`), credita o indicador com +30d — `max(hoje, expira
  atual)+30`, **sem rebaixar pago permanente** (expira null) — e marca creditada.
- **`CardIndicacao.jsx`** no PerfilLoja: link + copiar + compartilhar (navigator.share).

## Item 4 — Nudge de fim de teste (in-app)
- **`deveMostrarNudgeTeste(status, jaMostrouHoje)` pura (TDD):** teste com
  diasRestantesTeste ≤5 e não mostrado hoje.
- **App:** useEffect ao carregar o profile abre o `ModalUpgrade` 1x/dia
  (localStorage `nudge_teste_<hoje>`) — já mostra o valor recuperado. Versão
  outbound (push/email) fica pra depois.

Suíte 189/189 em 31 arq. GTM código restante: só item 5 (métricas).

---

# Progresso — GTM: valor recuperado como gancho de conversão (2026-07-11)

Item 2 das melhorias de GTM (§5.3 "o app se paga"): mostrar quanto o lojista já
recebeu de fiado com o app, no momento da conversão. Opus + TDD. **NÃO deployado.**

- **Função pura `src/utils/recuperado.js` (TDD +5, suíte 182/182 em 30 arq.):**
  `totalRecebido(vendas) → número` (soma das parcelas pagas, arredonda centavos,
  tolera venda sem parcelas).
- **App:** passa `valorRecebido={totalRecebido(vendas)}` pro `ModalUpgrade`.
- **`ModalUpgrade`:** quando > 0, destaque verde no topo — "Você já recebeu R$ X
  de fiado usando o app. Ele se paga." (ícone TrendingUp). É o argumento de
  conversão mais forte do funil.

## GTM — código ainda em aberto: 3 (indicação), 4 (msgs fim de teste), 5 (métricas).

---

# Progresso — GTM: prompt de instalação do PWA (2026-07-11)

Melhoria de funil (gtm §5 "instala em 2 min, sem loja de app"): convite pra
instalar o PWA na tela inicial. Também destrava o push no iPhone (iOS só entrega
push em PWA instalado). Opus + TDD. **NÃO deployado** (vai no dia do deploy).

- **Função pura `src/utils/instalacao.js` (TDD +6, suíte 177/177 em 29 arq.):**
  `decidirInstalacao({instalado, dispensado, podeInstalar, ehIOS}) →
  'android'|'ios'|null`. Prompt nativo tem prioridade; iOS cai em instruções.
- **`useInstalacao.js`:** captura `beforeinstallprompt` (Android/Chrome) e guarda
  pra disparar depois; detecta iOS (userAgent) e standalone (display-mode); trata
  `appinstalled`; dispensar em localStorage `instalar_dispensado`.
- **`BannerInstalar.jsx`:** Android → botão "Instalar" (dispara o prompt nativo);
  iOS → passo a passo (Compartilhar → Adicionar à Tela de Início). Dispensável.
- **Dashboard:** banner no topo do conteúdo, junto do de plano/onboarding.

## GTM — melhorias de código ainda em aberto (não construídas)
Levantadas ao cruzar o gtm com o produto; usuário escolheu só o item 1 (instalar):
2. "Valor recuperado em R$" como gancho de conversão (§5.3). 3. Programa de
indicação (§4 canal 3). 4. Mensagens de fim de teste automatizadas (§5.3).
5. Instrumentação das 5 métricas (§9). Marketing/conteúdo (fora de código):
guia PDF, vídeos, WhatsApp Business, grupos, depoimento.

---

# Progresso — Melhorias: onboarding de ativação + polimento (2026-07-11)

Duas frentes de melhoria pedidas pelo usuário ("todas as melhorias"). Opus + TDD.
**NÃO deployado** (vai junto no dia do deploy das outras features).

## A) Onboarding de ativação
Checklist "Primeiros passos" no Dashboard que guia o lojista novo até o momento
"aha" do funil (gtm §5 = 1ª cobrança enviada).
- **Função pura `src/utils/onboarding.js` (TDD +5, suíte 171/171 em 28 arq.):**
  `passosOnboarding(clientes, vendas) → {cadastrouCliente, registrouFiado,
  enviouCobranca, completo}`. enviouCobranca = alguma parcela com ultimaCobrancaEm.
- **`CardOnboarding.jsx`:** 3 passos (cadastrar cliente → registrar fiado →
  enviar 1ª cobrança); o próximo passo é destacado e leva à tela; X dispensa
  (localStorage `onboarding_dispensado`). Some quando completo ou dispensado.
- **Dashboard:** computa `passos` (useMemo) e mostra o card no topo do conteúdo.

## B) Polimento
- **Reduced-motion (a11y não-negociável):** o CSS já zerava transições/animações
  CSS, mas o **framer-motion** (JS, em quase toda tela) não era coberto. Adicionado
  `<MotionConfig reducedMotion="user">` na raiz (`main.jsx`) → o framer respeita
  a preferência do sistema.
- **Fonte Inter:** o hook de design marca como "muito usada", mas é a marca já
  consolidada do projeto (tailwind.config) — mantida (identidade vence). Auditoria
  visual profunda (impeccable audit completo, com screenshots) fica como
  investimento próprio; exige montar PRODUCT.md/DESIGN.md antes.

---

# Progresso — Notificação push (PWA) — o lembrete que escala (2026-07-11)

Substituto que escala do lembrete diário: hoje o CallMeBot só atende o dono
(pai); o push do PWA avisa qualquer lojista no celular ("N cobranças hoje").
Spec em docs/superpowers/specs/2026-07-11-push-notificacao-design.md. Opus + TDD.
**NÃO deployado** (falta gerar chaves VAPID + deploy — ver pendências).

- **Função pura `push-diario/resumoPush.ts` (TDD +3, suíte 166/166 em 27 arq.):**
  `montarNotificacaoPush(vendas, clientes, hojeISO) → {titulo, corpo, qtd, total}
  | null`. Espelha a regra de atraso (não paga, vencimento<=hoje, cliente existe);
  null quando não há cobrança. Isolada da lógica do lembrete (não mexi no que
  funciona).
- **Migração `20260711_push_subscriptions.sql`:** tabela `push_subscriptions`
  (user_id, endpoint unique, p256dh, auth). RLS: dono gerencia as suas; cron
  (service role) lê todas.
- **`public/sw.js`:** handlers `push` (showNotification com titulo/corpo/icon) e
  `notificationclick` (foca aba existente + postMessage navegar, ou openWindow
  /cobrancas). CACHE_NAME bump v3→v4.
- **Front:** `usePush.js` (suporte/permissão/inscrito; `ativar` pede permissão →
  PushManager.subscribe(VAPID pública de VITE_VAPID_PUBLIC_KEY) → salva em
  push_subscriptions; `desativar` remove); `CardAvisosPush.jsx` (opt-in no
  PerfilLoja, trata não-suportado/negado/iOS); App entende deep link `/cobrancas`
  e ouve mensagem do SW pra navegar pra aba Cobranças.
- **Edge Function `push-diario/`:** `npm:web-push@3.6.7`; autentica pelo mesmo
  x-cron-secret (app_config); percorre inscrições agrupadas por usuário, monta
  resumo por lojista (service role), envia Web Push com VAPID privada; remove
  inscrição morta (404/410). Reusa `_shared/datas.ts` (dataSaoPaulo).
- **Migração `20260711_push_cron.sql`:** agenda `push-diario` às 11:00 UTC
  (=08:00 BRT), reusando o segredo do lembrete no header x-cron-secret.

## Pendências (bloqueiam o deploy)
1. **Gerar par de chaves VAPID** (ex: `npx web-push generate-vapid-keys`).
   Pública → env `VITE_VAPID_PUBLIC_KEY` (Vercel); privada + `VAPID_PUBLIC_KEY`
   + `VAPID_SUBJECT` (mailto) → secrets do Supabase.
2. **Deploy:** aplicar as 2 migrações; `supabase functions deploy push-diario`;
   preencher <PROJECT_REF>/<PUBLISHABLE_KEY> no cron e rodar; deploy do front
   (SW v4 + env VAPID).
3. **Testar:** ativar avisos no app (permissão) → inscrição salva; disparar a
   função manualmente → notificação chega; toque abre /cobrancas.
4. iOS: push em PWA só com app na tela inicial (documentado no card).

---

# Progresso — Pagamento da assinatura via Pix (Mercado Pago) (2026-07-11)

Liga o botão "Assinar" do paywall a um pagamento Pix real via Mercado Pago (Pix
avulso, 30 dias por pagamento; recorrência automática = spec futura). Decisão do
usuário: gateway em vez de expor Pix pessoal; taxa Pix 0,99% confirmada ao vivo.
Spec em docs/superpowers/specs/2026-07-11-pagamento-pix-design.md. Opus + TDD.
**NÃO deployado** (aguarda o usuário criar a conta Mercado Pago — ver pendências).

- **Função pura `planos.js` (ajuste, TDD +3, suíte 163/163 em 26 arq.):**
  `statusPlano` agora entende `planoExpiraEm`. `pago` + (expira null OU
  hoje≤expira) → pago (permanente p/ pai/fundador, com validade p/ pagantes);
  `pago` + hoje>expira → grátis (expirou). Novo campo `diasRestantesPago`.
- **Migração `20260711_pagamento_pix.sql` (escrita, NÃO aplicada ainda):**
  `profiles += plano_expira_em date` (null=permanente); tabela `pagamentos`
  (PK = payment_id do MP → webhook idempotente; RLS: dono lê os seus, ninguém
  escreve via API — só service role).
- **`useProfile.js`** traz `planoExpiraEm:plano_expira_em`; expõe `recarregarProfile`.
- **Edge Function `criar-pagamento-pix/`:** `pagamentoPix.ts` (puro, TDD:
  `montarCorpoPagamento` com external_reference=user_id) + `index.ts` (CORS;
  autentica pelo JWT — não confia em id do corpo; `POST /v1/payments` no MP com
  X-Idempotency-Key; devolve qr_code/qr_code_base64/payment_id).
- **Edge Function `webhook-mercadopago/`:** recebe notificação, **reconsulta o
  pagamento no MP pelo id** (fonte da verdade, não confia no corpo); se approved
  e ainda não processado (idempotência via tabela) → upsert pagamentos + `update
  profiles set plano='pago', plano_expira_em = SP+30`. verify_jwt=false (MP não
  manda JWT). Precisa deploy com `--no-verify-jwt`.
- **`_shared/datas.ts`** (padrão _shared do Supabase): `dataSaoPaulo` +
  `calcularExpiracao` (TDD), usados pelo webhook.
- **Front:** `useAssinatura.js` (invoke da function → poll na tabela pagamentos
  a cada 4s até approved → recarrega profile → paywall libera); `TelaPagamentoPix
  .jsx` (QR + copia-e-cola + status aguardando/aprovado/erro); `ModalUpgrade`
  "Assinar" abre a tela; `BannerPlano` avisa quando a assinatura vence em ≤7 dias
  ("Renovar").

## Pendências (bloqueiam o deploy — a fazer no dia do go-live)
1. **Usuário criar conta no Mercado Pago** e pegar o **Access Token** (produção;
   sandbox p/ testar). Análogo à ativação do CallMeBot — passo guiado.
2. **Secrets no Supabase:** `MP_ACCESS_TOKEN` e `SUPABASE_ANON_KEY` (a
   criar-pagamento-pix usa a anon pra getUser).
3. **Deploy:** aplicar migração; `supabase functions deploy criar-pagamento-pix`
   e `webhook-mercadopago --no-verify-jwt`; configurar a notification_url no
   painel do MP (ou já vai no corpo do pagamento); deploy do front.
4. **Testar em sandbox** ponta-a-ponta antes de ligar em produção.
5. Só então `git push` (canônico é git-connected → deploy do front automático).

---

# Progresso — Paywall / enforcement do plano (Grátis × Pago) (2026-07-11)

Enforcement do modelo de preço (gtm §3): Grátis "Caderno" (≤20 clientes, sem
cobrança/PDF/relatório) × Pago "Caderno + Cobrador" R$19,90 (tudo, ilimitado);
teste = 30 dias do pago → vira Grátis ao expirar. Spec/design em
docs/superpowers/specs/2026-07-11-paywall-design.md. Feito com Opus + MCP Supabase.
**NÃO commitado/deployado ainda** (aguarda gateway — ver abaixo).

- **Função pura `src/utils/planos.js` (TDD, 9 testes; suíte 154/154 em 24 arq.):**
  `statusPlano(profile, hojeISO) → {estado:'teste'|'gratis'|'pago',
  diasRestantesTeste, entitlements:{cobranca,pdf,relatorio,clientesIlimitados,
  limiteClientes}}` + `podeAdicionarCliente(status, qtd)` +
  `LIMITE_CLIENTES_GRATIS=20`. Regras: pago→tudo; teste com `hoje<=termina`→tudo;
  teste expirado/gratis/desconhecido/`termina=null`→grátis travado (limite 20).
  Comparação de datas ISO por string; `diasEntre` no padrão filaCobranca.
- **`useProfile.js`** passou a trazer `plano, testeTerminaEm:teste_termina_em`
  nos SELECTs (recarregar + upsert). Antes nem vinha — nada era gateado.
- **`App.jsx`** computa `planoStatus = statusPlano(profile, hoje())` e injeta em
  `props` (+ `abrirUpgrade`). `ModalUpgrade` global.
- **Gates de UI** (todos lendo `planoStatus.entitlements`, UI é casca):
  - Cobrança: `BotaoCobranca` ganhou `bloqueado`/`onUpgrade` (clique→upgrade);
    threaded em `PerfilCliente`, `CobrancasHoje` (+ botão "Iniciar cobrança do
    dia"), e blindagem na página `ModoCobranca`.
  - PDF: botão "Gerar Carnê PDF" no `PerfilCliente` → upgrade se `!pdf`.
  - Relatório: `Relatorio.jsx` inteiro atrás de estado bloqueado se `!relatorio`.
  - Cliente 21º: `Clientes.jsx` — botão "Novo" e `salvarCliente` gateados por
    `podeAdicionarCliente`; contador "X/20 no plano Grátis".
  - `BannerPlano.jsx` (novo) no topo do Dashboard: teste→contagem regressiva;
    grátis→CTA assinar; pago→some.
  - `ModalUpgrade.jsx` (novo): benefícios + preço; botão "Assinar" = placeholder
    (`onAssinar`→toast). **Pix removido** (ver decisão do gateway).
- **Banco (MCP, prod sactjyyildfmycndujoz):** conta do pai (`3093bd55…`,
  Iram Utilidades) e do fundador (`c69e3937…`, dn3almeida) → `plano='pago'`.
  Conta de teste "Mariana fiado" (`773a79d3…`, marisilvanet) **excluída** por
  completo (vendas→clientes→profiles→auth.users, em transação; 0 restantes).
  Estado final: 2 contas, ambas `pago` → ninguém trava quando for pro ar.
  (Sem migração de schema: `plano` text já comporta 'gratis'/'pago'.)

## Pendências (bloqueiam o "ir pro ar")
- **Pagamento por GATEWAY, não Pix manual** (decisão do usuário — não quer expor
  Pix pessoal). Precisa de spec própria: escolher provedor (Mercado Pago é o
  natural no BR: Pix+cartão, checkout hospedado, sem expor chave), Edge Function
  de criação de checkout + webhook que confirma pagamento e faz
  `update profiles set plano='pago'`, e ligar o `onAssinar` do modal no checkout.
- **Deploy = live:** o projeto canônico da Vercel é git-connected, então `git
  push` publica na hora. Por isso o enforcement foi **commitado local, SEM push**
  — só sobe junto com o gateway (senão o botão "Assinar" fica sem destino).

---

# Progresso — Deploy do front em produção (Vercel) (2026-07-11)

Primeiro deploy manual do front pra produção via runbook da skill (testes →
build → `vercel --prod`). Objetivo: colocar landing + cadastro self-service no
ar de verdade (até então o código existia mas não estava publicado).

- **Pré-deploy:** `npm test` = 145/145 em 23 arquivos; `npm run build` limpo (só
  aviso cosmético de chunk >500kB — jspdf/html2canvas do PDF, não bloqueia).
- **Vercel:** CLI não estava instalado/logado nesta máquina. `npx vercel login`
  (OAuth device flow, usuário autenticou no navegador) → conta `dn3almeida-star`,
  team `daniel621`. `vercel link --project sistema-fiado` (canônico do runbook).
  Env vars `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` já estavam no projeto
  (Production, criadas há 11d) — build remoto injetou.
- **Deploy:** `npx vercel --prod --yes`. Build remoto (iad1), 2330 módulos, ok.
  Aliased → **https://sistema-fiado.vercel.app**. Verificado: `/` → 200,
  `/cadastro` → 200 (rewrite SPA do vercel.json funcionando; sem ele daria 404),
  title "Crediário Digital".
- **⚠️ Pendência — projeto duplicado na Vercel:** a conta tem DOIS projetos,
  `sistema-fiado` (canônico, o que deployamos) e `sistema-fiado-bnju`
  (`sistema-fiado-bnju.vercel.app`), ambos atualizados ~5h antes. Provável
  integração git antiga criando duplicata. Decidir qual manter e apagar o outro
  pra não confundir domínio/deploys. Não bloqueia nada agora.
- **Config de produto pendente (fora do terminal):** desligar confirmação de
  email no painel Supabase (Auth → Sign In/Providers → Email) — usuário optou por
  desligar pra reduzir atrito no lançamento. Verificar se foi feito.

---

# Progresso — Cadastro self-service + teste grátis de 30 dias (2026-07-11)

Primeira feature do funil de GTM (gtm-sistema-fiado.md): visitante cria a
própria conta pela interface e entra num teste de 30 dias. Antes, contas eram
criadas na mão no Supabase. Spec/plano em docs/superpowers/{specs,plans}/
2026-07-11-cadastro*. Executado pelo Fable 5 a partir de spec do Opus
(cadastro-spec.md na raiz). Commit pendente (usuário ainda não pediu).

- **Funções puras** `src/utils/cadastro.js` (TDD, 14 testes novos):
  `validarCadastro` (erros por campo em PT-BR) e `calcularFimTeste(hojeISO,
  dias=30)` (aritmética de calendário local, sem toISOString). Suíte total:
  145/145 em 23 arquivos.
- **Migração `20260711_cadastro_trial.sql` (APLICADA em prod via MCP, com
  autorização explícita):** profiles += `plano text not null default 'teste'`,
  `teste_termina_em date`; trigger security definer `on_auth_user_created` em
  auth.users cria o profile com nome_loja dos metadados do signUp + fim do
  teste (data SP + 30). `on conflict do nothing` (idempotente, não toca contas
  existentes). Verificado por SQL: 2 colunas, 1 trigger, 3 profiles antigos com
  default. Racional do trigger: funciona com confirmação de email ligada OU
  desligada (sem sessão o cliente não passaria na RLS pra inserir o próprio
  profile).
- **useAuth.jsx** ganhou `cadastrar(email, senha, nomeLoja)`: signUp com
  `options.data.nome_loja` nos metadados; mapeia erros pra
  PT-BR; detecta email repetido inclusive no caso silencioso do Supabase
  (user com `identities: []` quando a confirmação está ligada); retorna
  `{ precisaConfirmarEmail }`.
- **UI:** `src/pages/Cadastro.jsx` (lazy), visual espelhado no Login (mesmos
  tokens/classes; erros por campo; tela "Confirme seu email"; mostra a data de
  fim do teste via calcularFimTeste). Login ganhou link "Criar conta grátis"
  (prop `aoCriarConta`). App.jsx: estado `telaAuth` no fluxo deslogado, com
  deep link `window.location.pathname === '/cadastro'` (destino do "Começar
  grátis" da landing). `vercel.json` novo com rewrite SPA (antes /cadastro
  daria 404 no Vercel).
- **Fora do escopo (specs futuras):** enforcement de paywall (20 clientes no
  grátis, travas pós-teste), pagamento Pix, push. `perfilCompleto` só exige
  nome_loja → quem se cadastra cai direto no dashboard.
- **Config pendente no painel do Supabase (decisão de produto):** desligar a
  confirmação obrigatória de email (Auth → Sign In/Providers → Email) pra
  reduzir atrito; o código funciona nos dois modos.
- Deploy do front NÃO feito ainda (aguardando pedido do usuário).

---

# Progresso — Revisão de Segurança + Fix #1 (auth do cron na Edge Function)

Revisão de segurança do app inteiro (pedido do usuário), feita com Opus + MCP
do Supabase (leitura ao vivo do projeto sactjyyildfmycndujoz).

## Veredito da auditoria
Nenhuma vulnerabilidade crítica de isolamento. O essencial (RLS multi-loja) está
correto: políticas `ALL` com `user_id = auth.uid()` em qual E with_check nas
tabelas `clientes`/`vendas`; `profiles` com `id = auth.uid()`; colunas `user_id`
com default `auth.uid()` (por isso o insert do front não precisa setar user_id).
Sem segredos hardcoded no front, sem service_role no cliente (só na edge
function), sem `dangerouslySetInnerHTML`/XSS, PDF gerado sem `.html()`.

Achados (todos baixos/hardening): [1] edge function sem auth — corrigido abaixo;
[2] bucket `logos` público permite listagem/enumeração (advisor); [3] jspdf→
dompurify com CVEs de XSS não exploráveis hoje (não usa `.html()`); [4] UNIQUE
global no CPF (oráculo de existência cross-loja); [5] leaked-password protection
off; [6] pg_net no schema public.

## Fix #1 — autenticação do cron na Edge Function lembrete-diario
Problema: o cron chamava a função só com a publishable key (pública, no bundle) +
verify_jwt=true não barra isso → qualquer um com a URL disparava o lembrete
(spam no WhatsApp do dono + consumo da cota CallMeBot). Não vazava dados.

Solução (segredo compartilhado, sem eu ver o valor e sem hardcode no repo público):
- Migração `20260710_lembrete_auth_secret.sql` (aplicada ao vivo via MCP
  apply_migration): tabela `public.app_config` (RLS on, sem políticas, revoke de
  anon/authenticated → inacessível via API) com segredo aleatório gerado no banco
  (2x uuid). Cron reagendado enviando `x-cron-secret` lido do app_config em tempo
  de execução (nunca materializado no texto do job).
- Função `index.ts` (deploy v2 via MCP, verify_jwt mantido true): lê o segredo do
  app_config com o service role client (bypassa RLS) e compara com o header
  recebido; 401 `nao_autorizado` se faltar/errar. Ordem de deploy sem downtime:
  migração → cron passa a mandar o header (função antiga ignora) → deploy da nova.
- Deploy da função foi bloqueado 1x pelo classifier de auto mode (deploy em prod);
  usuário autorizou explicitamente e reexecutou.

Verificação real (não suposição): TESTE 401 via curl com a publishable key mas
SEM segredo → `{"ok":false,"erro":"nao_autorizado"}` HTTP 401; com segredo errado
→ 401. TESTE legítimo via `net.http_post` (lendo o segredo do app_config, como o
cron) → HTTP 200 `{"ok":true,"enviado":true}` (confirmou que NÃO quebrou o
lembrete). Efeito colateral do teste positivo: como havia atraso na conta, uma
mensagem real de lembrete foi enviada ao WhatsApp do pai fora do horário.

## Fixes #2, #3, #4 — via subagentes paralelos (worktree isolado, Sonnet)
Usuário pediu "faça todos, delegue subagentes pra cada um". 3 subagentes em
paralelo; controlador integrou os resultados.

- **#3 jspdf (feito + deploy):** jspdf 2.5.2→4.2.1 (dompurify transitivo 2.5.9→
  3.4.11, fora da faixa vulnerável). gerarPDF.js não precisou de mudança (API
  idêntica; subagente rodou sanity de PDF em runtime). npm audit 2→0 vulns,
  131/131 testes, build limpo. Commit cherry-picked (86a11aa) + push. Deploy
  Production 5be13cd confirmado (gh: success).
- **#2 bucket logos (feito ao vivo):** subagente confirmou bucket público (URL
  serve o objeto sem depender da SELECT policy) e aplicou via apply_migration
  `drop policy "logos_public_read" on storage.objects`. Verificado empiricamente:
  antes listagem anônima enumerava o ID da loja; depois retorna []; URL da logo
  segue 200. Migration versionada (20260710_logos_sem_listagem.sql), cherry-pick
  5be13cd + push. Advisor não aponta mais o bucket.
- **#4 CPF (APLICADO):** subagente confirmou constraint global
  `clientes_cpf_unique` UNIQUE(cpf); read-only nos dados → nenhum CPF em >1 loja
  (migrar p/ unique(user_id,cpf) é estritamente mais permissivo, seguro); código
  já compatível (checagem proativa é RLS-scoped por loja). Usuário aprovou
  explicitamente (apply bloqueado 1x pelo classifier → confirmação → aplicado).
  Migration `20260710_cpf_unique_por_loja.sql` aplicada via MCP apply_migration.
  Verificado: `pg_constraint` mostra só `clientes_cpf_unique_por_loja UNIQUE
  (user_id, cpf)`; a global sumiu. Passa a permitir o mesmo CPF em lojas
  diferentes e fecha o oráculo de existência cross-loja.

- **#5 leaked-password protection: NÃO aplicável no plano Free.** Usuário
  navegou até Authentication → Attack Protection → Email provider → "Prevent use
  of leaked passwords" e ao salvar recebeu: "Configuring leaked password
  protection via HaveIBeenPwned.org is available on Pro Plans and up." O projeto
  está no plano Free (org dn3almeida-star FREE). Decisão: hardening de baixa
  prioridade, não justifica upgrade pago. Deixado de fora conscientemente.

Pendência restante (hardening baixo, não feito): #6 pg_net no schema public.

## Auditoria de segurança FECHADA (2026-07-10)
Resolvidos e no ar: #1 (auth cron edge function), #2 (bucket logos sem listagem),
#3 (jspdf 4.2.1, 0 CVEs), #4 (CPF unique por-loja). #5 bloqueado por plano Free
(justificado). Base sólida confirmada: RLS multi-loja correto, sem segredos no
front, sem XSS. Commits d1370cd → 557f86c na feat/saas-multi-vendedor.

---

# Progresso — Fix: perda de tela/rascunho ao reabrir o app

Sem spec/plano formal — bugfix direto via debugging sistemático (skill
`superpowers:systematic-debugging`), reportado pelo usuário em conversa.

## Bug reportado
Ao cadastrar cliente/venda, se o usuário saísse do app (PWA) e voltasse, a
tela já tinha saído do cadastro. Causa raiz: PWA é encerrado pelo SO em
segundo plano; ao reabrir, o React remonta do zero e `paginaAtiva` (só
`useState`, sem persistência) volta pro `'dashboard'` padrão.

## Tentativa 1 (commit local, não publicada): sessionStorage
Criado `navegacao.js` com `sessionStorage` pra lembrar a página atual.
Testes unitários verdes, mas **usuário reportou que não funcionou** — dois
problemas achados na virada: (1) o fix nunca foi commitado/publicado (só
rodei testes da função pura, nunca exerci o app de verdade — erro meu de
alegar "verificado" sem checar deploy); (2) `sessionStorage` é apagado
quando o SO mata o processo do PWA em segundo plano — exatamente o cenário
do bug. Não servia.

## Tentativa 2 (commits 7ac2d05 + 2fe40d9): localStorage com prazo
- `armazenamentoTemporario.js`: empacota/desempacota com carimbo de tempo,
  TTL padrão 30min (`empacotarComPrazo`/`desempacotarComPrazo` puras +
  wrappers `salvar/obter/limparComPrazo` via `localStorage`, que sobrevive
  ao SO encerrar o PWA). 9 testes (round-trip real com localStorage mockado
  + `Date.now` mockado pra expiração).
- `navegacao.js` migrado de sessionStorage pra este mecanismo.
- `rascunho.js`: chaves de rascunho de cliente/venda + `deveUsarRascunhoVenda`
  (pura) — decide se restaura o rascunho de venda dado um cliente
  pré-selecionado diferente do rascunho salvo. 4 testes.
- `Clientes.jsx`/`NovaVenda.jsx`: restauram rascunho na abertura (lazy
  `useState`), salvam a cada mudança (`useEffect`), limpam ao salvar com
  sucesso ou cancelar.
- `useAuth.jsx`: limpa navegação + os dois rascunhos no evento `SIGNED_OUT`
  (isolamento multi-loja — evita um lojista herdar rascunho de outro no
  mesmo aparelho compartilhado).
- App.jsx: leitura do storage movida pra inicializador lazy do useState
  (evitava re-leitura a cada render).

131/131 testes, build limpo. Commit `7ac2d05` (fix) + `2fe40d9` (empty
commit pra acionar o primeiro deploy pós-integração).

## Deploy — descoberta importante
Repositório **não tinha integração Vercel↔GitHub** (deploys anteriores
eram todos via `vercel --prod` manual no terminal de alguém). Sem essa
integração e sem Vercel CLI/token neste ambiente, eu não tinha como
publicar. Guiei o usuário a conectar Git em vercel.com → Project Settings
→ Git → Connect (aponta pro repo `dn3almeida-star/sistema-fiado`).
**A partir de agora, todo push pra `feat/saas-multi-vendedor` publica
sozinho** — não depende mais de terminal/CLI local.

Verificação real (não suposição): `gh api .../deployments` confirmou
deploy `Production` pro commit `2fe40d9`; `gh api .../commits/.../status`
retornou `success`; `curl` no domínio de produção retornou 200 com bundle
novo. **Usuário confirmou no celular: funcionou.**

## Lição registrada
Não declarar "corrigido"/"verificado" sem (1) confirmar que o commit foi
de fato publicado (não só testado localmente) e (2) validar o mecanismo
de storage escolhido contra o cenário real de falha (sessionStorage vs.
localStorage fazem diferença crítica quando o gatilho é o SO matando o
processo, não um simples refresh de página).

---

# Progresso — Automação: Plano B (Lembrete Diário no WhatsApp)

Spec: docs/superpowers/specs/2026-07-04-automacao-cobranca-design.md
Plano B: docs/superpowers/plans/2026-07-04-lembrete-diario.md (base b8a9710)

## Tasks

Task 1: complete (commit 74d94d1). resumoDia.ts: funções puras resumoDia (conta atrasadas/vencendo hoje, soma total, top 3 urgentes), montarMensagem (formata texto do WhatsApp), dataSaoPaulo (resolve dia no fuso America/Sao_Paulo). resumoDia.test.js com casos de contagem, limite/desempate do top 3, parcelas pagas/futuras ignoradas, cliente sem telefone incluído (lembrete é pro lojista), venda de cliente inexistente ignorada, fila vazia. Suíte verde.
Task 2: complete (commit ea65b51). index.ts (casca Deno): lê secrets (OWNER_USER_ID, CALLMEBOT_PHONE, CALLMEBOT_APIKEY), consulta vendas/clientes do dono via service role, chama resumoDia/montarMensagem, dispara CallMeBot; fila vazia não envia nada, erro de query/CallMeBot loga e retorna 200. Migração 20260704_lembrete_cron.sql: habilita pg_cron/pg_net, agenda `0 11 * * *` (08:00 America/Sao_Paulo), reagendamento seguro via unschedule condicional.
Task 3: complete (deploy guiado, feito junto com o usuário em 2026-07-04/05). Destinatário do lembrete: WhatsApp do pai do usuário (não o dono da conta de login — app é multi-vendedor, cada loja tem seus próprios dados). CallMeBot ativado a partir do número do pai (número do bot mudou do que estava no plano — CallMeBot roda numa rotação de números por causa de bans do WhatsApp; número atual funcional: +34 621 07 32 45). OWNER_USER_ID resolvido via SQL Editor pro email joseiram02@hotmail.com (conta separada do pai no sistema). Node.js precisou ser instalado do zero na máquina (winget install OpenJS.NodeJS.LTS) e a execution policy do PowerShell precisou ser liberada (Set-ExecutionPolicy -Scope CurrentUser RemoteSigned) pra rodar `npx`. Supabase CLI: login, link (PROJECT_REF sactjyyildfmycndujoz), secrets set (os 3), functions deploy lembrete-diario — deploy ok. Teste manual via curl: fila vazia inicialmente (nada vencido de verdade na conta do pai); criado cliente/venda de teste na conta dele com parcela vencendo hoje → curl retornou `{"ok":true,"enviado":true}` → mensagem confirmada recebida no WhatsApp do pai (screenshot). Cron agendado via SQL Editor com a URL da function e a nova **publishable key** (sb_publishable_..., substitui a anon key legada no dashboard atual do Supabase) como Bearer token; confirmado via `select jobname, schedule, active from cron.job` → `lembrete-diario | 0 11 * * * | true`.

## AS 3 tasks completas. Plano B no ar (cron ativo, 08:00 America/Sao_Paulo).

**Pendente (usuário):** apagar o cliente/venda de teste ("Daniel teste") cadastrado na conta do pai pra validar a entrega — não é dado real.
**Verificação final ainda não feita:** conferir `cron.job_run_details` depois da primeira execução real (~08:00 do dia seguinte) pra confirmar `status = 'succeeded'` end-to-end sem intervenção manual.

---

# Progresso — Automação: Plano A (Modo Cobrança)

Spec: docs/superpowers/specs/2026-07-04-automacao-cobranca-design.md
Plano A: docs/superpowers/plans/2026-07-04-modo-cobranca.md (base b8a9710)
Brainstorming decidiu: híbrido (app organiza + user envia; sem envio automático em massa).
Plano B (lembrete diário Supabase+CallMeBot) fica pra depois.

Task 1: complete (commit 3cc42bf, review clean). filaCobranca.js: construirFilaCobranca(vendas, clientes, hojeISO, agoraISO) → ItemFila[] {cliente, parcela, venda, diasAtraso, jaCobradoHoje}. Filtra não-pagas + venc<=hoje + cliente com telefone; ordena já-cobrado-hoje pro fim, mais atrasada, desempate ultimaCobrancaEm mais antigo (nunca=0), nome. 5 testes (TZ fixado). Revisor (Sonnet) rodou a suíte e checou o comparador sinal-a-sinal. Spec ✅, Quality ✅. Suíte 105/105.
Task 2: complete (commit 4d01309, review clean). ModoCobranca.jsx (tela guiada: snapshot da fila via useState lazy, progresso i/N, mensagem editável, Enviar=registra→window.open wa.me→avança/erro não avança, Pular avança, fim "cobrou X de N"), App.jsx (rota lazy 'modo-cobranca'), CobrancasHoje.jsx (botão "Iniciar cobrança do dia (N)" reusando construirFilaCobranca). build + 105/105. BottomNav intocado. Spec ✅, Quality ✅. ⚠️ só validação manual do window.open no mobile (mesmo padrão do BotaoCobranca já em prod).

## Plano A: AS 2 tasks completas.
Revisão final (Opus): Ready to merge YES, limpo. 7 invariantes verificados (fila↔tela, envio pós-sucesso, fim sem crash, snapshot, rota, sem regressão, datas sem bug de fuso). 3 minors cosméticos, sem ação. build + 105/105.
Deploy do Plano A: PENDENTE (decisão do usuário — sozinho ou junto com Plano B).

---

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

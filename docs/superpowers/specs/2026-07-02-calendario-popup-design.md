# Calendário como Popup + Polimento Visual — Design Spec

**Goal:** Transformar o calendário de período (já em produção, inline) num popup que aparece por cima da tela, restringir a aba Ano ao ano atual em diante, e melhorar o acabamento visual/fluidez.

**Contexto:** A feature "Calendário Visual no Filtro de Período" já está em produção. Hoje o `SeletorPeriodo` aparece embutido na tela, embaixo da busca, empurrando a lista de vendas pra baixo. O usuário quer que ele apareça como um popup flutuante (com fundo escurecido atrás), acionado por um campo clicável, e pediu 3 melhorias adicionais: aba Ano só a partir do ano atual, visual mais bonito/fluido, e memória de navegação por 5 minutos.

---

## Escopo

**Dentro do escopo:**
- Trocar o texto estático "Filtrando por período" por um **campo/botão clicável** (ícone de calendário + rótulo).
- O calendário abre como **popup** (modal com fundo escurecido), no mesmo padrão visual de outros modais do app (ex: `BotaoCobranca.jsx`).
- Selecionar um dia/mês/ano **fecha o popup automaticamente**.
- Aba Ano: mostra os anos a partir do **ano corrente em diante** (não mais uma década fixa) — não é possível navegar pra anos anteriores ao atual.
- Polimento visual: células de dia circulares, indicador sutil pro dia de hoje, mais espaçamento.
- Polimento de movimento (usando `framer-motion`, já usado no app): pílula deslizante nas abas Dia/Mês/Ano, entrada suave do popup (fade + zoom leve), transição suave ao trocar de mês.
- **Memória de navegação por 5 minutos:** reabrir o popup dentro de 5 minutos da última vez que foi fechado mantém a aba e a posição de navegação (mês/ano/página visualizados) de onde o usuário parou. Depois de 5 minutos sem abrir, reseta para o padrão (aba Dia, mês atual). Esse timer é interno, sem indicação visual nenhuma (invisível ao usuário).

**Fora do escopo:**
- Mudar o valor do filtro já aplicado (`busca`/`granularidadePeriodo`) por causa do timer — o timer afeta só a *navegação visual* do calendário (qual mês/aba está sendo exibido), nunca o filtro que já está sendo aplicado na lista.
- Restringir Dia/Mês ao presente (só a aba Ano tem essa restrição, confirmado com o usuário).
- Novo comportamento de fechar por toque-fora-do-popup (mantém o padrão já usado no app: botão X explícito).

---

## 1. Arquitetura — popup com memória de navegação

Para lembrar a posição de navegação por 5 minutos entre uma abertura e outra do popup, o `SeletorPeriodo` precisa continuar **montado** (vivo) durante toda a sessão em que `modo === 'periodo'` na tela de Vendas — ele só esconde seu conteúdo visualmente quando fechado, em vez de desmontar. Isso é uma mudança de contrato:

**Prop novo:** `SeletorPeriodo({ aberto, onFechar, valor, onSelecionar })`
- `aberto` (boolean): controla se o popup está visível. Quando `false`, o componente renderiza `null` — mas continua montado (seu estado interno de navegação não é perdido).
- `onFechar` (function): chamado quando o usuário fecha explicitamente (botão X), sem selecionar nada.
- `valor`, `onSelecionar`: mesmo contrato de antes.

**Lógica do timer (interna ao `SeletorPeriodo`):**
- Um `useRef` guarda o timestamp da última vez que `aberto` passou de `true` pra `false` (fechamento).
- Quando `aberto` passa de `false` pra `true` (abertura), compara `Date.now()` com esse timestamp:
  - Se passou **5 minutos ou mais** (ou é a primeira abertura): reseta a navegação interna pro padrão (aba Dia, mês/ano atual, primeira página de anos).
  - Se passou **menos de 5 minutos**: não mexe em nada — a navegação continua exatamente onde estava.
- Isso funciona porque o componente nunca desmonta enquanto `modo === 'periodo'` — só alterna entre renderizar o popup e renderizar `null`.

**`ListaVendas.jsx`:**
- Novo estado: `calendarioAberto` (boolean, default `false`).
- O antigo texto estático "Filtrando por período" vira um botão: mostra "Escolher período" (sem seleção) ou o valor formatado (ex: "15/07/2026", "Julho de 2026", "2026") quando já há uma seleção. Tocar nele abre o popup (`setCalendarioAberto(true)`).
- `<SeletorPeriodo>` é renderizado sempre que `modo === 'periodo'` (não só quando `calendarioAberto` é `true`) — é ele mesmo quem decide, internamente, se mostra o popup ou nada, via a prop `aberto`.
- `onSelecionar` (repassado pro `SeletorPeriodo`) atualiza `busca`/`granularidadePeriodo` **e** fecha o popup (`setCalendarioAberto(false)`).
- `onFechar` só fecha o popup (`setCalendarioAberto(false)`), sem mexer no filtro.

## 2. Rótulo do período escolhido

Nova função pura em `src/utils/calendario.js`:

```
rotuloPeriodo(granularidade, valor) → string
```

- `granularidade === 'dia'`, `valor = 'YYYY-MM-DD'` → `"DD/MM/YYYY"`.
- `granularidade === 'mes'`, `valor = 'YYYY-MM'` → `"{Mês por extenso} de YYYY"` (ex: "Julho de 2026").
- `granularidade === 'ano'`, `valor = 'YYYY'` → `"YYYY"` (o próprio valor).
- `valor` vazio (`''`) → string vazia (`ListaVendas` usa isso pra decidir entre mostrar o placeholder "Escolher período" ou o rótulo).

## 3. Aba Ano — a partir do ano atual

- Remove o conceito de "década" (`decadaDoAno`) inteiramente — não faz mais sentido com "a partir do ano atual em diante".
- Novo comportamento: a página de anos exibida começa no **ano atual** (`hoje.getFullYear()`) e mostra 10 anos (grade 2×5, como já é hoje).
- Navegar "próximo" sempre soma 10 ao início da página. Navegar "anterior" só é permitido se a página resultante não ficar abaixo do ano atual — a seta "anterior" fica desabilitada (visualmente apagada, sem ação) quando a página já é a primeira (o ano atual).
- **`decadaDoAno` e seu teste são removidos** de `src/utils/calendario.js`/`calendario.test.js` — ficam órfãos com essa mudança (só eram usados pra semear a década inicial da aba Ano, que deixa de existir).

## 4. Polimento visual

- **Dias circulares:** as células de dia (aba Dia) trocam de `rounded-lg` pra `rounded-full`, com o número centralizado.
- **Indicador de hoje:** o dia correspondente à data de hoje (quando não é o dia selecionado) ganha um contorno sutil na cor primária (ex: `ring-2 ring-primary text-primary font-semibold`), distinguindo-o visualmente dos outros dias sem chamar tanta atenção quanto o dia selecionado (que continua com fundo verde sólido).
- **Espaçamento:** aumentar ligeiramente o `gap` entre as células das 3 grades, pra alvos de toque mais confortáveis.

## 5. Polimento de movimento (`framer-motion`)

- **Pílula deslizante nas abas:** o fundo verde por trás da aba ativa (Dia/Mês/Ano) passa a ser um `motion.div` com `layoutId` compartilhado entre as 3 abas — ao trocar de aba, a pílula desliza suavemente até a nova posição, em vez de trocar de cor instantaneamente.
- **Entrada do popup:** o fundo escurecido some/aparece com fade; o cartão do calendário entra com fade + leve zoom (`scale` de 0.95 pra 1), usando `AnimatePresence` — mesma técnica de transição já usada em outras partes do app.
- **Transição de mês:** ao navegar entre meses (aba Dia), a grade de dias troca com uma transição suave de fade (sem necessidade de detectar direção pra frente/trás — mantém simples).

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/calendario.js` | Remove `decadaDoAno`. Adiciona `rotuloPeriodo(granularidade, valor)`. |
| `src/utils/calendario.test.js` | Remove os testes de `decadaDoAno`. Adiciona testes de `rotuloPeriodo`. |
| `src/components/SeletorPeriodo.jsx` | Novo contrato de props (`aberto`, `onFechar`). Renderiza popup (fundo escurecido + cartão) ou `null`. Timer de 5 min via `useRef`. Aba Ano reescrita (sem década). Polimento visual e de movimento. |
| `src/components/ListaVendas.jsx` | Novo estado `calendarioAberto`. Botão clicável no lugar do texto estático. `SeletorPeriodo` sempre renderizado quando `modo === 'periodo'`. |

Nenhuma mudança em: `src/utils/filtroVendas.js` (a função de filtragem não muda), banco de dados.

---

## Testes

`calendario.test.js` (TDD):
- Remove os 4 testes de `decadaDoAno` (função removida).
- Adiciona testes de `rotuloPeriodo`: formata dia (`'2026-07-15'` → `'15/07/2026'`), mês (`'2026-07'` → `'Julho de 2026'`), ano (`'2026'` → `'2026'`), valor vazio (`''` → `''`).

`SeletorPeriodo.jsx`/`ListaVendas.jsx`: sem teste automatizado (componentes de apresentação, mesma convenção do projeto). Verificação manual: abrir/fechar o popup várias vezes reabrindo rápido (deve manter a navegação) e esperando 5+ minutos (deve resetar); aba Ano não deixa voltar antes do ano atual; visual dos dias circulares e indicador de hoje; pílula deslizante ao trocar de aba.

## Global Constraints

- `vendaNoPeriodo` (já existente) não muda.
- Restrição "só ano atual em diante" é exclusiva da aba Ano — Dia e Mês continuam navegáveis livremente (inclusive pro passado, essencial pra filtrar vendas antigas).
- Sem indicação visual do timer de 5 minutos — é uma lógica interna, invisível ao usuário.
- Selecionar um valor fecha o popup automaticamente.
- Fechar o popup (X ou seleção) não afeta o filtro já aplicado, só a navegação visual futura do calendário.
- Sem biblioteca de datas nova — `Date` nativo. `framer-motion` já é dependência existente do projeto (não é uma lib nova).
- Sem mudanças de banco de dados.

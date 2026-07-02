# Tom de Mensagem na Cobrança — Design Spec

**Goal:** Permitir que o lojista escolha entre dois tons de mensagem (Educado / Formal) ao cobrar uma parcela em aberto pelo WhatsApp, além do tom único que existe hoje.

**Contexto:** O sistema já gera automaticamente uma mensagem de cobrança (`gerarMensagemCobranca`, em `src/utils/mensagensCobranca.js`) ao clicar no botão WhatsApp (`BotaoCobranca.jsx`), abrindo um modal com a mensagem pronta e editável antes de enviar. Hoje só existe um tom ("Educado"). O objetivo é adicionar um segundo tom ("Formal/direto") que o lojista pode escolher no próprio modal, sem precisar editar o texto manualmente toda vez que quiser um tom mais objetivo.

`BotaoCobranca` é usado em dois lugares: `CobrancasHoje.jsx` (só parcelas que vencem hoje) e `PerfilCliente.jsx` (qualquer parcela do histórico — atrasada, vencendo hoje, ou futura). Por isso a mensagem formal precisa se ajustar corretamente aos três casos de vencimento, não só "vence hoje".

---

## Escopo

**Dentro do escopo:**
- Parâmetro de tom (`'educado'` | `'formal'`) em `gerarMensagemCobranca`
- Três variações do texto formal, conforme a parcela está atrasada, vence hoje, ou vence no futuro
- Toggle `[Educado] [Formal]` dentro do modal existente em `BotaoCobranca.jsx`, visível apenas para cobrança de parcela em aberto

**Fora do escopo:**
- Mensagem de confirmação de pagamento (parcela já paga) — continua igual a hoje, sem tom, sem toggle
- Novos tons além de Educado/Formal (Amigável, Atraso/urgente foram cogitados e descartados nesta rodada)
- Persistir a escolha de tom (perfil da loja, localStorage, etc.) — o modal sempre abre no tom Educado por padrão
- Mudanças de schema/banco de dados

---

## 1. Lógica (`gerarMensagemCobranca`)

Assinatura nova: `gerarMensagemCobranca(parcela, cliente, venda, tom = 'educado')`.

O parâmetro `tom` só é considerado quando `parcela.pago === false` (cobrança). Quando `parcela.pago === true` (confirmação de recebimento), o comportamento é idêntico ao atual, ignorando `tom` completamente.

Quando `tom === 'formal'`, a função reaproveita `diasAteVencimento` (já existe em `src/utils/formatadores.js`, mesma lógica usada por `statusParcela`) para escolher entre 3 frases:

| Situação | Condição (`diasAteVencimento`) | Texto |
|----------|-------------------------------|-------|
| Atrasada | `dias < 0` | "Prezado(a) {nome}, informamos que uma parcela de {valor} venceu em {data}. Podemos regularizar o pagamento?" |
| Vence hoje | `dias === 0` | "Prezado(a) {nome}, informamos que hoje vence uma parcela de {valor}. Podemos regularizar o pagamento?" |
| A vencer | `dias > 0` | "Prezado(a) {nome}, informamos que vence em {data} uma parcela de {valor}. Podemos regularizar o pagamento?" |

Em todos os três casos, se `venda?.numero` existir, insere-se `(Pedido #N)` antes da pergunta final, no mesmo padrão já usado pelo tom Educado hoje.

O tom `'educado'` mantém exatamente o texto e comportamento atuais — nenhuma mudança nesse branch.

---

## 2. UI (`BotaoCobranca.jsx`)

Dentro do modal que já abre ao clicar em WhatsApp:
- Quando a parcela está em aberto (`!parcela.pago`): aparece um toggle segmentado `[Educado] [Formal]` acima da caixa de texto, no mesmo padrão visual do toggle Fiado/À Vista já usado em `NovaVenda.jsx` (dois botões, um ativo destacado).
- O modal sempre abre com o tom **Educado** selecionado (não lembra a última escolha entre aberturas).
- Trocar o toggle chama `gerarMensagemCobranca` novamente com o novo tom e substitui o texto da caixa (o usuário pode editar livremente depois de escolher o tom).
- Quando a parcela já está paga (mensagem de confirmação de recebimento): o toggle **não aparece**.

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/mensagensCobranca.js` | `gerarMensagemCobranca` ganha parâmetro `tom`, com 3 variações formais por status de vencimento |
| `src/utils/mensagensCobranca.test.js` | Novos testes para o tom formal (atrasada/hoje/futura) e confirmação de que parcela paga ignora `tom` |
| `src/components/BotaoCobranca.jsx` | Toggle Educado/Formal no modal, visível só para cobrança |

Nenhuma mudança em: `CobrancasHoje.jsx`, `PerfilCliente.jsx` (ambos já passam `parcela`/`cliente`/`venda` para `BotaoCobranca`, que assume o parâmetro `tom` internamente — nenhum consumidor precisa mudar), banco de dados.

---

## Testes

`mensagensCobranca.test.js` (já existe, com 4 testes de cobrança/recebimento/pedido) recebe novos casos:
- Tom formal, parcela atrasada (`dias < 0`): mensagem contém "venceu em"
- Tom formal, parcela vence hoje (`dias === 0`): mensagem contém "hoje vence"
- Tom formal, parcela a vencer (`dias > 0`): mensagem contém "vence em"
- Tom formal com `venda.numero`: mensagem contém "(Pedido #N)"
- Parcela paga com `tom = 'formal'`: mensagem idêntica à gerada sem o parâmetro (tom ignorado)
- Tom `'educado'` (ou omitido): comportamento idêntico aos 4 testes já existentes (regressão)

`BotaoCobranca.jsx` não tem teste automatizado hoje (é um componente com efeito colateral de abrir link externo) — verificação do toggle será manual: abrir o modal de cobrança de uma parcela atrasada, uma vencendo hoje e uma futura, alternar entre Educado/Formal em cada uma e conferir o texto gerado.

## Global Constraints

- Tom `'educado'` (comportamento atual) não pode mudar — zero regressão nos 4 testes existentes.
- Reaproveitar `diasAteVencimento` de `formatadores.js` — não duplicar lógica de cálculo de dias.
- Toggle só aparece para cobrança (parcela em aberto), nunca para confirmação de pagamento.
- Sem persistência de preferência de tom — sempre abre em Educado.
- Sem mudanças de banco de dados.

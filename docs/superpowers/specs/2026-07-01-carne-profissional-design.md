# Carnê Profissional — Design Spec

**Goal:** Deixar o carnê de pagamento (PDF gerado em `gerarCarnetPDF`) com aparência mais profissional: resumo financeiro em destaque, status colorido por parcela (reaproveitando a lógica já usada no app), canhoto destacável por parcela, e logo em maior destaque.

**Contexto:** O carnê atual (`src/utils/gerarPDF.js`) é uma tabela única de parcelas em preto e branco, sem resumo financeiro, sem indicação visual de urgência por parcela, e assume que tudo cabe em uma única página A4 (sem paginação). O objetivo aqui é uma melhoria puramente visual/estrutural do PDF — sem mudanças de modelo de dados, sem novos campos no banco.

---

## Escopo

**Dentro do escopo:**
- Resumo financeiro (Total / Pago / Restante)
- Status colorido por parcela (mesma paleta de `statusParcela` em `formatadores.js`)
- Canhoto destacável: cada parcela vira um bloco/ticket com linha de corte pontilhada
- Paginação automática (o carnê atual não pagina — com os tickets maiores, isso se torna necessário)
- Logo em destaque maior no cabeçalho (quando a loja tiver uma cadastrada)

**Fora do escopo:**
- Novos campos na loja/perfil (ex: chave Pix, QR code) — a loja hoje só tem `nome_loja`, `telefone`, `logo_url`
- Mudança na forma como o carnê é acionado (continua o botão "Gerar Carnê PDF" existente em `PerfilCliente.jsx`)
- Mudanças no modelo de dados de vendas/parcelas

---

## 1. Resumo Financeiro

Novo box logo após a seção "DADOS DA COMPRA", antes de "PARCELAS". Fundo verde claro (mesma família de cor do cabeçalho, ex: `rgb(240, 249, 244)`), com 3 valores lado a lado:

```
Total: R$ 280,00      Pago: R$ 0,00      Restante: R$ 280,00
```

- `Total` = `venda.valorTotal`
- `Pago` = soma de `parcela.valor` onde `parcela.pago === true`
- `Restante` = `Total - Pago` (já contempla vendas à vista: parcela única paga → Pago = Total, Restante = 0)

---

## 2. Status colorido por parcela

Reaproveita exatamente as 5 categorias de `statusParcela(parcela)` (já usada no app, `src/utils/formatadores.js:35-42`), traduzidas para RGB (paleta Tailwind padrão, mesmos tons das classes já usadas na tela):

| Situação | Condição | Texto | Cor de fundo (RGB) | Cor do texto (RGB) |
|----------|----------|-------|---------------------|----------------------|
| Pago | `pago === true` | "Pago" | `(220, 252, 231)` (green-100) | `(21, 128, 61)` (green-700) |
| Atraso | vencida, não paga | "Xd atraso" | `(254, 226, 226)` (red-100) | `(185, 28, 28)` (red-700) |
| Vence hoje | vence hoje, não paga | "Vence hoje" | `(255, 237, 213)` (orange-100) | `(194, 65, 12)` (orange-700) |
| Próxima (≤7 dias) | vence em até 7 dias | "Xd" | `(254, 249, 195)` (yellow-100) | `(161, 98, 7)` (yellow-700) |
| Normal | vence em mais de 7 dias | "Xd" | `(243, 244, 246)` (gray-100) | `(100, 100, 100)` |

A etiqueta é um retângulo preenchido (pill) com o texto dentro, desenhado com `doc.rect(...)` + `doc.text(...)`, mesma técnica já usada no cabeçalho do PDF atual.

---

## 3. Canhoto destacável (ticket por parcela)

Cada parcela deixa de ser uma linha de tabela e vira um bloco individual (~18mm de altura):

```
Parcela 1        Vencimento: 01/07/2026        R$ 93,33      [ Pago ]
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ (linha pontilhada) ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
Parcela 1 — Assinatura: _______________________________
```

**Estrutura de cada bloco (altura total ~18mm):**
- Linha 1 (texto normal + etiqueta colorida à direita): `Parcela N` (negrito) — `Vencimento: DD/MM/AAAA` — `R$ X,XX` (negrito) — etiqueta de status colorida alinhada à direita
- Linha de corte: linha pontilhada horizontal (`doc.setLineDashPattern([1, 1], 0)` + `doc.line(...)`) atravessando a largura útil
- Linha 2 (texto pequeno, cinza): `Parcela N — Assinatura: ` seguido de uma linha para assinar
- Espaçamento de ~4mm antes do próximo bloco

**Paginação automática:** antes de desenhar cada bloco, verificar se `y + 18 > 270` (limite de conteúdo antes do rodapé). Se ultrapassar, chamar `doc.addPage()`, resetar `y` para o topo (ex: `y = 20`), e escrever um cabeçalho leve `"PARCELAS (continuação)"` antes de continuar os blocos. O rodapé (loja + data de geração) é escrito uma única vez, ao final do loop de parcelas — como o jsPDF sempre escreve na página "atual", ele naturalmente cai na última página gerada, sem necessidade de repetir por página.

---

## 4. Logo em destaque

Quando a loja tiver `logo_url` cadastrada, aumentar o tamanho da logo no cabeçalho de 20×20mm para 24×24mm, mantendo a mesma posição (canto esquerdo do cabeçalho). Sem logo, o cabeçalho permanece como está hoje (nome da loja centralizado).

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/utils/gerarPDF.js` | Reescrita da função `gerarCarnetPDF`: resumo financeiro, status colorido, blocos de canhoto com paginação, logo maior |

Nenhuma mudança em: banco de dados, `useProfile.js`, `PerfilCliente.jsx` (o botão "Gerar Carnê PDF" continua chamando `gerarCarnetPDF` do mesmo jeito).

---

## Testes

Este é um utilitário que gera um PDF via `jsPDF` (side-effect: `doc.save(...)` dispara download no navegador) — não há teste automatizado prático para o conteúdo visual do PDF (mesma situação da implementação atual, que também não tem testes). Verificação será manual: gerar um carnê com poucas parcelas (1-3, cabe em uma página) e um carnê com muitas parcelas (10+, força paginação), conferindo visualmente:
- Resumo financeiro correto (Total/Pago/Restante)
- Cores de status corretas por parcela (pago, atrasado, a vencer)
- Canhoto com linha pontilhada visível entre blocos
- Segunda página aparece corretamente quando não cabe tudo, com cabeçalho de continuação
- Logo maior quando a loja tiver logo cadastrada
- Rodapé aparece corretamente na última página

## Global Constraints

- Sem migrations, sem novos campos no banco.
- Reaproveitar a paleta de cores já usada em `statusParcela` (não inventar cores novas).
- `npm run build` deve continuar passando sem erros.
- Manter o carregamento assíncrono do `jsPDF` (`await import('jspdf')`) já implementado — não reverter para import estático (regressão de bundle size).

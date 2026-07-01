# Carnê Profissional Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o carnê de pagamento (PDF gerado em `gerarCarnetPDF`) com aparência profissional: resumo financeiro em destaque, status colorido por parcela, canhoto destacável por parcela com paginação automática, e logo maior no cabeçalho.

**Architecture:** Um helper puro (`corPdfStatusParcela`) traduz a classificação de status já existente (`statusParcela`, em `formatadores.js`) para cores RGB usadas pelo jsPDF — mantendo uma única fonte de verdade para "quando uma parcela está atrasada/vence hoje/etc". A função `gerarCarnetPDF` é reescrita para usar esse helper, desenhar um box de resumo financeiro, transformar cada parcela num bloco tipo ticket com linha de corte pontilhada, e paginar automaticamente quando não couber mais na página.

**Tech Stack:** React 18 + Vite + Vitest. `jsPDF` (import dinâmico já existente — não alterar). Sem novas dependências.

## Global Constraints

- Sem migrations, sem novos campos no banco.
- Reaproveitar a paleta de cores já usada em `statusParcela` (não inventar cores novas).
- `npm run build` deve continuar passando sem erros.
- Manter o carregamento assíncrono do `jsPDF` (`await import('jspdf')`) já implementado — não reverter para import estático.
- Comandos rodam dentro de `sistema-fiado/`.

---

## File Structure

**Create:**
- `src/utils/corPdfStatus.js` — helper puro `corPdfStatusParcela(parcela) → { label, bg, texto }`
- `src/utils/corPdfStatus.test.js` — testes do helper

**Modify:**
- `src/utils/gerarPDF.js` — reescrita completa de `gerarCarnetPDF`

---

## Task 1: Helper puro `corPdfStatusParcela`

**Files:**
- Create: `src/utils/corPdfStatus.js`
- Create: `src/utils/corPdfStatus.test.js`

**Interfaces:**
- Consumes: `statusParcela(parcela)` já existente em `src/utils/formatadores.js` (retorna `{ label, cor, bg, texto }` onde `bg` é uma destas 5 strings exatas: `'bg-green-100'`, `'bg-red-100'`, `'bg-orange-100'`, `'bg-yellow-100'`, `'bg-surface-2'`)
- Produces: `corPdfStatusParcela(parcela) → { label: string, bg: [number,number,number], texto: [number,number,number] }` — `bg`/`texto` são arrays RGB `[r,g,b]` prontos para `doc.setFillColor(...)` / `doc.setTextColor(...)` do jsPDF

- [ ] **Step 1: Write the failing test**

Create `src/utils/corPdfStatus.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { corPdfStatusParcela } from './corPdfStatus.js'

function diasAPartirDeHoje(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

describe('corPdfStatusParcela', () => {
  it('parcela paga: verde', () => {
    const parcela = { pago: true, vencimento: diasAPartirDeHoje(-10) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('Pago')
    expect(r.bg).toEqual([220, 252, 231])
    expect(r.texto).toEqual([21, 128, 61])
  })

  it('parcela atrasada: vermelho', () => {
    const parcela = { pago: false, vencimento: diasAPartirDeHoje(-3) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('3d atraso')
    expect(r.bg).toEqual([254, 226, 226])
    expect(r.texto).toEqual([185, 28, 28])
  })

  it('parcela vence hoje: laranja', () => {
    const parcela = { pago: false, vencimento: diasAPartirDeHoje(0) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('Vence hoje')
    expect(r.bg).toEqual([255, 237, 213])
    expect(r.texto).toEqual([194, 65, 12])
  })

  it('parcela próxima (dentro de 7 dias): amarelo', () => {
    const parcela = { pago: false, vencimento: diasAPartirDeHoje(5) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('5d')
    expect(r.bg).toEqual([254, 249, 195])
    expect(r.texto).toEqual([161, 98, 7])
  })

  it('parcela normal (mais de 7 dias): cinza', () => {
    const parcela = { pago: false, vencimento: diasAPartirDeHoje(15) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('15d')
    expect(r.bg).toEqual([243, 244, 246])
    expect(r.texto).toEqual([100, 100, 100])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd c:/Users/Daniel-PC/Desktop/Jose\ Iran/sistema-fiado
npm test -- src/utils/corPdfStatus.test.js
```

Expected: FAIL — "Failed to resolve import './corPdfStatus.js'" ou "corPdfStatusParcela is not a function"

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/corPdfStatus.js`:

```javascript
import { statusParcela } from './formatadores.js'

const CORES_PDF = {
  'bg-green-100':  { bg: [220, 252, 231], texto: [21, 128, 61] },
  'bg-red-100':    { bg: [254, 226, 226], texto: [185, 28, 28] },
  'bg-orange-100': { bg: [255, 237, 213], texto: [194, 65, 12] },
  'bg-yellow-100': { bg: [254, 249, 195], texto: [161, 98, 7] },
  'bg-surface-2':  { bg: [243, 244, 246], texto: [100, 100, 100] },
}

export function corPdfStatusParcela(parcela) {
  const st = statusParcela(parcela)
  const cores = CORES_PDF[st.bg]
  return { label: st.label, bg: cores.bg, texto: cores.texto }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/utils/corPdfStatus.test.js
```

Expected: PASS (5 test cases)

- [ ] **Step 5: Commit**

```bash
git add src/utils/corPdfStatus.js src/utils/corPdfStatus.test.js
git commit -m "feat(carne-pdf): add corPdfStatusParcela helper mapping status to PDF colors"
```

---

## Task 2: Reescrita de `gerarCarnetPDF` com resumo financeiro, canhoto e paginação

**Files:**
- Modify: `src/utils/gerarPDF.js` (arquivo inteiro — será substituído por completo)

**Interfaces:**
- Consumes: `corPdfStatusParcela` (Task 1) de `./corPdfStatus.js`; `formatarData`, `formatarMoeda` (já existentes) de `./formatadores.js`
- Produces: `gerarCarnetPDF(cliente, venda, loja = {})` — mesma assinatura pública de antes, nenhum consumidor (`PerfilCliente.jsx`) precisa mudar

- [ ] **Step 1: Substituir o conteúdo de `src/utils/gerarPDF.js`**

Substituir o arquivo inteiro por:

```javascript
import { formatarData, formatarMoeda } from './formatadores.js'
import { corPdfStatusParcela } from './corPdfStatus.js'

const MARGEM = 10
const LARGURA = 190
const ALTURA_BLOCO_PARCELA = 18
const LIMITE_PAGINA = 260

export async function gerarCarnetPDF(cliente, venda, loja = {}) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margem = MARGEM
  const largura = LARGURA

  // Cabeçalho (forest green)
  doc.setFillColor(21, 78, 48)
  doc.rect(0, 0, 210, 28, 'F')

  // Logo da loja (se houver) — maior para mais destaque
  if (loja.logo_url) {
    try {
      const resp = await fetch(loja.logo_url)
      const blob = await resp.blob()
      const dataUrl = await new Promise(res => {
        const fr = new FileReader()
        fr.onload = () => res(fr.result)
        fr.readAsDataURL(blob)
      })
      doc.addImage(dataUrl, 'PNG', margem, 2, 24, 24)
    } catch {
      // sem logo se falhar o carregamento
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(loja.nome_loja || 'Caderno Digital', 105, 13, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Carnê de Pagamento', 105, 21, { align: 'center' })

  // Dados do cliente
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('DADOS DO CLIENTE', margem, 36)
  doc.setDrawColor(21, 78, 48)
  doc.line(margem, 38, margem + largura, 38)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Cliente: ${cliente.nome}`, margem, 44)
  doc.text(`Telefone: ${cliente.telefone || '-'}`, margem, 50)
  doc.text(`Bairro: ${cliente.bairro || '-'}`, 110, 44)

  // Dados da venda
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('DADOS DA COMPRA', margem, 62)
  doc.line(margem, 64, margem + largura, 64)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const itensLinhas = doc.splitTextToSize(`Itens: ${venda.itens}`, largura)
  doc.text(itensLinhas, margem, 70)

  const yDadosVenda = 70 + itensLinhas.length * 5
  doc.text(`Valor Total: ${formatarMoeda(venda.valorTotal)}`, margem, yDadosVenda + 4)
  if (venda.entrada > 0) {
    doc.text(`Entrada: ${formatarMoeda(venda.entrada)}`, 110, yDadosVenda + 4)
  }

  // Resumo financeiro — Pago inclui a entrada (dinheiro já recebido no ato),
  // além das parcelas já marcadas como pagas.
  const pagoParcelas = venda.parcelas.reduce((acc, p) => acc + (p.pago ? p.valor : 0), 0)
  const pago = (venda.entrada || 0) + pagoParcelas
  const restante = venda.valorTotal - pago

  const yResumo = yDadosVenda + 12
  doc.setFillColor(240, 249, 244)
  doc.roundedRect(margem, yResumo, largura, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(21, 78, 48)
  doc.text(`Total: ${formatarMoeda(venda.valorTotal)}`, margem + 4, yResumo + 9)
  doc.text(`Pago: ${formatarMoeda(pago)}`, margem + 70, yResumo + 9)
  doc.text(`Restante: ${formatarMoeda(restante)}`, margem + 132, yResumo + 9)
  doc.setTextColor(0, 0, 0)

  // Cabeçalho da seção de parcelas
  let y = yResumo + 14 + 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('PARCELAS', margem, y)
  doc.line(margem, y + 2, margem + largura, y + 2)
  y += 10

  function novaPaginaParcelas() {
    doc.addPage()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text('PARCELAS (continuação)', margem, 20)
    doc.line(margem, 22, margem + largura, 22)
    return 30
  }

  const totalParcelas = venda.parcelas.length

  venda.parcelas.forEach(p => {
    if (y + ALTURA_BLOCO_PARCELA > LIMITE_PAGINA) {
      y = novaPaginaParcelas()
    }

    const cor = corPdfStatusParcela(p)

    // Linha 1: Parcela N/Total | Vencimento | Valor | etiqueta de status
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(`Parcela ${p.numero}/${totalParcelas}`, margem, y + 5)

    doc.setFont('helvetica', 'normal')
    doc.text(`Vencimento: ${formatarData(p.vencimento)}`, margem + 42, y + 5)

    doc.setFont('helvetica', 'bold')
    doc.text(formatarMoeda(p.valor), margem + 100, y + 5)

    doc.setFillColor(cor.bg[0], cor.bg[1], cor.bg[2])
    doc.roundedRect(margem + 140, y, 40, 6, 1.5, 1.5, 'F')
    doc.setTextColor(cor.texto[0], cor.texto[1], cor.texto[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(cor.label, margem + 160, y + 4, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    // Linha de corte pontilhada (canhoto)
    doc.setDrawColor(180, 180, 180)
    doc.setLineDashPattern([1, 1], 0)
    doc.line(margem, y + 9, margem + largura, y + 9)
    doc.setLineDashPattern([], 0)

    // Linha 2: canhoto de assinatura
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Parcela ${p.numero}/${totalParcelas} — Assinatura:`, margem, y + 14)
    doc.setDrawColor(180, 180, 180)
    doc.line(margem + 60, y + 14, margem + largura, y + 14)
    doc.setTextColor(0, 0, 0)

    y += ALTURA_BLOCO_PARCELA
  })

  // Rodapé (cai naturalmente na última página gerada)
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  const contato = loja.telefone ? `${loja.nome_loja || 'Vendedor'} — ${loja.telefone}` : (loja.nome_loja || 'Vendedor')
  doc.text(contato, 105, 285, { align: 'center' })
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 290, { align: 'center' })

  const nomeArquivo = `carne-${cliente.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`
  doc.save(nomeArquivo)
}
```

- [ ] **Step 2: Rodar testes existentes (regressão)**

```bash
cd c:/Users/Daniel-PC/Desktop/Jose\ Iran/sistema-fiado
npm test
```

Expected: PASS (todos os testes existentes continuam passando — não há teste automatizado para o conteúdo visual do PDF, já era assim antes desta mudança)

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build sem erros

- [ ] **Step 4: Teste manual (visual)**

```bash
npm run dev
```

No navegador, abra o perfil de um cliente com pelo menos uma venda parcelada e gere o carnê ("Gerar Carnê PDF"). Verificar no PDF gerado:
- Logo maior no cabeçalho (se a loja tiver logo cadastrada) — sem logo, cabeçalho igual a antes
- Box de resumo financeiro aparece com Total / Pago / Restante corretos
- Cada parcela aparece como um bloco com linha pontilhada de corte abaixo
- Etiqueta de status colorida (verde/vermelho/laranja/amarelo/cinza) condizente com a situação real da parcela
- Linha de assinatura no canhoto de cada parcela

Depois, teste com uma venda de **10+ parcelas** (ou edite temporariamente `LIMITE_PAGINA` para um valor bem baixo, ex: `80`, gere o PDF, confirme a segunda página aparece com "PARCELAS (continuação)", depois desfaça a mudança temporária):
- Segunda página é criada automaticamente quando as parcelas não cabem mais
- Cabeçalho "PARCELAS (continuação)" aparece no topo da página extra
- Rodapé (nome da loja + data de geração) aparece corretamente na última página, não duplicado nas páginas anteriores

Por fim, gere o carnê de uma **venda à vista** (feature anterior): confirmar que Pago = Total e Restante = R$ 0,00 no resumo financeiro, e a parcela única aparece com etiqueta "Pago" (verde).

- [ ] **Step 5: Commit**

```bash
git add src/utils/gerarPDF.js
git commit -m "feat(carne-pdf): add financial summary, colored status, detachable ticket layout and pagination"
```

---

## Summary of Changes

| File | Type | Purpose |
|------|------|---------|
| `src/utils/corPdfStatus.js` | Create | Mapeia status da parcela (já existente) para cores RGB do PDF |
| `src/utils/corPdfStatus.test.js` | Create | Testes unitários (5 casos, um por categoria de status) |
| `src/utils/gerarPDF.js` | Modify | Resumo financeiro, status colorido, canhoto com paginação, logo maior |

**Total:** 2 arquivos criados, 1 arquivo modificado.

---

## Testing Checklist

Após completar todas as tasks:

- [ ] `npm test` — todos os testes passam (existentes + 5 novos de corPdfStatus)
- [ ] `npm run build` — sem erros
- [ ] Carnê com poucas parcelas (cabe em 1 página): resumo financeiro, cores e canhoto corretos
- [ ] Carnê com muitas parcelas: paginação automática funciona, cabeçalho de continuação aparece
- [ ] Rodapé aparece só na última página
- [ ] Venda à vista: Pago = Total, Restante = R$ 0,00, parcela única com etiqueta "Pago"
- [ ] Logo maior quando a loja tiver logo cadastrada; sem logo, cabeçalho seguindo padrão anterior
- [ ] `PerfilCliente.jsx` continua funcionando sem nenhuma alteração (mesma assinatura de `gerarCarnetPDF`)

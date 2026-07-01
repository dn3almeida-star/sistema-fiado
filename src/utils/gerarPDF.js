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

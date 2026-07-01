import { formatarData, formatarMoeda } from './formatadores.js'

export async function gerarCarnetPDF(cliente, venda, loja = {}) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const largura = 190
  const margem = 10

  // Cabeçalho (forest green)
  doc.setFillColor(21, 78, 48)
  doc.rect(0, 0, 210, 28, 'F')

  // Logo da loja (se houver)
  if (loja.logo_url) {
    try {
      const resp = await fetch(loja.logo_url)
      const blob = await resp.blob()
      const dataUrl = await new Promise(res => {
        const fr = new FileReader()
        fr.onload = () => res(fr.result)
        fr.readAsDataURL(blob)
      })
      doc.addImage(dataUrl, 'PNG', margem, 4, 20, 20)
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

  // Tabela de parcelas
  let y = yDadosVenda + 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('PARCELAS', margem, y)
  doc.line(margem, y + 2, margem + largura, y + 2)
  y += 8

  // Cabeçalho da tabela
  doc.setFillColor(21, 78, 48)
  doc.rect(margem, y, largura, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('Nº', margem + 3, y + 5.5)
  doc.text('Vencimento', margem + 20, y + 5.5)
  doc.text('Valor', margem + 75, y + 5.5)
  doc.text('Situação', margem + 120, y + 5.5)
  doc.text('Assinatura', margem + 155, y + 5.5)

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')

  venda.parcelas.forEach((p, i) => {
    y += 9
    if (i % 2 === 0) {
      doc.setFillColor(240, 246, 255)
      doc.rect(margem, y - 1, largura, 8, 'F')
    }
    doc.text(String(p.numero), margem + 3, y + 5)
    doc.text(formatarData(p.vencimento), margem + 20, y + 5)
    doc.text(formatarMoeda(p.valor), margem + 75, y + 5)

    if (p.pago) {
      doc.setTextColor(22, 163, 74)
      doc.text('PAGO', margem + 120, y + 5)
      doc.setTextColor(0, 0, 0)
    } else {
      doc.text('Em aberto', margem + 120, y + 5)
    }

    // Linha para assinatura
    doc.setDrawColor(180, 180, 180)
    doc.line(margem + 152, y + 6, margem + largura - 2, y + 6)
  })

  // Rodapé
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  const contato = loja.telefone ? `${loja.nome_loja || 'Vendedor'} — ${loja.telefone}` : (loja.nome_loja || 'Vendedor')
  doc.text(contato, 105, 285, { align: 'center' })
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 290, { align: 'center' })

  const nomeArquivo = `carne-${cliente.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`
  doc.save(nomeArquivo)
}

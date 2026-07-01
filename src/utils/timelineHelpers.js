import { formatarMoeda } from './formatadores.js'

export function gerarEventosTimeline(vendas) {
  const eventos = []

  vendas.forEach(venda => {
    // Evento: compra
    eventos.push({
      id: `venda_${venda.id}`,
      tipo: 'compra',
      data: venda.criadaEm,
      valor: venda.valorTotal,
      descricao: `Compra: ${venda.parcelas.length} parcela${venda.parcelas.length !== 1 ? 's' : ''}, total ${formatarMoeda(venda.valorTotal)}`,
      vendaId: venda.id,
      numeroParc: null,
      venda
    })

    // Eventos de parcelas
    venda.parcelas.forEach(parcela => {
      const totalParcelas = venda.parcelas.length

      // Evento: vencimento
      if (parcela.vencimento) {
        eventos.push({
          id: `parcela_${venda.id}_${parcela.numero}_vencimento`,
          tipo: 'vencimento',
          data: parcela.vencimento,
          valor: parcela.valor,
          descricao: `Parcela ${parcela.numero}/${totalParcelas} vence: ${formatarMoeda(parcela.valor)}`,
          vendaId: venda.id,
          numeroParc: parcela.numero,
          venda
        })
      }

      // Evento: pagamento
      if (parcela.pagoEm) {
        eventos.push({
          id: `parcela_${venda.id}_${parcela.numero}_pagamento`,
          tipo: 'pagamento',
          data: parcela.pagoEm,
          valor: parcela.valor,
          descricao: `Parcela ${parcela.numero}/${totalParcelas} recebida: ${formatarMoeda(parcela.valor)}`,
          vendaId: venda.id,
          numeroParc: parcela.numero,
          venda
        })
      }

      // Evento: cobrança
      if (parcela.ultimaCobrancaEm) {
        eventos.push({
          id: `parcela_${venda.id}_${parcela.numero}_cobranca`,
          tipo: 'cobranca',
          data: parcela.ultimaCobrancaEm,
          valor: parcela.valor,
          descricao: `Tentativa de cobrança: Parcela ${parcela.numero}/${totalParcelas}`,
          vendaId: venda.id,
          numeroParc: parcela.numero,
          venda
        })
      }
    })
  })

  return eventos
}

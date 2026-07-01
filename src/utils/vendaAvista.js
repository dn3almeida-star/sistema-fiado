export function criarParcelaAvista(valorTotal, dataVenda) {
  return {
    numero: 1,
    valor: valorTotal,
    vencimento: dataVenda,
    pago: true,
    pagoEm: new Date().toISOString(),
  }
}

export function ehVendaAvista(venda) {
  if (venda.parcelas.length !== 1) return false
  if (venda.entrada !== 0) return false
  const parcela = venda.parcelas[0]
  if (!parcela.pago) return false
  return parcela.vencimento === venda.criadaEm.slice(0, 10)
}

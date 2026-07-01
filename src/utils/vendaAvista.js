export function criarParcelaAvista(valorTotal, dataVenda) {
  return {
    numero: 1,
    valor: valorTotal,
    vencimento: dataVenda,
    pago: true,
    pagoEm: new Date().toISOString(),
  }
}

function dataLocal(isoString) {
  const d = new Date(isoString)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function ehVendaAvista(venda) {
  if (!Array.isArray(venda?.parcelas) || venda.parcelas.length !== 1) return false
  if (venda.entrada !== 0) return false
  const parcela = venda.parcelas[0]
  if (!parcela?.pago) return false
  if (!venda.criadaEm) return false
  return parcela.vencimento === dataLocal(venda.criadaEm)
}

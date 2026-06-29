/**
 * Calcula as parcelas de uma venda.
 * A última parcela absorve o centavo de arredondamento.
 */
export function calcularParcelas(valorTotal, entrada, numParcelas, dataPrimeira) {
  const saldo = valorTotal - entrada
  if (saldo <= 0 || numParcelas < 1) return []

  const valorBase = Math.floor((saldo / numParcelas) * 100) / 100
  const soma = valorBase * (numParcelas - 1)
  const ultimoValor = Math.round((saldo - soma) * 100) / 100

  const [ano, mes, dia] = dataPrimeira.split('-').map(Number)

  return Array.from({ length: numParcelas }, (_, i) => {
    const vencimento = new Date(ano, mes - 1 + i, dia)
    return {
      numero: i + 1,
      vencimento: vencimento.toISOString().slice(0, 10),
      valor: i === numParcelas - 1 ? ultimoValor : valorBase,
      pago: false,
      pagoEm: null,
    }
  })
}
